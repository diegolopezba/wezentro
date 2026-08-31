import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/qhantuy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { paymentSessionId } = await req.json();
    if (!paymentSessionId) return json({ error: "paymentSessionId required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: session, error } = await supabase
      .from("payment_sessions")
      .select("id, buyer_user_id, status, experience_booking_id, subscription_business_id, subscription_tier")
      .eq("id", paymentSessionId)
      .maybeSingle();
    if (error || !session) return json({ error: "Not found" }, 404);
    if (session.buyer_user_id !== userId) return json({ error: "Forbidden" }, 403);

    return json({
      status: session.status,
      experienceBookingId: session.experience_booking_id,
      subscriptionTier: (session as any).subscription_tier ?? null,
      isSubscription: !!(session as any).subscription_business_id,
    });
  } catch (err) {
    console.error("check-qhantuy-payment-status error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
