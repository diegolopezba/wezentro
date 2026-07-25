import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, qhantuyCheckoutFetch } from "../_shared/qhantuy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[qr] missing Authorization header");
      return json({ error: "Inicia sesión de nuevo para continuar", code: "no_auth_header" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      console.error("[qr] getUser failed:", userErr?.message);
      return json({ error: "Tu sesión expiró. Inicia sesión de nuevo.", code: "session_expired" }, 401);
    }
    const buyerId = userData.user.id;

    const { eventId, ticketTierId, promoterId } = await req.json();
    console.log("[qr] request", { eventId, ticketTierId, promoterId, buyerId });
    if (!eventId) return json({ error: "Falta el evento", code: "no_event_id" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load event
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, title, price, creator_id")
      .eq("id", eventId)
      .single();
    if (eventErr || !event) {
      console.error("[qr] event not found", eventId, eventErr?.message);
      return json({ error: "No encontramos este evento", code: "event_not_found" }, 404);
    }

    // Resolve tier / price
    let effectivePrice = Number(event.price ?? 0);
    let effectiveTitle = event.title || "Ticket";
    let tierId: string | null = null;

    if (ticketTierId) {
      const { data: t, error: tErr } = await supabase
        .from("ticket_tiers")
        .select("id, name, price, capacity, sold_count, event_id, is_active")
        .eq("id", ticketTierId)
        .single();
      if (tErr || !t || t.event_id !== eventId || !t.is_active) {
        console.error("[qr] tier not found/inactive", { ticketTierId, eventId, err: tErr?.message });
        return json({ error: "Esta entrada ya no está disponible", code: "tier_not_found" }, 404);
      }
      if (t.capacity != null && t.sold_count >= t.capacity) {
        console.error("[qr] tier sold out", ticketTierId);
        return json({ error: "Entradas agotadas", code: "tier_sold_out" }, 409);
      }
      tierId = t.id;
      effectivePrice = Number(t.price);
      effectiveTitle = `${event.title || "Ticket"} — ${t.name}`;
    }

    if (!effectivePrice || effectivePrice <= 0) {
      console.error("[qr] event has no price", { eventId, tierId, effectivePrice });
      return json({ error: "Este evento no tiene un precio configurado", code: "no_price" }, 400);
    }

    // Load beneficiary for the event creator
    const { data: benef } = await supabase
      .from("qhantuy_beneficiaries")
      .select("beneficiary_code, is_active")
      .eq("user_id", event.creator_id)
      .maybeSingle();
    if (!benef || !benef.is_active) {
      console.error("[qr] beneficiary missing/inactive", { creator: event.creator_id, benef });
      return json({ error: "El organizador aún no configuró sus pagos", code: "no_beneficiary" }, 400);
    }

    // Validate promoter attribution — a bad referral must never block the sale.
    let safePromoterId: string | null = null;
    if (promoterId) {
      const { data: promo } = await supabase
        .from("event_promoters")
        .select("id, event_id")
        .eq("id", promoterId)
        .maybeSingle();
      if (promo && promo.event_id === eventId) {
        safePromoterId = promo.id;
      } else {
        console.warn("[qr] dropping invalid promoter attribution", { promoterId, eventId });
      }
    }

    // Load buyer profile for customer fields
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", buyerId)
      .maybeSingle();


    // Create the session first so its id acts as the Qhantuy internal_code.
    const { data: session, error: sessErr } = await supabase
      .from("payment_sessions")
      .insert({
        event_id: eventId,
        buyer_user_id: buyerId,
        business_user_id: event.creator_id,
        amount: effectivePrice,
        status: "pending",
        ticket_tier_id: tierId,
        promoter_id: safePromoterId,
        provider: "qhantuy",
        beneficiary_code: benef.beneficiary_code,
      })
      .select("id")
      .single();
    if (sessErr || !session) {
      console.error("[qr] session insert failed:", sessErr?.message, sessErr);
      return json({ error: "No se pudo iniciar el pago", code: "session_insert_failed" }, 500);
    }

    // Callback URL
    const projectRef = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
    const callbackUrl = `https://${projectRef}.supabase.co/functions/v1/qhantuy-callback`;

    // Fire Qhantuy checkout
    const checkoutRes = await qhantuyCheckoutFetch("/v2/checkout", {
      method: "POST",
      body: JSON.stringify({
        payment_method: "QRSIMPLE",
        image_method: "URL",
        currency_code: "BOB",
        internal_code: session.id,
        callback_url: callbackUrl,
        customer_email: buyerProfile?.email ?? userData.user.email ?? undefined,
        customer_first_name: buyerProfile?.first_name ?? undefined,
        customer_last_name: buyerProfile?.last_name ?? undefined,
        detail: effectiveTitle.substring(0, 120),
        items: [
          {
            name: effectiveTitle.substring(0, 100),
            quantity: 1,
            price: effectivePrice,
          },
        ],
      }),
    });

    if (!checkoutRes.ok) {
      console.error("qhantuy checkout failed:", checkoutRes.status, checkoutRes.raw);
      // Best-effort cleanup: mark session failed
      await supabase.from("payment_sessions")
        .update({ status: "failed" })
        .eq("id", session.id);
      return json({ error: "No se pudo generar el QR", detail: checkoutRes.data }, 502);
    }

    if (checkoutRes.data?.process === false) {
      console.error("qhantuy checkout rejected:", checkoutRes.raw);
      await supabase.from("payment_sessions").update({ status: "failed" }).eq("id", session.id);
      return json({ error: checkoutRes.data?.message || "No se pudo generar el QR" }, 400);
    }

    const d = checkoutRes.data ?? {};
    const transactionId = d.transaction_id ?? d.transactionId ?? d.data?.transaction_id;
    const imageData = d.qr_url ?? d.image_data ?? d.imageData ?? d.data?.qr_url ?? d.data?.image_data ?? d.qr ?? d.image;

    if (!transactionId || !imageData) {
      console.error("checkout response missing fields:", checkoutRes.raw);
      await supabase.from("payment_sessions").update({ status: "failed" }).eq("id", session.id);
      return json({ error: "Respuesta inválida de Qhantuy" }, 502);
    }

    await supabase
      .from("payment_sessions")
      .update({ qhantuy_transaction_id: Number(transactionId) })
      .eq("id", session.id);

    return json({
      paymentSessionId: session.id,
      qrImageUrl: String(imageData),
      amount: effectivePrice,
      eventTitle: effectiveTitle,
      ticketTierId: tierId,
    });
  } catch (err) {
    console.error("generate-qhantuy-qr error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
