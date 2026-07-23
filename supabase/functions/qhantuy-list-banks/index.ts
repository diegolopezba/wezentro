import { corsHeaders, json, qhantuyFetch } from "../_shared/qhantuy.ts";

// 24h in-memory cache (per cold start)
let cache: { at: number; data: any } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return json({ banks: cache.data });
    }
    const res = await qhantuyFetch("/check-bank", { method: "GET" });
    if (!res.ok) {
      console.error("qhantuy check-bank failed:", res.status, res.raw);
      return json({ error: "Failed to load banks", detail: res.data }, 502);
    }
    const banks = Array.isArray(res.data)
      ? res.data
      : (res.data?.items ?? res.data?.banks ?? res.data?.data ?? []);
    cache = { at: Date.now(), data: banks };
    return json({ banks });
  } catch (err) {
    console.error("qhantuy-list-banks error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
