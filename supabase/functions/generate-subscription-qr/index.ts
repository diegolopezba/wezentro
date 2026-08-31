import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, qhantuyCheckoutFetch } from "../_shared/qhantuy.ts";
import {
  BillingInterval,
  TIER_NAMES,
  TierKey,
  isInterval,
  isTierKey,
  quoteCharge,
} from "../_shared/subscriptionPricing.ts";

const FOOD_BUSINESS_TYPES = ["restaurant", "coffee", "bar"];

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
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const tier = body?.tier as TierKey;
    const interval = (body?.interval ?? "month") as BillingInterval;
    if (!isTierKey(tier)) return json({ error: "Plan inválido", code: "bad_tier" }, 400);
    if (!isInterval(interval)) return json({ error: "Ciclo inválido", code: "bad_interval" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, is_business, business_type")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.is_business || !FOOD_BUSINESS_TYPES.includes(String(profile.business_type))) {
      return json(
        { error: "Los planes son para cuentas de restaurante, café o bar", code: "not_food_business" },
        403,
      );
    }

    const { data: current } = await supabase
      .from("business_subscriptions")
      .select("tier, status, billing_interval, billing_period_end")
      .eq("business_id", userId)
      .maybeSingle();

    const quote = quoteCharge({
      tier,
      interval,
      currentTier: (current?.tier as TierKey) ?? null,
      currentStatus: current?.status ?? null,
      currentInterval: (current?.billing_interval as BillingInterval) ?? null,
      periodEnd: current?.billing_period_end ?? null,
    });

    if (!(quote.amount > 0)) {
      return json({ error: "Monto inválido", code: "bad_amount" }, 400);
    }

    const platformCode = Deno.env.get("QHANTUY_PLATFORM_BENEFICIARY_CODE")?.trim();
    if (!platformCode) {
      console.error("[sub-qr] QHANTUY_PLATFORM_BENEFICIARY_CODE missing");
      return json({ error: "El cobro no está configurado", code: "no_platform_beneficiary" }, 500);
    }

    // The whole subscription payment is Zentro revenue: single payout line.
    const { data: session, error: sessErr } = await supabase
      .from("payment_sessions")
      .insert({
        buyer_user_id: userId,
        business_user_id: userId,
        amount: quote.amount,
        status: "pending",
        provider: "qhantuy",
        beneficiary_code: platformCode,
        quantity: 1,
        platform_fee_bps: 10000,
        platform_fee_amount: quote.amount,
        payout_amount: 0,
        subscription_business_id: userId,
        subscription_tier: tier,
        subscription_interval: quote.prorated ? "prorated" : interval,
      })
      .select("id")
      .single();

    if (sessErr || !session) {
      console.error("[sub-qr] session insert failed:", sessErr?.message, sessErr);
      return json({ error: "No se pudo iniciar el pago", code: "session_insert_failed" }, 500);
    }

    const projectRef = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
    const callbackUrl = `https://${projectRef}.supabase.co/functions/v1/qhantuy-callback`;

    const nameParts = String(profile.full_name ?? "").trim().split(/\s+/).filter(Boolean);
    const detail = `Zentro plan ${TIER_NAMES[tier]} · ${
      quote.prorated ? "ajuste" : interval === "year" ? "12 meses" : "1 mes"
    }`;

    const checkoutRes = await qhantuyCheckoutFetch("/v2/checkout", {
      method: "POST",
      body: JSON.stringify({
        payment_method: "QRSIMPLE",
        image_method: "URL",
        currency_code: "BOB",
        internal_code: session.id,
        callback_url: callbackUrl,
        customer_email: userData.user.email ?? undefined,
        customer_first_name: nameParts[0] || undefined,
        customer_last_name: nameParts.slice(1).join(" ") || undefined,
        detail: detail.substring(0, 120),
        items: [{ name: detail.substring(0, 100), quantity: 1, price: quote.amount }],
        custom_payouts: [{ code: platformCode, amount: quote.amount }],
      }),
    });

    if (!checkoutRes.ok || checkoutRes.data?.process === false) {
      console.error("[sub-qr] checkout failed:", checkoutRes.status, checkoutRes.raw);
      await supabase.from("payment_sessions").update({ status: "failed" }).eq("id", session.id);
      return json({ error: checkoutRes.data?.message || "No se pudo generar el QR" }, 502);
    }

    const d = checkoutRes.data ?? {};
    const transactionId = d.transaction_id ?? d.transactionId ?? d.data?.transaction_id;
    const imageData =
      d.qr_url ?? d.image_data ?? d.imageData ?? d.data?.qr_url ?? d.data?.image_data ?? d.qr ?? d.image;

    if (!transactionId || !imageData) {
      console.error("[sub-qr] invalid checkout response:", checkoutRes.raw);
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
      amount: quote.amount,
      prorated: quote.prorated,
      label: quote.label,
      tier,
      interval,
    });
  } catch (err) {
    console.error("generate-subscription-qr error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
