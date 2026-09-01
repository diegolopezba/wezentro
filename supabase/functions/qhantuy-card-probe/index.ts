// TEMPORARY diagnostic: verifies that Qhantuy accepts a CYBERSOURCE (card)
// checkout for this merchant. Deleted right after the check.
import {
  checkoutMethodFields,
  corsHeaders,
  json,
  qhantuyCheckoutFetch,
} from "../_shared/qhantuy.ts";

const PROBE_TOKEN = "zx7-probe-9f21-card-check";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== PROBE_TOKEN) return json({ error: "nope" }, 403);

  const method = url.searchParams.get("method") === "qr" ? "qr" : "card";
  const platformCode = Deno.env.get("QHANTUY_PLATFORM_BENEFICIARY_CODE")?.trim();

  const res = await qhantuyCheckoutFetch("/v2/checkout", {
    method: "POST",
    body: JSON.stringify({
      ...checkoutMethodFields(
        method as "qr" | "card",
        "https://wezentro.lovable.app/dashboard",
      ),
      currency_code: "BOB",
      internal_code: `probe-${Date.now()}`,
      callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/qhantuy-callback`,
      customer_email: "probe@zentro.today",
      customer_first_name: "Zentro",
      customer_last_name: "Probe",
      detail: "Zentro card probe",
      items: [{ name: "Zentro card probe", quantity: 1, price: 1 }],
      custom_payouts: platformCode ? [{ code: platformCode, amount: 1 }] : undefined,
    }),
  });

  return json({ method, status: res.status, ok: res.ok, raw: res.raw?.slice(0, 1500) });
});
