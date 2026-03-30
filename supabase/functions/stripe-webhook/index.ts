import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
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
          mode: session.mode,
        });

        // ── One-time ad campaign payment ──
        if (session.mode === "payment" && session.payment_status === "paid" && session.metadata?.sponsored_post_id) {
          const sponsoredPostId = session.metadata.sponsored_post_id;
          const userId = session.metadata.user_id;
          const customerId = typeof session.customer === "string" ? session.customer : null;

          logStep("Ad campaign payment completed", { sponsoredPostId, userId, customerId });

          // Activate the campaign
          const { error: activateError } = await supabaseClient
            .from("sponsored_posts")
            .update({
              status: "active",
              start_date: new Date().toISOString(),
              ad_payment_session_id: session.id,
            })
            .eq("id", sponsoredPostId)
            .eq("business_user_id", userId)
            .in("status", ["draft", "paused"]);

          if (activateError) {
            logStep("Error activating campaign", { error: activateError.message });
          } else {
            logStep("Campaign activated via webhook", { sponsoredPostId });
          }

          // Persist stripe_customer_id so future charges skip checkout
          if (customerId && userId) {
            const { error: profileError } = await supabaseClient
              .from("profiles")
              .update({ stripe_customer_id: customerId })
              .eq("id", userId);
            if (profileError) {
              logStep("Error saving stripe_customer_id", { error: profileError.message });
            } else {
              logStep("Saved stripe_customer_id to profile", { customerId, userId });
            }
          }
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
