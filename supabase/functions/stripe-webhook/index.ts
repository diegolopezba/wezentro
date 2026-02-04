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
  "prod_Toxvk2koMWuN0w": "places_premium",
};

// Business/Places plans that qualify for referral rewards
const BUSINESS_PLANS = ["business_premium", "places_premium"];

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

          const subscriptionItem = subscription.items.data[0];
          const productId = subscriptionItem.price.product as string;
          const planType = PRODUCT_TO_PLAN[productId] || "user_premium";
          
          // Get period dates from subscription item (new API structure)
          const periodStart = subscriptionItem.current_period_start;
          const periodEnd = subscriptionItem.current_period_end;

          const { error: upsertError } = await supabaseClient
            .from("subscriptions")
            .upsert({
              user_id: user.id,
              plan_type: planType,
              status: subscription.status,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
              current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            }, { onConflict: "user_id" });

          if (upsertError) {
            logStep("Error upserting subscription", { error: upsertError.message });
          } else {
            logStep("Subscription created/updated in database", { userId: user.id, planType });
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice paid", { 
          invoiceId: invoice.id,
          billingReason: invoice.billing_reason,
          subscriptionId: invoice.subscription
        });

        // Only process subscription invoices (not one-time payments)
        if (!invoice.subscription) {
          logStep("Not a subscription invoice, skipping referral check");
          break;
        }

        // Get the subscription to check the plan type
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const subscriptionItem = subscription.items.data[0];
        const productId = subscriptionItem.price.product as string;
        const planType = PRODUCT_TO_PLAN[productId] || "user_premium";

        logStep("Checking if eligible for referral reward", { planType, billingReason: invoice.billing_reason });

        // Only business/places plans qualify for referral rewards
        if (!BUSINESS_PLANS.includes(planType)) {
          logStep("Not a business/places plan, skipping referral reward");
          break;
        }

        // Check if this is a real payment (not trial, not $0)
        // billing_reason: subscription_create (first invoice), subscription_cycle (renewal)
        // We want the first PAID invoice after trial
        const isPaidInvoice = (invoice.amount_paid || 0) > 0;
        
        if (!isPaidInvoice) {
          logStep("Invoice amount is 0, likely trial period - skipping referral reward");
          break;
        }

        // Get customer email
        const customerId = invoice.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer.deleted) {
          logStep("Customer was deleted, skipping");
          break;
        }

        // Find user by email
        const { data: users } = await supabaseClient.auth.admin.listUsers();
        const user = users?.users.find(u => u.email === customer.email);
        
        if (!user) {
          logStep("User not found for email", { email: customer.email });
          break;
        }

        // Check if this user was referred and payment hasn't been processed yet
        const { data: referral, error: referralError } = await supabaseClient
          .from("referrals")
          .select("id, referrer_id, payment_completed")
          .eq("referred_user_id", user.id)
          .maybeSingle();

        if (referralError) {
          logStep("Error checking referral", { error: referralError.message });
          break;
        }

        if (!referral) {
          logStep("User was not referred, no reward to give");
          break;
        }

        if (referral.payment_completed) {
          logStep("Referral payment already processed, skipping");
          break;
        }

        logStep("Processing referral reward for first payment", { 
          referralId: referral.id, 
          referrerId: referral.referrer_id,
          userId: user.id 
        });

        // Mark referral as payment completed and update plan type
        const { error: updateRefError } = await supabaseClient
          .from("referrals")
          .update({ 
            payment_completed: true,
            referred_plan_type: planType
          })
          .eq("id", referral.id);

        if (updateRefError) {
          logStep("Error updating referral", { error: updateRefError.message });
          break;
        }

        // Check if referrer also has a business/places subscription
        const { data: referrerSub } = await supabaseClient
          .from("subscriptions")
          .select("plan_type")
          .eq("user_id", referral.referrer_id)
          .in("status", ["active", "trialing"])
          .maybeSingle();

        if (!referrerSub || !BUSINESS_PLANS.includes(referrerSub.plan_type)) {
          logStep("Referrer doesn't have business/places subscription, no reward", { 
            referrerId: referral.referrer_id,
            referrerPlan: referrerSub?.plan_type 
          });
          break;
        }

        // Check if referrer has already reached the 5 reward cap
        const { count: totalRewardsCount } = await supabaseClient
          .from("referral_rewards")
          .select("id", { count: "exact", head: true })
          .eq("user_id", referral.referrer_id);

        if ((totalRewardsCount || 0) >= 5) {
          logStep("Referrer has reached max 5 rewards cap, no additional reward", { 
            referrerId: referral.referrer_id,
            totalRewards: totalRewardsCount 
          });
          break;
        }

        // Create reward for the referrer
        const { error: rewardError } = await supabaseClient
          .from("referral_rewards")
          .insert({
            user_id: referral.referrer_id,
            reward_type: "free_month",
            referral_id: referral.id
          });

        if (rewardError) {
          logStep("Error creating referral reward", { error: rewardError.message });
          break;
        }

        logStep("Referral reward created successfully", { referrerId: referral.referrer_id });

        // Send notification to referrer
        const { data: referredProfile } = await supabaseClient
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        await supabaseClient
          .from("notifications")
          .insert({
            user_id: referral.referrer_id,
            type: "referral_reward_earned",
            title: "¡Ganaste un mes gratis!",
            body: `@${referredProfile?.username || "Un usuario"} pagó su primera suscripción. ¡Reclama tu mes gratis!`,
            entity_type: "reward",
            entity_id: referral.referrer_id
          });

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

        const subscriptionItem = subscription.items.data[0];
        const productId = subscriptionItem.price.product as string;
        const planType = PRODUCT_TO_PLAN[productId] || "user_premium";
        
        // Get period dates from subscription item (new API structure)
        const periodStart = subscriptionItem.current_period_start;
        const periodEnd = subscriptionItem.current_period_end;

        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .upsert({
            user_id: user.id,
            plan_type: planType,
            status: subscription.status,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
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
