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
      .select("id, event_id, buyer_user_id, amount, status, ticket_tier_id, qhantuy_transaction_id")
      .eq("id", internalCode)
      .maybeSingle();
    if (sessErr || !session) {
      console.error("callback: session not found", internalCode, sessErr);
      return new Response("not found", { status: 404, headers: corsHeaders });
    }

    // Idempotent: already confirmed
    if (session.status === "confirmed") {
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
    const { error: abErr } = await supabase
      .from("area_bookings")
      .update({
        status: "confirmed",
        hold_expires_at: null,
        guestlist_entry_id: buyerEntryId,
      })
      .eq("payment_session_id", session.id)
      .eq("status", "held");
    if (abErr) console.error("area booking confirm failed:", abErr);

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
      await fetch(`${SUPABASE_URL}/functions/v1/send-purchase-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ paymentSessionId: session.id }),
      });
    } catch (e) {
      console.error("send-purchase-tickets dispatch failed", e);
    }


    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("qhantuy-callback error:", err);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
