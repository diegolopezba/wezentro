// Shared helpers for Qhantuy API integration (production).

export const QHANTUY_BASE =
  Deno.env.get("QHANTUY_BASE_URL") ?? "https://empresa.qhantuy.com/external-api";

// Checkout has its own subdomain per Qhantuy docs.
export const QHANTUY_CHECKOUT_BASE =
  Deno.env.get("QHANTUY_CHECKOUT_BASE_URL") ?? "https://checkout.qhantuy.com/external-api";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ── Platform commission ──────────────────────────────────────────────────
// Zentro keeps a total commission of 6% of every payment made through the app.
// The organizer is paid the rest through a Qhantuy custom payout.
export function platformFeeBps(): number {
  const raw = Number(Deno.env.get("QHANTUY_PLATFORM_FEE_BPS") ?? 600);
  if (!Number.isFinite(raw) || raw < 0 || raw >= 10000) return 600;
  return Math.floor(raw);
}

export function splitAmount(total: number): {
  bps: number;
  payoutAmount: number;
  platformFee: number;
} {
  const bps = platformFeeBps();
  const gross = Number(total);
  const payoutAmount = Math.round(gross * (1 - bps / 10000) * 100) / 100;
  const platformFee = Math.round((gross - payoutAmount) * 100) / 100;
  return { bps, payoutAmount, platformFee };
}

// Builds the custom_payouts array for a checkout: the organizer gets their
// share, and Zentro's commission is explicitly routed to Zentro's own
// beneficiary (QHANTUY_PLATFORM_BENEFICIARY_CODE). The two amounts always sum
// exactly to the charged total (splitAmount guarantees this).
export function platformPayouts(
  organizerBeneficiaryCode: string,
  payoutAmount: number,
  platformFee: number,
): { code: string; amount: number }[] {
  const payouts = [{ code: organizerBeneficiaryCode, amount: payoutAmount }];
  const platformCode = Deno.env.get("QHANTUY_PLATFORM_BENEFICIARY_CODE")?.trim();
  if (platformCode && platformFee > 0) {
    payouts.push({ code: platformCode, amount: platformFee });
  } else if (!platformCode && platformFee > 0) {
    console.warn("[qhantuy] QHANTUY_PLATFORM_BENEFICIARY_CODE missing; commission left unassigned");
  }
  return payouts;
}

// ── Payment method (QR vs card) ──────────────────────────────────────────
// Qhantuy's /v2/checkout serves both rails from the same request; only the
// method fields change. Cards go through Cybersource in REDIRECT mode so no
// card data ever touches Zentro (stays out of PCI scope) and Qhantuy handles
// 3-D Secure. QR stays the default.
export type CheckoutMethod = "qr" | "card";

export function parseCheckoutMethod(raw: unknown): CheckoutMethod {
  return raw === "card" ? "card" : "qr";
}

const ALLOWED_RETURN_HOSTS = [
  "zentro.today",
  "www.zentro.today",
  "admin.zentro.today",
  "wezentro.lovable.app",
  "localhost",
];

/** Only ever hand Qhantuy a return_url we own. */
export function safeReturnUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return undefined;
    const ok =
      ALLOWED_RETURN_HOSTS.includes(url.hostname) || url.hostname.endsWith(".lovable.app");
    return ok ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Method-specific fields to spread into the /v2/checkout body. */
export function checkoutMethodFields(
  method: CheckoutMethod,
  returnUrl?: string,
): Record<string, unknown> {
  if (method === "card") {
    return {
      payment_method: "CYBERSOURCE",
      payment_type: "REDIRECT",
      ...(returnUrl ? { return_url: returnUrl } : {}),
    };
  }
  return { payment_method: "QRSIMPLE", image_method: "URL" };
}

export type ParsedCheckout = {
  transactionId: number | null;
  qrImageUrl: string | null;
  paymentUrl: string | null;
  paymentStatus: string | null;
};

/** Normalises the /v2/checkout response across both rails. */
export function parseCheckoutResponse(data: any): ParsedCheckout {
  const d = data ?? {};
  const nested = d.data ?? {};
  const transactionRaw = d.transaction_id ?? d.transactionId ?? nested.transaction_id;
  const image = d.qr_url ?? d.image_data ?? d.imageData ?? nested.qr_url ?? nested.image_data ??
    d.qr ?? d.image;
  const paymentUrl = d.payment_url ?? d.paymentUrl ?? nested.payment_url;
  const status = d.payment_status ?? nested.payment_status;
  return {
    transactionId: transactionRaw != null && Number.isFinite(Number(transactionRaw))
      ? Number(transactionRaw)
      : null,
    qrImageUrl: image ? String(image) : null,
    paymentUrl: paymentUrl ? String(paymentUrl) : null,
    paymentStatus: status ? String(status) : null,
  };
}


export function qhantuyAuthHeaders(): Record<string, string> {
  const token = Deno.env.get("QHANTUY_API_TOKEN");
  const appkey = Deno.env.get("QHANTUY_APPKEY");
  if (!token || !appkey) {
    throw new Error("Qhantuy credentials missing");
  }
  return {
    "X-API-Token": token,
    "appkey": appkey,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function qhantuyFetch(path: string, init: RequestInit = {}) {
  const url = `${QHANTUY_BASE}${path}`;
  return qhantuyRawFetch(url, init);
}

export async function qhantuyCheckoutFetch(path: string, init: RequestInit = {}) {
  const url = `${QHANTUY_CHECKOUT_BASE}${path}`;
  return qhantuyRawFetch(url, init);
}

async function qhantuyRawFetch(url: string, init: RequestInit = {}) {
  const headers = { ...qhantuyAuthHeaders(), ...(init.headers as Record<string, string> ?? {}) };
  let body = init.body;
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && typeof body === "string") {
    try {
      const parsedBody = JSON.parse(body);
      if (parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody)) {
        const appkey = Deno.env.get("QHANTUY_APPKEY");
        if (appkey && parsedBody.appkey === undefined) {
          parsedBody.appkey = appkey;
          body = JSON.stringify(parsedBody);
        }
      }
    } catch { /* leave body as-is */ }
  }
  const res = await fetch(url, { ...init, headers, body });
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { ok: res.ok, status: res.status, data: parsed as any, raw: text };
}

export type QhantuyBeneficiaryRow = {
  beneficiary_code: string;
  first_name: string;
  last_name: string;
  ci_number: string | number;
  email: string;
  bank_id: number | string;
  account_number: string;
  account_type: string;
};

export async function checkBeneficiaries(): Promise<QhantuyBeneficiaryRow[]> {
  const res = await qhantuyFetch("/check-beneficiaries", {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok || res.data?.process === false) {
    console.error("check-beneficiaries failed:", res.status, res.raw);
    return [];
  }
  const items = res.data?.items ?? res.data?.data ?? [];
  return Array.isArray(items) ? (items as QhantuyBeneficiaryRow[]) : [];
}

export function isDuplicateCiError(data: any): boolean {
  const msg = String(data?.message ?? "").toLowerCase();
  const errs = Array.isArray(data?.errors) ? data.errors.join(" ").toLowerCase() : "";
  return (
    msg.includes("ya existe un beneficiario") ||
    errs.includes("cédula de identidad") ||
    errs.includes("cedula de identidad")
  );
}
