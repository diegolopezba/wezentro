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

    if (session.ticket_tier_id) {
      const { data: incOk, error: incErr } = await supabase.rpc("increment_tier_sold", {
        _tier_id: session.ticket_tier_id,
      });
      if (incErr) console.error("increment_tier_sold failed:", incErr);
      else if (incOk === false) console.warn("tier sold out at confirmation", session.ticket_tier_id);
    }

    const { error: glErr } = await supabase
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
        { onConflict: "event_id,user_id" },
      );
    if (glErr) console.error("guestlist upsert failed:", glErr);

    await supabase.from("notifications").insert({
      user_id: session.buyer_user_id,
      type: "payment_confirmed",
      title: "¡Pago Confirmado!",
      body: "Tu entrada fue confirmada automáticamente. ¡Ya estás en la lista!",
      entity_type: "event",
      entity_id: session.event_id,
    });

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("qhantuy-callback error:", err);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
