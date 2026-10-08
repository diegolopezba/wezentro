import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { buildCharge, loadFeeTerms, checkoutMethodFields, corsHeaders, gatewayFeeBps, json, organizerPayouts, parseCheckoutResponse, qhantuyCheckoutFetch } from "../_shared/qhantuy.ts";

const uuid = z.string().uuid();
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("catalog"), eventId: uuid }),
  z.object({ action: z.literal("create"), eventId: uuid, offerId: uuid, quantity: z.number().int().min(1).max(10) }),
  z.object({ action: z.literal("status"), eventId: uuid, sessionId: uuid, accessToken: uuid }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  try {
    const parsed = input.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Datos inválidos" }, 400);
    const body = parsed.data;
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Servicio no disponible" }, 503);
    const db = createClient(url, key);
    const { data: event } = await db.from("events").select("id, title, image_url, start_datetime, end_datetime, creator_id, is_post, deleted_at").eq("id", body.eventId).maybeSingle();
    if (!event || event.is_post || event.deleted_at) return json({ error: "Evento no disponible" }, 404);

    if (body.action === "status") {
      const { data: session } = await db.from("payment_sessions")
        .select("id, status, amount, quantity, gate_offer_id, gate_offer_name, is_gate_sale")
        .eq("id", body.sessionId).eq("event_id", body.eventId)
        .eq("gate_access_token", body.accessToken).eq("is_gate_sale", true).maybeSingle();
      if (!session) return json({ error: "Compra no encontrada" }, 404);
      if (session.status === "pending") {
        // Recover if Qhantuy's callback was delayed: only a verified provider
        // lookup may convert the session, never a client-supplied status.
        // Callback retries remain the authoritative ticket issuer.
        return json({ status: session.status });
      }
      if (session.status !== "confirmed") return json({ status: session.status });
      const { data: tickets, error: ticketsError } = await db.from("guestlist_entries")
        .select("id, qr_code_token, checked_in_at, gate_ticket_index")
        .eq("payment_session_id", session.id).order("gate_ticket_index", { ascending: true });
      if (ticketsError) return json({ error: "No se pudieron cargar las entradas" }, 503);
      let offerName = session.gate_offer_name;
      if (!offerName && session.gate_offer_id) {
        const { data: offer } = await db.from("gate_offers").select("name").eq("id", session.gate_offer_id).maybeSingle();
        offerName = offer?.name;
      }
      return json({ status: session.status, eventTitle: event.title, tickets: (tickets ?? []).map(t => ({ token: t.qr_code_token, used: !!t.checked_in_at, index: t.gate_ticket_index, name: offerName || "Entrada" })) });
    }

    const { data: offers, error: offersErr } = await db.from("gate_offers")
      .select("id, name, price").eq("event_id", body.eventId).eq("is_active", true).order("created_at");
    if (offersErr) return json({ error: "No se pudieron cargar las entradas" }, 503);
    const isOpen = !!event.end_datetime && new Date(event.end_datetime).getTime() > Date.now();
    if (body.action === "catalog") {
      return json({ event: { title: event.title, imageUrl: event.image_url, startAt: event.start_datetime }, offers: isOpen ? offers : [], closed: !isOpen, gatewayFeeBps: gatewayFeeBps(), feeTerms: await loadFeeTerms(db, event.creator_id) });
    }
    if (!isOpen) return json({ error: "La venta en puerta finalizó" }, 409);
    const offer = offers?.find(o => o.id === body.offerId);
    if (!offer) return json({ error: "Esta entrada ya no está disponible" }, 404);
    const base = Number((Number(offer.price) * body.quantity).toFixed(2));
    const feeTerms = await loadFeeTerms(db, event.creator_id);
    const charge = buildCharge(base, feeTerms);
    if (!Number.isFinite(base) || base <= 0 || base > 1000000 || charge.payoutAmount <= 0) return json({ error: "Precio inválido" }, 400);
    const { data: beneficiary } = await db.from("qhantuy_beneficiaries")
      .select("beneficiary_code, is_active").eq("user_id", event.creator_id).maybeSingle();
    if (!beneficiary?.is_active) return json({ error: "El organizador no configuró sus pagos" }, 409);

    const accessToken = crypto.randomUUID();
    const callbackToken = crypto.randomUUID();
    const { data: session, error: insertError } = await db.from("payment_sessions").insert({
      event_id: event.id, business_user_id: event.creator_id, buyer_user_id: null,
       is_gate_sale: true, gate_offer_id: offer.id, gate_offer_name: offer.name, gate_access_token: accessToken, gate_callback_token: callbackToken,
      amount: charge.totalAmount, base_amount: charge.baseAmount, gateway_fee_amount: charge.gatewayFee,
      quantity: body.quantity, status: "pending", provider: "qhantuy", payment_method: "qr",
      beneficiary_code: beneficiary.beneficiary_code, platform_fee_bps: charge.bps,
      platform_fee_amount: charge.platformFee, payout_amount: charge.payoutAmount,
    }).select("id").single();
    if (insertError || !session) return json({ error: "No se pudo iniciar el pago" }, 503);

    const callbackUrl = `${url}/functions/v1/qhantuy-callback?gate_token=${callbackToken}`;
    const checkout = await qhantuyCheckoutFetch("/v2/checkout", {
      method: "POST",
      body: JSON.stringify({
        ...checkoutMethodFields("qr"), currency_code: "BOB", internal_code: session.id,
        callback_url: callbackUrl, detail: `${event.title} — ${offer.name} x${body.quantity}`.slice(0, 120),
        items: [{ name: `${event.title} — ${offer.name}`.slice(0, 100), quantity: body.quantity, price: Number(offer.price) },
          ...(charge.gatewayFee > 0 ? [{ name: "Comisión de procesamiento", quantity: 1, price: charge.gatewayFee }] : [])],
        custom_payouts: organizerPayouts(beneficiary.beneficiary_code, charge.payoutAmount),
      }),
    });
    const response = parseCheckoutResponse(checkout.data);
    if (!checkout.ok || checkout.data?.process === false || !response.transactionId || !response.qrImageUrl) {
      await db.from("payment_sessions").update({ status: "failed" }).eq("id", session.id);
      return json({ error: "No se pudo generar el QR bancario. Intentá de nuevo." }, 502);
    }
    const { error: updateError } = await db.from("payment_sessions").update({ qhantuy_transaction_id: response.transactionId }).eq("id", session.id);
    if (updateError) {
      console.error("gate checkout transaction save failed", session.id, updateError);
      return json({ error: "No se pudo confirmar el inicio del pago" }, 503);
    }
    return json({ sessionId: session.id, accessToken, qrImageUrl: response.qrImageUrl,
      amount: charge.totalAmount, baseAmount: base, gatewayFee: charge.gatewayFee });
  } catch (error) {
    console.error("gate-checkout", error);
    return json({ error: "No se pudo completar la solicitud" }, 500);
  }
});
