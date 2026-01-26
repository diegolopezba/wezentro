import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-REFERRAL] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { referral_code } = await req.json();
    if (!referral_code) {
      logStep("No referral code provided");
      return new Response(JSON.stringify({ success: true, message: "No referral code to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Processing referral code", { referral_code });

    // Find the referrer by their referral code
    const { data: referrer, error: referrerError } = await supabaseClient
      .from("profiles")
      .select("id, username")
      .eq("referral_code", referral_code)
      .single();

    if (referrerError || !referrer) {
      logStep("Invalid referral code", { referral_code });
      return new Response(JSON.stringify({ success: false, message: "Invalid referral code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Prevent self-referral
    if (referrer.id === user.id) {
      logStep("Self-referral attempted", { userId: user.id });
      return new Response(JSON.stringify({ success: false, message: "Cannot refer yourself" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if this user was already referred
    const { data: existingReferral } = await supabaseClient
      .from("referrals")
      .select("id")
      .eq("referred_user_id", user.id)
      .single();

    if (existingReferral) {
      logStep("User already referred", { userId: user.id });
      return new Response(JSON.stringify({ success: false, message: "User already has a referral" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create the referral record
    const { error: insertError } = await supabaseClient
      .from("referrals")
      .insert({
        referrer_id: referrer.id,
        referred_user_id: user.id,
        referral_code: referral_code,
        status: "completed"
      });

    if (insertError) {
      logStep("Error creating referral", { error: insertError.message });
      throw new Error(`Failed to create referral: ${insertError.message}`);
    }

    logStep("Referral created successfully", { referrerId: referrer.id, referredUserId: user.id });

    // Check if referrer now has 5+ referrals and hasn't claimed reward yet
    const { count: referralCount } = await supabaseClient
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", referrer.id);

    const { data: existingReward } = await supabaseClient
      .from("referral_rewards")
      .select("id")
      .eq("user_id", referrer.id)
      .single();

    if ((referralCount ?? 0) >= 5 && !existingReward) {
      logStep("Referrer eligible for reward", { referrerId: referrer.id, count: referralCount });
      
      // Create reward entry (not yet redeemed)
      await supabaseClient
        .from("referral_rewards")
        .insert({
          user_id: referrer.id,
          reward_type: "free_month"
        });

      // Send notification about earned reward
      await supabaseClient
        .from("notifications")
        .insert({
          user_id: referrer.id,
          type: "referral_reward_earned",
          title: "¡Has ganado un mes gratis!",
          body: "Has referido a 5 amigos. ¡Reclama tu mes gratis de Zentro Premium!",
          entity_type: "reward",
          entity_id: referrer.id
        });
    }

    return new Response(JSON.stringify({ success: true, message: "Referral processed successfully" }), {
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
