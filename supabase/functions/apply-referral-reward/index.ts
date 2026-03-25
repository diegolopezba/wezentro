import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    // Check if user has unclaimed rewards
    const { data: rewards, error: rewardError } = await supabaseClient
      .from("referral_rewards")
      .select("*")
      .eq("user_id", user.id)
      .is("redeemed_at", null)
      .limit(1);

    if (rewardError) {
      logStep("Error fetching rewards", { error: rewardError.message });
      throw rewardError;
    }

    if (!rewards || rewards.length === 0) {
      logStep("No unclaimed rewards found", { userId: user.id });
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No tienes recompensas disponibles para reclamar" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const reward = rewards[0];
    logStep("Found unclaimed reward", { rewardId: reward.id });

    // Mark reward as redeemed
    await supabaseClient
      .from("referral_rewards")
      .update({
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", reward.id);

    logStep("Reward marked as redeemed", { rewardId: reward.id });

    // Check remaining rewards
    const { count: remainingCount } = await supabaseClient
      .from("referral_rewards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("redeemed_at", null);

    // Send notification
    await supabaseClient
      .from("notifications")
      .insert({
        user_id: user.id,
        type: "referral_reward_redeemed",
        title: "¡Recompensa reclamada!",
        body: "Tu recompensa de referido ha sido aplicada." + 
          ((remainingCount || 0) > 0 ? ` Tienes ${remainingCount} más disponible(s).` : ""),
        entity_type: "reward",
        entity_id: user.id
      });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "¡Tu recompensa ha sido reclamada!" 
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
