import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[APPLY-REFERRAL-REWARD] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user has an unclaimed reward
    const { data: reward, error: rewardError } = await supabaseClient
      .from("referral_rewards")
      .select("*")
      .eq("user_id", user.id)
      .is("redeemed_at", null)
      .single();

    if (rewardError || !reward) {
      logStep("No unclaimed reward found", { userId: user.id });
      return new Response(JSON.stringify({ success: false, message: "No reward available to claim" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found unclaimed reward", { rewardId: reward.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found", { email: user.email });
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No tienes una suscripción activa. El cupón se aplicará cuando te suscribas." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found", { customerId });
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No tienes una suscripción activa. El cupón se aplicará cuando te suscribas." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    logStep("Found active subscription", { subscriptionId: subscription.id });

    // Create a 100% off coupon for 1 month
    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: "once",
      name: "Referral Reward - 1 Month Free",
      metadata: {
        user_id: user.id,
        reward_id: reward.id,
      },
    });
    logStep("Created coupon", { couponId: coupon.id });

    // Apply coupon to subscription
    await stripe.subscriptions.update(subscription.id, {
      coupon: coupon.id,
    });
    logStep("Applied coupon to subscription", { subscriptionId: subscription.id });

    // Mark reward as redeemed
    await supabaseClient
      .from("referral_rewards")
      .update({
        redeemed_at: new Date().toISOString(),
        stripe_coupon_id: coupon.id,
      })
      .eq("id", reward.id);

    logStep("Reward marked as redeemed", { rewardId: reward.id });

    // Send notification
    await supabaseClient
      .from("notifications")
      .insert({
        user_id: user.id,
        type: "referral_reward_redeemed",
        title: "¡Mes gratis activado!",
        body: "Tu próximo mes de Zentro Premium es gratis gracias a tus referidos.",
        entity_type: "reward",
        entity_id: user.id
      });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "¡Tu mes gratis ha sido aplicado a tu suscripción!" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
