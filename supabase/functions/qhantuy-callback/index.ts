import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/qhantuy.ts";

// Qhantuy hits this endpoint (GET) after every checkout with the outcome.
// Query params: transaction_id, payment_status, checkout_amount, checkout_currency,
//               internal_code, profile_code, message.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());

    const internalCode = params.internal_code;
    const transactionIdRaw = params.transaction_id;
    const paymentStatus = String(params.payment_status ?? "").toLowerCase();
    const amount = Number(params.checkout_amount);
    const currency = String(params.checkout_currency ?? "").toUpperCase();

    if (!internalCode || !transactionIdRaw) {
      return new Response("missing params", { status: 400, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: session, error: sessErr } = await supabase
      .from("payment_sessions")
      .select("id, event_id, experience_booking_id, buyer_user_id, amount, status, ticket_tier_id, qhantuy_transaction_id, quantity, assignees, subscription_business_id, subscription_tier, subscription_interval")
      .eq("id", internalCode)
      .maybeSingle();
    if (sessErr || !session) {
      console.error("callback: session not found", internalCode, sessErr);
      return new Response("not found", { status: 404, headers: corsHeaders });
    }

    // Idempotent: retry the email handoff before acknowledging. The email queue
    // deduplicates by the stable payment-session key, so callback retries cannot
    // create duplicate emails but can recover from a transient dispatch failure.
    if (session.status === "confirmed") {
      if (!(session as any).experience_booking_id && !(session as any).subscription_business_id) {
        const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-purchase-tickets`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ paymentSessionId: session.id }),
        });
        const emailBody = await emailResponse.text();
        if (!emailResponse.ok) {
          console.error("confirmed callback email retry failed", emailResponse.status, emailBody);
        } else {
          console.log("confirmed callback email retry queued", session.id, emailBody);
        }
      }
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Verify transaction id matches what we stored
    if (session.qhantuy_transaction_id != null &&
        Number(session.qhantuy_transaction_id) !== Number(transactionIdRaw)) {
      console.error("callback: transaction id mismatch",
        session.qhantuy_transaction_id, transactionIdRaw);
      return new Response("mismatch", { status: 400, headers: corsHeaders });
    }

    const isSuccess = ["success", "paid", "completed", "approved"].includes(paymentStatus);
    const isFailed = ["failed", "error", "declined", "canceled", "cancelled"].includes(paymentStatus);
    const isExpired = ["expired"].includes(paymentStatus);

    if (isFailed || isExpired) {
      await supabase
        .from("payment_sessions")
        .update({
          status: isExpired ? "expired" : "failed",
          qhantuy_raw_callback: params,
        })
        .eq("id", session.id);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    if (!isSuccess) {
      // Unknown status — log for follow-up but ack.
      console.warn("callback: unknown status", paymentStatus, params);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Amount/currency guard
    if (currency && currency !== "BOB") {
      console.error("callback: wrong currency", currency);
      return new Response("bad currency", { status: 400, headers: corsHeaders });
    }
    if (Number.isFinite(amount) && Math.abs(amount - Number(session.amount)) > 0.009) {
      console.error("callback: amount mismatch", amount, session.amount);
      return new Response("bad amount", { status: 400, headers: corsHeaders });
    }

    const now = new Date().toISOString();

    await supabase
      .from("payment_sessions")
      .update({
        status: "confirmed",
        confirmed_at: now,
        qhantuy_raw_callback: params,
      })
      .eq("id", session.id);

    // Business plan checkout: activate / extend the subscription and stop here.
    if ((session as any).subscription_business_id) {
      const businessId = (session as any).subscription_business_id as string;
      const tier = String((session as any).subscription_tier ?? "basico");
      const rawInterval = String((session as any).subscription_interval ?? "month");
      const prorated = rawInterval === "prorated";
      const interval = prorated ? "month" : rawInterval;

      const { data: act, error: actErr } = await supabase.rpc("activate_business_subscription", {
        _business_id: businessId,
        _tier: tier,
        _interval: interval,
        _session_id: session.id,
        _amount: Number(session.amount),
        _prorated: prorated,
      });
      if (actErr) console.error("activate_business_subscription failed:", actErr);

      const planName =
        tier === "elite" ? "Premium" : tier === "profesional" ? "Profesional" : "Básico";

      await supabase.from("notifications").insert({
        user_id: businessId,
        type: "subscription_activated",
        title: "Plan activado",
        body: `Tu plan ${planName} ya está activo.`,
        entity_type: "subscription",
        entity_id: businessId,
      });

      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-subscription-emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ businessId, kind: "activated", paymentSessionId: session.id }),
        });
      } catch (e) {
        console.error("send-subscription-emails dispatch failed", e);
      }

      console.log("subscription activated", businessId, tier, act);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Experience booking checkout: confirm the booking and stop here (no event tickets).
    if ((session as any).experience_booking_id) {
      const bookingId = (session as any).experience_booking_id as string;
      const { error: bkErr } = await supabase
        .from("experience_bookings")
        .update({ status: "confirmed", hold_expires_at: null })
        .eq("id", bookingId);
      if (bkErr) console.error("experience booking confirm failed:", bkErr);

      const { data: bk } = await supabase
        .from("experience_bookings")
        .select("experience_id, quantity, experiences(title, business_id)")
        .eq("id", bookingId)
        .maybeSingle();

      const expTitle = (bk as any)?.experiences?.title ?? "tu experiencia";
      const businessId = (bk as any)?.experiences?.business_id ?? null;

      const notes: any[] = [
        {
          user_id: session.buyer_user_id,
          type: "payment_confirmed",
          title: "¡Reserva confirmada!",
          body: `Tu reserva para ${expTitle} está confirmada.`,
          entity_type: "experience_booking",
          entity_id: bookingId,
        },
      ];
      if (businessId && businessId !== session.buyer_user_id) {
        notes.push({
          user_id: businessId,
          type: "payment_confirmed",
          title: "Nueva reserva pagada",
          body: `Tenés una nueva reserva para ${expTitle}.`,
          entity_type: "experience_booking",
          entity_id: bookingId,
        });
      }
      await supabase.from("notifications").insert(notes);

      // Email buyer, tagged guests and the business now that the booking is confirmed.
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-experience-emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ experienceBookingId: bookingId, kind: "created" }),
        });
      } catch (e) {
        console.error("send-experience-emails dispatch failed", e);
      }

      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const quantity = Math.max(Number((session as any).quantity ?? 1) || 1, 1);
    const assignees: (string | null)[] = Array.isArray((session as any).assignees)
      ? ((session as any).assignees as (string | null)[])
      : [];

    if (session.ticket_tier_id) {
      const { data: incOk, error: incErr } = await supabase.rpc("increment_tier_sold_by", {
        _tier_id: session.ticket_tier_id,
        _qty: quantity,
      });
      if (incErr) console.error("increment_tier_sold_by failed:", incErr);
      else if (incOk === false) console.warn("tier oversold at confirmation", session.ticket_tier_id);
    }

    // Ticket 1 belongs to the buyer; the rest go to tagged users or stay unassigned
    // (the buyer receives them by email and forwards them).
    const owners: (string | null)[] = [session.buyer_user_id];
    for (let i = 1; i < quantity; i++) owners.push(assignees[i - 1] ?? null);

    const baseRow = {
      event_id: session.event_id,
      status: "approved",
      payment_status: "confirmed",
      payment_confirmed_at: now,
      ticket_tier_id: session.ticket_tier_id ?? null,
      purchased_by_user_id: session.buyer_user_id,
      payment_session_id: session.id,
    };

    let buyerEntryId: string | null = null;
    const seen = new Set<string>();

    for (const ownerId of owners) {
      if (ownerId && seen.has(ownerId)) {
        // Never create two owned tickets for the same person; leave it unassigned instead.
        const { error } = await supabase.from("guestlist_entries").insert({ ...baseRow, user_id: null });
        if (error) console.error("ticket insert failed:", error);
        continue;
      }

      if (ownerId) {
        seen.add(ownerId);
        const { data: existing } = await supabase
          .from("guestlist_entries")
          .select("id")
          .eq("event_id", session.event_id)
          .eq("user_id", ownerId)
          .maybeSingle();

        if (existing?.id) {
          const { error } = await supabase
            .from("guestlist_entries")
            .update({
              status: "approved",
              payment_status: "confirmed",
              payment_confirmed_at: now,
              ticket_tier_id: session.ticket_tier_id ?? null,
              purchased_by_user_id: session.buyer_user_id,
              payment_session_id: session.id,
            })
            .eq("id", existing.id);
          if (error) console.error("ticket update failed:", error);
          if (ownerId === session.buyer_user_id) buyerEntryId = existing.id;
          continue;
        }
      }

      const { data: inserted, error } = await supabase
        .from("guestlist_entries")
        .insert({ ...baseRow, user_id: ownerId })
        .select("id")
        .maybeSingle();
      if (error) console.error("ticket insert failed:", error);
      if (ownerId && ownerId === session.buyer_user_id) buyerEntryId = inserted?.id ?? null;
    }

    // Visual venue layout: turn the held area booking into a confirmed one.
    const { data: areaBookings, error: abErr } = await supabase
      .from("area_bookings")
      .update({
        status: "confirmed",
        hold_expires_at: null,
        guestlist_entry_id: buyerEntryId,
      })
      .eq("payment_session_id", session.id)
      .eq("status", "held")
      .select("id, event_area_id, user_id");
    if (abErr) console.error("area booking confirm failed:", abErr);

    // Lounge areas with bundled tickets: generate one guestlist entry per
    // included ticket so door staff use the same check-in flow. The buyer's
    // own entry already exists (created by the loop above); the extras stay
    // unassigned — the buyer receives all of them by email and forwards them.
    const areaBooking = areaBookings?.[0];
    if (areaBooking) {
      try {
        const { data: area } = await supabase
          .from("event_areas")
          .select("included_tickets")
          .eq("id", areaBooking.event_area_id)
          .maybeSingle();
        const included = Math.max(Number(area?.included_tickets ?? 0) || 0, 0);
        if (included > 0) {
          await supabase
            .from("area_bookings")
            .update({ included_tickets: included })
            .eq("id", areaBooking.id);
          if (buyerEntryId) {
            await supabase
              .from("guestlist_entries")
              .update({ area_booking_id: areaBooking.id })
              .eq("id", buyerEntryId);
          }
          for (let i = 1; i < included; i++) {
            const { error } = await supabase.from("guestlist_entries").insert({
              ...baseRow,
              user_id: null,
              area_booking_id: areaBooking.id,
            });
            if (error) console.error("included ticket insert failed:", error);
          }
        }
      } catch (e) {
        console.error("included tickets generation failed:", e);
      }

      // Lounge confirmation email with area detail, perks and answers.
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-lounge-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ areaBookingId: areaBooking.id }),
        });
      } catch (e) {
        console.error("send-lounge-email dispatch failed", e);
      }
    }

    const notifications = [
      {
        user_id: session.buyer_user_id,
        type: "payment_confirmed",
        title: "¡Pago Confirmado!",
        body:
          quantity > 1
            ? `Tus ${quantity} entradas fueron confirmadas. Te las enviamos por correo.`
            : "Tu entrada fue confirmada automáticamente. ¡Ya estás en la lista!",
        entity_type: "event",
        entity_id: session.event_id,
      },
      ...[...seen]
        .filter((id) => id !== session.buyer_user_id)
        .map((id) => ({
          user_id: id,
          type: "payment_confirmed",
          title: "Tenés una entrada",
          body: "Alguien compró una entrada para vos. Ya está en tus entradas.",
          entity_type: "event",
          entity_id: session.event_id,
        })),
    ];
    await supabase.from("notifications").insert(notifications);

    // Email every ticket (buyer gets all of them, assignees get theirs).
    try {
      const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-purchase-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ paymentSessionId: session.id }),
      });
      const emailBody = await emailResponse.text();
      if (!emailResponse.ok) {
        console.error("send-purchase-tickets failed", emailResponse.status, emailBody);
      } else {
        console.log("ticket confirmation email dispatched", session.id, emailBody);
      }
    } catch (e) {
      console.error("send-purchase-tickets dispatch failed", e);
    }


    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("qhantuy-callback error:", err);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
