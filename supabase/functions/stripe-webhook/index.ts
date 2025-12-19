import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Map Stripe product IDs to plan types
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_Td3jVaQwDP8Fdz": "user_premium",
  "prod_Td3kU1JBlekyrO": "business_premium",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No Stripe signature found");

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    
    logStep("Event verified", { type: event.type, id: event.id });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          subscriptionId: session.subscription 
        });

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const customerId = session.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if (customer.deleted) {
            logStep("Customer was deleted, skipping");
            break;
          }

          // Find user by email
          const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
          if (userError) {
            logStep("Error listing users", { error: userError.message });
            break;
          }

          const user = users.users.find(u => u.email === customer.email);
          if (!user) {
            logStep("User not found for email", { email: customer.email });
            break;
          }

          const productId = subscription.items.data[0].price.product as string;
          const planType = PRODUCT_TO_PLAN[productId] || "user_premium";

          const { error: upsertError } = await supabaseClient
            .from("subscriptions")
            .upsert({
              user_id: user.id,
              plan_type: planType,
              status: subscription.status,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            }, { onConflict: "user_id" });

          if (upsertError) {
            logStep("Error upserting subscription", { error: upsertError.message });
          } else {
            logStep("Subscription created/updated in database", { userId: user.id, planType });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });

        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer.deleted) {
          logStep("Customer was deleted, skipping");
          break;
        }

        const { data: users } = await supabaseClient.auth.admin.listUsers();
        const user = users?.users.find(u => u.email === customer.email);
        
        if (!user) {
          logStep("User not found for email", { email: customer.email });
          break;
        }

        const productId = subscription.items.data[0].price.product as string;
        const planType = PRODUCT_TO_PLAN[productId] || "user_premium";

        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .upsert({
            user_id: user.id,
            plan_type: planType,
            status: subscription.status,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }, { onConflict: "user_id" });

        if (updateError) {
          logStep("Error updating subscription", { error: updateError.message });
        } else {
          logStep("Subscription updated in database", { userId: user.id });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer.deleted) {
          logStep("Customer was deleted, skipping");
          break;
        }

        const { data: users } = await supabaseClient.auth.admin.listUsers();
        const user = users?.users.find(u => u.email === customer.email);
        
        if (!user) {
          logStep("User not found for email", { email: customer.email });
          break;
        }

        const { error: deleteError } = await supabaseClient
          .from("subscriptions")
          .delete()
          .eq("user_id", user.id);

        if (deleteError) {
          logStep("Error deleting subscription", { error: deleteError.message });
        } else {
          logStep("Subscription deleted from database", { userId: user.id });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
