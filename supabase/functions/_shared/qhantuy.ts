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
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { ok: res.ok, status: res.status, data: parsed as any, raw: text };
}
