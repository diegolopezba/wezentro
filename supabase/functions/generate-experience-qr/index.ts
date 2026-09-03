/**
 * Creates a Qhantuy QR checkout for an experience booking.
 * The booking is created beforehand (pending_payment, capacity held) by the
 * create_experience_booking database function.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkoutMethodFields,
  corsHeaders,
  json,
  parseCheckoutMethod,
  parseCheckoutResponse,
  platformPayouts,
  qhantuyCheckoutFetch,
  safeReturnUrl,
  buildCharge,
} from "../_shared/qhantuy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
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
      return json({ error: "Tu sesión expiró. Inicia sesión de nuevo.", code: "session_expired" }, 401);
    }
    const buyerId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : null;
    const method = parseCheckoutMethod(body.method);
    const returnUrl = safeReturnUrl(body.returnUrl);
    if (!bookingId) return json({ error: "Falta la reserva", code: "no_booking_id" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: booking } = await supabase
      .from("experience_bookings")
      .select("id, experience_id, segment_id, user_id, quantity, amount, status, hold_expires_at, booking_date, booking_time")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking || booking.user_id !== buyerId) {
      return json({ error: "No encontramos tu reserva", code: "booking_not_found" }, 404);
    }
    if (booking.status !== "pending_payment") {
      return json({ error: "Esta reserva ya no está pendiente de pago", code: "booking_not_pending" }, 409);
    }
    if (booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() <= Date.now()) {
      return json({ error: "Tu lugar expiró. Elegí el horario de nuevo.", code: "hold_expired" }, 409);
    }

    const { data: experience } = await supabase
      .from("experiences")
      .select("id, title, business_id, is_active")
      .eq("id", booking.experience_id)
      .maybeSingle();
    if (!experience || !experience.is_active) {
      return json({ error: "Esta experiencia ya no está disponible", code: "experience_inactive" }, 404);
    }

    const { data: segment } = await supabase
      .from("experience_segments")
      .select("id, name, price")
      .eq("id", booking.segment_id)
      .maybeSingle();

    const totalAmount = Number(booking.amount);
    if (!totalAmount || totalAmount <= 0) {
      return json({ error: "Esta experiencia no tiene un precio configurado", code: "no_price" }, 400);
    }

    const { data: benef } = await supabase
      .from("qhantuy_beneficiaries")
      .select("beneficiary_code, is_active")
      .eq("user_id", experience.business_id)
      .maybeSingle();
    if (!benef || !benef.is_active) {
      return json({ error: "El organizador aún no configuró sus pagos", code: "no_beneficiary" }, 400);
    }

    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", buyerId)
      .maybeSingle();

    // profiles only stores a single full_name; split it for Qhantuy's customer fields.
    const buyerNameParts = String(buyerProfile?.full_name ?? "").trim().split(/\s+/).filter(Boolean);
    const buyerFirstName = buyerNameParts[0] || undefined;
    const buyerLastName = buyerNameParts.slice(1).join(" ") || undefined;

    const title = `${experience.title}${segment?.name ? ` — ${segment.name}` : ""}`;
    const unitPrice = Number((totalAmount / Math.max(booking.quantity, 1)).toFixed(2));

    // Zentro keeps its commission out of the base price; Qhantuy's commission
    // is added on top (PRE_CHARGE) and paid by the buyer.
    const charge = buildCharge(totalAmount);
    const { bps: feeBps, payoutAmount, platformFee, gatewayFee } = charge;
    const chargedAmount = charge.totalAmount;
    if (payoutAmount <= 0) {
      return json({ error: "El monto es demasiado bajo para procesar el pago", code: "amount_too_low" }, 400);
    }

    const { data: session, error: sessErr } = await supabase
      .from("payment_sessions")
      .insert({
        event_id: null,
        experience_booking_id: booking.id,
        buyer_user_id: buyerId,
        business_user_id: experience.business_id,
        amount: chargedAmount,
        base_amount: totalAmount,
        gateway_fee_amount: gatewayFee,
        status: "pending",
        provider: "qhantuy",
        beneficiary_code: benef.beneficiary_code,
        quantity: booking.quantity,
        platform_fee_bps: feeBps,
        platform_fee_amount: platformFee,
        payout_amount: payoutAmount,
        payment_method: method,
      })

      .select("id")
      .single();
    if (sessErr || !session) {
      console.error("[experience-qr] session insert failed:", sessErr?.message);
      return json({ error: "No se pudo iniciar el pago", code: "session_insert_failed" }, 500);
    }

    await supabase
      .from("experience_bookings")
      .update({ payment_session_id: session.id })
      .eq("id", booking.id);

    const projectRef = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
    const callbackUrl = `https://${projectRef}.supabase.co/functions/v1/qhantuy-callback`;

    const checkoutRes = await qhantuyCheckoutFetch("/v2/checkout", {
      method: "POST",
      body: JSON.stringify({
        ...checkoutMethodFields(method, returnUrl),
        currency_code: "BOB",
        internal_code: session.id,
        callback_url: callbackUrl,
        customer_email: userData.user.email ?? undefined,
        customer_first_name: buyerFirstName,
        customer_last_name: buyerLastName,
        detail: `${title}${booking.quantity > 1 ? ` x${booking.quantity}` : ""}`.substring(0, 120),
        items: [
          { name: title.substring(0, 100), quantity: booking.quantity, price: unitPrice },
          ...(gatewayFee > 0
            ? [{ name: "Comisión de procesamiento", quantity: 1, price: gatewayFee }]
            : []),
        ],
        // Organizer payout (94%) + Zentro commission (6%) to its own beneficiary.
        custom_payouts: platformPayouts(benef.beneficiary_code, payoutAmount, platformFee),
      }),
    });

    const failLabel = method === "card"
      ? "No se pudo iniciar el pago con tarjeta"
      : "No se pudo generar el QR";

    if (!checkoutRes.ok || checkoutRes.data?.process === false) {
      console.error("[experience-qr] checkout failed", method, checkoutRes.status, checkoutRes.raw);
      await supabase.from("payment_sessions").update({ status: "failed" }).eq("id", session.id);
      return json({ error: checkoutRes.data?.message || failLabel }, 502);
    }

    const parsed = parseCheckoutResponse(checkoutRes.data);
    const missing = !parsed.transactionId ||
      (method === "card" ? !parsed.paymentUrl : !parsed.qrImageUrl);

    if (missing) {
      console.error("[experience-qr] invalid checkout response", method, checkoutRes.raw);
      await supabase.from("payment_sessions").update({ status: "failed" }).eq("id", session.id);
      return json({ error: "Respuesta inválida de Qhantuy" }, 502);
    }

    await supabase
      .from("payment_sessions")
      .update({ qhantuy_transaction_id: parsed.transactionId })
      .eq("id", session.id);

    return json({
      paymentSessionId: session.id,
      experienceBookingId: booking.id,
      method,
      qrImageUrl: parsed.qrImageUrl,
      paymentUrl: parsed.paymentUrl,
      amount: chargedAmount,
      baseAmount: totalAmount,
      gatewayFee,
      unitPrice,
      quantity: booking.quantity,
      title,
    });
  } catch (err) {
    console.error("generate-experience-qr error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
