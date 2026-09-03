import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCharge,
  checkoutMethodFields,
  corsHeaders,
  json,
  parseCheckoutMethod,
  parseCheckoutResponse,
  qhantuyCheckoutFetch,
  safeReturnUrl,
} from "../_shared/qhantuy.ts";

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
    const method = parseCheckoutMethod(body?.method);
    const returnUrl = safeReturnUrl(body?.returnUrl);
    console.log("[sub-qr] request", { tier, interval, method, hasReturnUrl: !!returnUrl });
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

    // Qhantuy's commission is added on top of the plan price (PRE_CHARGE).
    const charge = buildCharge(quote.amount);
    const chargedAmount = charge.totalAmount;
    const gatewayFee = charge.gatewayFee;

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
        amount: chargedAmount,
        base_amount: quote.amount,
        gateway_fee_amount: gatewayFee,
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
        payment_method: method,
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
        ...checkoutMethodFields(method, returnUrl),
        currency_code: "BOB",
        internal_code: session.id,
        callback_url: callbackUrl,
        customer_email: userData.user.email ?? undefined,
        customer_first_name: nameParts[0] || undefined,
        customer_last_name: nameParts.slice(1).join(" ") || undefined,
        detail: detail.substring(0, 120),
        items: [
          { name: detail.substring(0, 100), quantity: 1, price: quote.amount },
          ...(gatewayFee > 0
            ? [{ name: "Comisión de procesamiento", quantity: 1, price: gatewayFee }]
            : []),
        ],
        // Subscription revenue already belongs to the Zentro merchant account;
        // a self-payout would consume the balance needed for Qhantuy's fee.
      }),
    });

    const failLabel = method === "card"
      ? "No se pudo iniciar el pago con tarjeta"
      : "No se pudo generar el QR";

    if (!checkoutRes.ok || checkoutRes.data?.process === false) {
      console.error("[sub-qr] checkout failed:", method, checkoutRes.status, {
        sessionId: session.id,
        baseAmount: quote.amount,
        gatewayFee,
        chargedAmount,
        providerResponse: checkoutRes.data,
      });
      await supabase.from("payment_sessions").update({ status: "failed" }).eq("id", session.id);
      return json({ error: checkoutRes.data?.message || failLabel }, 502);
    }

    const parsed = parseCheckoutResponse(checkoutRes.data);
    const missing = !parsed.transactionId ||
      (method === "card" ? !parsed.paymentUrl : !parsed.qrImageUrl);

    if (missing) {
      console.error("[sub-qr] invalid checkout response:", method, checkoutRes.raw);
      await supabase.from("payment_sessions").update({ status: "failed" }).eq("id", session.id);
      return json(
        {
          error: method === "card"
            ? "Qhantuy no devolvió el enlace de pago con tarjeta. Probá con QR."
            : "Respuesta inválida de Qhantuy",
          code: "invalid_checkout_response",
        },
        502,
      );
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
      amount: chargedAmount,
      baseAmount: quote.amount,
      gatewayFee,
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
