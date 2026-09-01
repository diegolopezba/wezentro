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
  splitAmount,
} from "../_shared/qhantuy.ts";

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

    const body = await req.json();
    const { eventId, ticketTierId, promoterId, eventAreaId, areaBookingId } = body;
    const MAX_QTY = 10;
    const rawQty = Number(body.quantity ?? 1);
    const quantity = Number.isFinite(rawQty) ? Math.floor(rawQty) : 1;
    // assignees[i] = user id for ticket i+2 (ticket 1 always belongs to the buyer), null when unassigned
    const rawAssignees: unknown = body.assignees;
    const assignees: (string | null)[] = Array.isArray(rawAssignees)
      ? rawAssignees.map((a) => (typeof a === "string" && /^[0-9a-f-]{36}$/i.test(a) ? a : null))
      : [];
    console.log("[qr] request", { eventId, ticketTierId, promoterId, eventAreaId, areaBookingId, buyerId, quantity });
    if (!eventId) return json({ error: "Falta el evento", code: "no_event_id" }, 400);
    if (quantity < 1 || quantity > MAX_QTY) {
      return json({ error: `Podés comprar entre 1 y ${MAX_QTY} entradas`, code: "bad_quantity" }, 400);
    }
    if (quantity > 1 && eventAreaId) {
      return json({ error: "Las áreas se reservan de a una", code: "area_quantity" }, 400);
    }


    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load event
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select(
        "id, title, price, creator_id, waitlist_enabled, sales_open_at, waitlist_early_access_hours, waitlist_released_at, waitlist_tier_id"
      )
      .eq("id", eventId)
      .single();
    if (eventErr || !event) {
      console.error("[qr] event not found", eventId, eventErr?.message);
      return json({ error: "No encontramos este evento", code: "event_not_found" }, 404);
    }

    // ── Waiting-list gating ──────────────────────────────────────────────
    // While the pre-sale list is open nobody can buy. During the exclusive
    // early-access window only people on the list can.
    if (event.waitlist_enabled && event.creator_id !== buyerId) {
      const now = Date.now();
      const releasedRaw = event.waitlist_released_at || event.sales_open_at;
      const releasedAt = releasedRaw ? new Date(releasedRaw).getTime() : NaN;
      const isReleased = Number.isFinite(releasedAt) && releasedAt <= now;

      if (!isReleased) {
        return json(
          { error: "Las entradas todavía no están a la venta", code: "waitlist_open" },
          403
        );
      }

      const hours = Number(event.waitlist_early_access_hours ?? 0);
      if (hours > 0 && now < releasedAt + hours * 3600_000) {
        const { data: wl } = await supabase
          .from("event_waitlist")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", buyerId)
          .maybeSingle();
        if (!wl) {
          return json(
            { error: "Acceso anticipado solo para la lista de espera", code: "early_access_only" },
            403
          );
        }
        // When the list is attached to a specific ticket type, only that one is on sale.
        if (event.waitlist_tier_id && ticketTierId !== event.waitlist_tier_id) {
          return json(
            { error: "Durante el acceso anticipado solo está a la venta la entrada de la lista", code: "waitlist_tier_only" },
            403
          );
        }
      }
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
      if (t.capacity != null && t.sold_count + quantity > t.capacity) {
        const left = Math.max(Number(t.capacity) - Number(t.sold_count), 0);
        console.error("[qr] tier sold out / not enough", { ticketTierId, left, quantity });
        return json(
          {
            error: left === 0 ? "Entradas agotadas" : `Solo quedan ${left} entradas de este tipo`,
            code: left === 0 ? "tier_sold_out" : "tier_insufficient",
          },
          409,
        );
      }

      tierId = t.id;
      effectivePrice = Number(t.price);
      effectiveTitle = `${event.title || "Ticket"} — ${t.name}`;
    }

    // Visual venue layout checkout: price and availability come from the held area.
    let areaId: string | null = null;
    let bookingId: string | null = null;
    let bookingPartySize = 1;

    if (eventAreaId) {
      if (!areaBookingId) {
        return json({ error: "Falta la reserva del área", code: "no_area_booking" }, 400);
      }
      const { data: booking } = await supabase
        .from("area_bookings")
        .select("id, event_area_id, user_id, party_size, status, hold_expires_at")
        .eq("id", areaBookingId)
        .maybeSingle();
      if (
        !booking ||
        booking.user_id !== buyerId ||
        booking.event_area_id !== eventAreaId ||
        booking.status !== "held" ||
        (booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() <= Date.now())
      ) {
        console.error("[qr] invalid area hold", { areaBookingId, eventAreaId, buyerId });
        return json({ error: "Tu reserva del área expiró. Elegí el área de nuevo.", code: "area_hold_invalid" }, 409);
      }
      const { data: area } = await supabase
        .from("event_areas")
        .select("id, name, price, event_id, is_active")
        .eq("id", eventAreaId)
        .maybeSingle();
      if (!area || area.event_id !== eventId || !area.is_active) {
        return json({ error: "Esta área ya no está disponible", code: "area_not_found" }, 404);
      }
      areaId = area.id;
      bookingId = booking.id;
      bookingPartySize = booking.party_size;
      effectivePrice = Number(area.price ?? 0);
      effectiveTitle = `${event.title || "Ticket"} — ${area.name}`;
      tierId = null;
    }

    if (!effectivePrice || effectivePrice <= 0) {
      console.error("[qr] event has no price", { eventId, tierId, effectivePrice });
      return json({ error: "Este evento no tiene un precio configurado", code: "no_price" }, 400);
    }

    // Validate assignees: real profiles, no duplicates, never the buyer, at most quantity-1.
    const cleanAssignees: (string | null)[] = new Array(Math.max(quantity - 1, 0)).fill(null);
    const wanted = assignees.slice(0, Math.max(quantity - 1, 0)).filter((a): a is string => !!a);
    if (wanted.length) {
      const unique = [...new Set(wanted)].filter((id) => id !== buyerId);
      const { data: validProfiles } = await supabase
        .from("profiles")
        .select("id")
        .in("id", unique);
      const validIds = new Set((validProfiles ?? []).map((p: any) => p.id));
      const used = new Set<string>();
      for (let i = 0; i < cleanAssignees.length; i++) {
        const candidate = assignees[i];
        if (candidate && candidate !== buyerId && validIds.has(candidate) && !used.has(candidate)) {
          cleanAssignees[i] = candidate;
          used.add(candidate);
        }
      }
    }

    const totalAmount = Number((effectivePrice * quantity).toFixed(2));
    // Zentro keeps its commission; the rest is paid out to the organizer.
    const { bps: feeBps, payoutAmount, platformFee } = splitAmount(totalAmount);
    if (payoutAmount <= 0) {
      console.error("[qr] payout would be zero", { totalAmount, feeBps });
      return json({ error: "El monto es demasiado bajo para procesar el pago", code: "amount_too_low" }, 400);
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
      .select("full_name")
      .eq("id", buyerId)
      .maybeSingle();

    // profiles only stores a single full_name; split it for Qhantuy's customer fields.
    const buyerNameParts = String(buyerProfile?.full_name ?? "").trim().split(/\s+/).filter(Boolean);
    const buyerFirstName = buyerNameParts[0] || undefined;
    const buyerLastName = buyerNameParts.slice(1).join(" ") || undefined;


    // Create the session first so its id acts as the Qhantuy internal_code.
    const { data: session, error: sessErr } = await supabase
      .from("payment_sessions")
      .insert({
        event_id: eventId,
        buyer_user_id: buyerId,
        business_user_id: event.creator_id,
        amount: totalAmount,
        status: "pending",
        ticket_tier_id: tierId,
        promoter_id: safePromoterId,
        provider: "qhantuy",
        beneficiary_code: benef.beneficiary_code,
        event_area_id: areaId,
        party_size: bookingPartySize,
        quantity,
        assignees: cleanAssignees,
        platform_fee_bps: feeBps,
        platform_fee_amount: platformFee,
        payout_amount: payoutAmount,


      })
      .select("id")
      .single();
    if (sessErr || !session) {
      console.error("[qr] session insert failed:", sessErr?.message, sessErr);
      return json({ error: "No se pudo iniciar el pago", code: "session_insert_failed" }, 500);
    }

    // Tie the held area booking to this payment session so the callback can confirm it.
    if (bookingId) {
      await supabase
        .from("area_bookings")
        .update({ payment_session_id: session.id })
        .eq("id", bookingId);
    }

    // Callback URL
    const projectRef = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
    const callbackUrl = `https://${projectRef}.supabase.co/functions/v1/qhantuy-callback`;

    // Fire Qhantuy checkout (QR or Cybersource card redirect)
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
        detail: `${effectiveTitle}${quantity > 1 ? ` x${quantity}` : ""}`.substring(0, 120),
        items: [
          {
            name: effectiveTitle.substring(0, 100),
            quantity,
            price: effectivePrice,
          },
        ],
        // Organizer payout (94%) + Zentro commission (6%) to its own beneficiary.
        custom_payouts: platformPayouts(benef.beneficiary_code, payoutAmount, platformFee),
      }),
    });

    const failLabel = method === "card" ? "No se pudo iniciar el pago con tarjeta" : "No se pudo generar el QR";

    if (!checkoutRes.ok) {
      console.error("qhantuy checkout failed:", method, checkoutRes.status, checkoutRes.raw);
      // Best-effort cleanup: mark session failed
      await supabase.from("payment_sessions")
        .update({ status: "failed" })
        .eq("id", session.id);
      return json({ error: failLabel, detail: checkoutRes.data }, 502);
    }

    if (checkoutRes.data?.process === false) {
      console.error("qhantuy checkout rejected:", method, checkoutRes.raw);
      await supabase.from("payment_sessions").update({ status: "failed" }).eq("id", session.id);
      return json({ error: checkoutRes.data?.message || failLabel }, 400);
    }

    const parsed = parseCheckoutResponse(checkoutRes.data);
    const missing = !parsed.transactionId ||
      (method === "card" ? !parsed.paymentUrl : !parsed.qrImageUrl);

    if (missing) {
      console.error("checkout response missing fields:", method, checkoutRes.raw);
      await supabase.from("payment_sessions").update({ status: "failed" }).eq("id", session.id);
      return json({ error: "Respuesta inválida de Qhantuy" }, 502);
    }

    await supabase
      .from("payment_sessions")
      .update({ qhantuy_transaction_id: parsed.transactionId })
      .eq("id", session.id);

    return json({
      paymentSessionId: session.id,
      method,
      qrImageUrl: parsed.qrImageUrl,
      paymentUrl: parsed.paymentUrl,
      amount: totalAmount,
      unitPrice: effectivePrice,
      quantity,
      eventTitle: effectiveTitle,
      ticketTierId: tierId,

    });

  } catch (err) {
    console.error("generate-qhantuy-qr error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
