import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BNB_SANDBOX_BASE = "https://qrsimpleapiv2.azurewebsites.net/api/v1";
const BNB_PROD_BASE = "https://qrsimple.bnb.com.bo/api/v1";

// Use sandbox by default; set BNB_ENV=production in secrets to switch
const BNB_BASE = Deno.env.get("BNB_ENV") === "production" ? BNB_PROD_BASE : BNB_SANDBOX_BASE;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
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

    // Get buyer user from JWT
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

    const { eventId, ticketTierId } = await req.json();
    if (!eventId) {
      return new Response(JSON.stringify({ error: "eventId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, price, creator_id, payment_qr_url")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve effective price + tier (if any)
    let tier: { id: string; name: string; price: number; capacity: number | null; sold_count: number } | null = null;
    let effectivePrice: number = Number(event.price ?? 0);
    let effectiveTitle: string = event.title || "Ticket";

    if (ticketTierId) {
      const { data: t, error: tErr } = await supabase
        .from("ticket_tiers")
        .select("id, name, price, capacity, sold_count, event_id, is_active")
        .eq("id", ticketTierId)
        .single();
      if (tErr || !t || t.event_id !== eventId || !t.is_active) {
        return new Response(JSON.stringify({ error: "Ticket tier not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (t.capacity != null && t.sold_count >= t.capacity) {
        return new Response(JSON.stringify({ error: "Tier sold out" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      tier = t as any;
      effectivePrice = Number(t.price);
      effectiveTitle = `${event.title || "Ticket"} — ${t.name}`;
    }

    if (!effectivePrice || effectivePrice <= 0) {
      return new Response(JSON.stringify({ error: "Event has no price" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch BNB credentials for this business
    const { data: paymentSettings, error: settingsError } = await supabase
      .from("business_payment_settings")
      .select("bnb_account_id, bnb_authorization_id")
      .eq("user_id", event.creator_id)
      .eq("is_active", true)
      .single();

    if (settingsError || !paymentSettings) {
      // No BNB credentials — fall back to static QR
      if (event.payment_qr_url) {
        return new Response(
          JSON.stringify({
            mode: "static",
            paymentQrUrl: event.payment_qr_url,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: "No payment method configured for this event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Authenticate with BNB → get JWT
    const authRes = await fetch(`${BNB_BASE}/ClientAuthentication.API/api/v1/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: paymentSettings.bnb_account_id,
        authorizationId: paymentSettings.bnb_authorization_id,
      }),
    });

    if (!authRes.ok) {
      const authText = await authRes.text();
      console.error("BNB auth failed:", authText);
      return new Response(JSON.stringify({ error: "BNB authentication failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authData = await authRes.json();
    const bnbToken = authData.token || authData.access_token || authData.Token;

    if (!bnbToken) {
      console.error("BNB token missing from response:", JSON.stringify(authData));
      return new Response(JSON.stringify({ error: "BNB token not received" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Generate the QR
    const expirationDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // +2 hours
    const qrRes = await fetch(`${BNB_BASE}/main/getQRWithImageAsync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bnbToken}`,
      },
      body: JSON.stringify({
        currency: "BOB",
        gloss: effectiveTitle.substring(0, 50),
        amount: effectivePrice,
        singleUse: true,
        expirationDate,
      }),
    });

    if (!qrRes.ok) {
      const qrText = await qrRes.text();
      console.error("BNB QR generation failed:", qrText);
      return new Response(JSON.stringify({ error: "QR generation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qrData = await qrRes.json();
    // BNB returns: { qrId, qrImage (byte array / base64), ... }
    const qrId = qrData.qrId || qrData.QrId || qrData.id;
    const qrImageBase64 = qrData.qrImage || qrData.QrImage || qrData.image;

    if (!qrId) {
      console.error("BNB QR response missing qrId:", JSON.stringify(qrData));
      return new Response(JSON.stringify({ error: "QR id not received from BNB" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Store payment session
    const { data: session, error: sessionError } = await supabase
      .from("payment_sessions")
      .insert({
        event_id: eventId,
        buyer_user_id: user.id,
        business_user_id: event.creator_id,
        bnb_qr_id: qrId,
        amount: effectivePrice,
        status: "pending",
        ticket_tier_id: tier?.id ?? null,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("Failed to create payment session:", sessionError);
      return new Response(JSON.stringify({ error: "Failed to create payment session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        mode: "bnb",
        paymentSessionId: session.id,
        qrImageBase64,
        amount: effectivePrice,
        eventTitle: effectiveTitle,
        ticketTierId: tier?.id ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error in generate-bnb-qr:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
