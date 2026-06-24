// Batched impression ingest. Replicates the TikTok/Pinterest SDK pattern:
// the client buffers events in localStorage and flushes batches every 15s,
// at 100 events, or on tab hide. This endpoint atomically bumps the
// denormalized event_stats counters and stores a raw row in
// event_interactions for any historical aggregation/analytics.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface BatchEvent {
  eventId: string;
  type: "impression" | "view";
}

const MAX_BATCH = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null) as { events?: BatchEvent[] } | null;
    const events = body?.events ?? [];

    if (!Array.isArray(events) || events.length === 0 || events.length > MAX_BATCH) {
      return new Response(
        JSON.stringify({ error: "events must be an array of 1..50 items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve user from forwarded JWT if present (anonymous impressions are allowed)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
      );
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Server-side dedupe + validation. Aggregate per event so we issue at
    // most one counter bump per event_id.
    const perEvent = new Map<string, { impressions: number; views: number }>();
    const interactionRows: { event_id: string; user_id: string | null; type: string }[] = [];
    const seen = new Set<string>();

    for (const e of events) {
      if (!e?.eventId || !UUID_RE.test(e.eventId)) continue;
      if (e.type !== "impression" && e.type !== "view") continue;
      const dedupKey = `${e.eventId}:${e.type}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const cur = perEvent.get(e.eventId) ?? { impressions: 0, views: 0 };
      if (e.type === "impression") cur.impressions++; else cur.views++;
      perEvent.set(e.eventId, cur);

      interactionRows.push({ event_id: e.eventId, user_id: userId, type: e.type });
    }

    if (perEvent.size === 0) {
      return new Response(JSON.stringify({ accepted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bump denormalized counters (one RPC per event — small batches are cheap)
    await Promise.all(
      Array.from(perEvent.entries()).map(([eventId, c]) =>
        admin.rpc("bump_event_stats", {
          _event_id: eventId,
          _impressions: c.impressions,
          _views: c.views,
        }),
      ),
    );

    // Append raw rows for historical analytics
    if (interactionRows.length > 0) {
      await admin.from("event_interactions").insert(interactionRows);
    }

    return new Response(
      JSON.stringify({ accepted: interactionRows.length, events: perEvent.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[ingest-impressions] error", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
