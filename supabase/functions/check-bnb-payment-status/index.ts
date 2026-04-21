import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BNB_SANDBOX_BASE = "https://qrsimpleapiv2.azurewebsites.net/api/v1";
const BNB_PROD_BASE = "https://qrsimple.bnb.com.bo/api/v1";
const BNB_BASE = Deno.env.get("BNB_ENV") === "production" ? BNB_PROD_BASE : BNB_SANDBOX_BASE;

// BNB QR status codes
// 1 = No Usado, 2 = Usado (PAID), 3 = Expirado, 4 = Con error
const BNB_STATUS_PAID = 2;
const BNB_STATUS_EXPIRED = 3;
const BNB_STATUS_ERROR = 4;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { paymentSessionId } = await req.json();
    if (!paymentSessionId) {
      return new Response(JSON.stringify({ error: "paymentSessionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment session
    const { data: session, error: sessionError } = await supabase
      .from("payment_sessions")
      .select("id, event_id, buyer_user_id, business_user_id, bnb_qr_id, amount, status, ticket_tier_id")
      .eq("id", paymentSessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Payment session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the buyer can poll their own session
    if (session.buyer_user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already confirmed — return immediately
    if (session.status === "confirmed") {
      return new Response(
        JSON.stringify({ status: "confirmed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.status === "expired" || session.status === "failed") {
      return new Response(
        JSON.stringify({ status: session.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!session.bnb_qr_id) {
      // No BNB QR — static mode, can't auto-poll
      return new Response(
        JSON.stringify({ status: "static" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch BNB credentials for the business
    const { data: paymentSettings, error: settingsError } = await supabase
      .from("business_payment_settings")
      .select("bnb_account_id, bnb_authorization_id")
      .eq("user_id", session.business_user_id)
      .eq("is_active", true)
      .single();

    if (settingsError || !paymentSettings) {
      return new Response(JSON.stringify({ error: "Business credentials not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate with BNB
    const authRes = await fetch(`${BNB_BASE}/ClientAuthentication.API/api/v1/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: paymentSettings.bnb_account_id,
        authorizationId: paymentSettings.bnb_authorization_id,
      }),
    });

    if (!authRes.ok) {
      await authRes.text();
      return new Response(JSON.stringify({ error: "BNB auth failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authData = await authRes.json();
    const bnbToken = authData.token || authData.access_token || authData.Token;

    if (!bnbToken) {
      return new Response(JSON.stringify({ error: "BNB token not received" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check QR status
    const statusRes = await fetch(`${BNB_BASE}/main/getQRStatusAsync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bnbToken}`,
      },
      body: JSON.stringify({ qrId: session.bnb_qr_id }),
    });

    if (!statusRes.ok) {
      await statusRes.text();
      return new Response(JSON.stringify({ status: "pending" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusData = await statusRes.json();
    // BNB returns: { statusId: 1|2|3|4, statusDescription: string }
    const bnbStatus = statusData.statusId || statusData.StatusId || statusData.status;

    if (bnbStatus === BNB_STATUS_PAID) {
      // ✅ Payment confirmed! Auto-approve guestlist entry
      const now = new Date().toISOString();

      // Update payment session
      await supabase
        .from("payment_sessions")
        .update({ status: "confirmed", confirmed_at: now })
        .eq("id", paymentSessionId);

      // Atomically increment tier sold_count if a tier was selected
      if (session.ticket_tier_id) {
        const { data: incOk, error: incErr } = await supabase.rpc("increment_tier_sold", {
          _tier_id: session.ticket_tier_id,
        });
        if (incErr) {
          console.error("Failed to increment tier sold_count:", incErr);
        } else if (incOk === false) {
          console.warn("Tier was sold out at confirmation time:", session.ticket_tier_id);
        }
      }

      // Upsert guestlist entry as approved with payment confirmed
      const { error: guestlistError } = await supabase
        .from("guestlist_entries")
        .upsert(
          {
            event_id: session.event_id,
            user_id: session.buyer_user_id,
            status: "approved",
            payment_status: "confirmed",
            payment_confirmed_at: now,
            ticket_tier_id: session.ticket_tier_id ?? null,
          },
          { onConflict: "event_id,user_id" }
        );

      if (guestlistError) {
        console.error("Failed to upsert guestlist entry:", guestlistError);
      }

      // Create in-app notification for buyer
      await supabase.from("notifications").insert({
        user_id: session.buyer_user_id,
        type: "payment_confirmed",
        title: "¡Pago Confirmado!",
        body: "Tu entrada fue confirmada automáticamente. ¡Ya estás en la lista!",
        entity_type: "event",
        entity_id: session.event_id,
      });

      return new Response(
        JSON.stringify({ status: "confirmed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (bnbStatus === BNB_STATUS_EXPIRED || bnbStatus === BNB_STATUS_ERROR) {
      await supabase
        .from("payment_sessions")
        .update({ status: bnbStatus === BNB_STATUS_EXPIRED ? "expired" : "failed" })
        .eq("id", paymentSessionId);

      return new Response(
        JSON.stringify({ status: bnbStatus === BNB_STATUS_EXPIRED ? "expired" : "failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Status 1 = still pending
    return new Response(
      JSON.stringify({ status: "pending" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error in check-bnb-payment-status:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
