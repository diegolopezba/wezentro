// Background worker — derives user preference scores from the append-only
// interaction_events_log. Runs every 5 min via pg_cron + net.http_post.
//
// Pattern: read all rows since the last cursor, aggregate in memory, then
// emit one upsert per (user, category/creator/day/tag). One log row becomes
// at most 4 derived writes — batched across thousands of events per run.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SIGNAL_WEIGHTS: Record<string, number> = {
  join: 100,
  save: 80,
  repost: 70,
  like: 60,
  click: 30,
  not_interested: -100,
};

const CURSOR_NAME = "derive-preferences";
const BATCH_LIMIT = 5000;

interface AggKey {
  userId: string;
  key: string;
}

const keyStr = (a: AggKey) => `${a.userId}\u0000${a.key}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    // 1. Read cursor
    const { data: cursorRow } = await supabase
      .from("worker_cursors")
      .select("last_processed_id")
      .eq("name", CURSOR_NAME)
      .maybeSingle();

    const lastId: number = cursorRow?.last_processed_id ?? 0;

    // 2. Read batch of new events
    const { data: rows, error: readErr } = await supabase
      .from("interaction_events_log")
      .select("id, user_id, event_id, signal_type, created_at")
      .gt("id", lastId)
      .order("id", { ascending: true })
      .limit(BATCH_LIMIT);

    if (readErr) throw readErr;
    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, cursor: lastId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Fetch event metadata in one query
    const eventIds = Array.from(new Set(rows.map((r: any) => r.event_id)));
    const { data: events, error: evErr } = await supabase
      .from("events")
      .select("id, category, creator_id, description_tags")
      .in("id", eventIds);
    if (evErr) throw evErr;
    const eventMap = new Map(events?.map((e: any) => [e.id, e]) ?? []);

    // 4. Aggregate: collect delta sums and counts per (user, dimension, key)
    const categoryAgg = new Map<string, { userId: string; category: string; sumWeight: number; count: number; latest: string; isNegative: boolean }>();
    const creatorAgg = new Map<string, { userId: string; creatorId: string; sumWeight: number; count: number; latest: string; isNegative: boolean }>();
    const dayAgg = new Map<string, { userId: string; category: string; dow: number; sumWeight: number; count: number; latest: string }>();
    const tagAgg = new Map<string, { userId: string; tag: string; sumWeight: number; count: number; latest: string }>();

    for (const r of rows as any[]) {
      const ev = eventMap.get(r.event_id);
      if (!ev) continue;
      const weight = SIGNAL_WEIGHTS[r.signal_type];
      if (weight === undefined) continue;
      const isNegative = weight < 0;
      const ts = r.created_at;

      // Category
      if (ev.category) {
        const k = `${r.user_id}|${ev.category}`;
        const cur = categoryAgg.get(k);
        if (cur) {
          cur.sumWeight += weight; cur.count++;
          if (ts > cur.latest) cur.latest = ts;
          if (isNegative) cur.isNegative = true;
        } else {
          categoryAgg.set(k, { userId: r.user_id, category: ev.category, sumWeight: weight, count: 1, latest: ts, isNegative });
        }
      }

      // Creator (skip self)
      if (ev.creator_id && ev.creator_id !== r.user_id) {
        const k = `${r.user_id}|${ev.creator_id}`;
        const cur = creatorAgg.get(k);
        if (cur) {
          cur.sumWeight += weight; cur.count++;
          if (ts > cur.latest) cur.latest = ts;
          if (isNegative) cur.isNegative = true;
        } else {
          creatorAgg.set(k, { userId: r.user_id, creatorId: ev.creator_id, sumWeight: weight, count: 1, latest: ts, isNegative });
        }
      }

      // Day-of-week (only positive)
      if (ev.category && !isNegative) {
        const dow = new Date(ts).getUTCDay();
        const k = `${r.user_id}|${dow}|${ev.category}`;
        const cur = dayAgg.get(k);
        if (cur) {
          cur.sumWeight += weight; cur.count++;
          if (ts > cur.latest) cur.latest = ts;
        } else {
          dayAgg.set(k, { userId: r.user_id, category: ev.category, dow, sumWeight: weight, count: 1, latest: ts });
        }
      }

      // Tags (only positive)
      const tags = ev.description_tags as string[] | null;
      if (tags?.length && !isNegative) {
        for (const tag of tags) {
          const k = `${r.user_id}|${tag}`;
          const cur = tagAgg.get(k);
          if (cur) {
            cur.sumWeight += weight; cur.count++;
            if (ts > cur.latest) cur.latest = ts;
          } else {
            tagAgg.set(k, { userId: r.user_id, tag, sumWeight: weight, count: 1, latest: ts });
          }
        }
      }
    }

    // 5. Apply aggregates with incremental averaging (same math as the old
    // sync path, but batched: read existing row, compute new score, upsert).
    const applyScore = (current: number, avgWeight: number, isNegative: boolean) =>
      isNegative
        ? Math.max(0, current - 30)
        : Math.min(100, Math.max(0, current * 0.7 + avgWeight * 0.3));

    // Categories
    for (const agg of categoryAgg.values()) {
      const avgW = agg.sumWeight / agg.count;
      const { data: existing } = await supabase
        .from("user_category_preferences")
        .select("id, score, interaction_count")
        .eq("user_id", agg.userId)
        .eq("category", agg.category)
        .maybeSingle();
      if (existing) {
        await supabase.from("user_category_preferences").update({
          score: applyScore(Number(existing.score) || 0, avgW, agg.isNegative),
          interaction_count: (existing.interaction_count || 0) + agg.count,
          last_interaction: agg.latest,
        }).eq("id", existing.id);
      } else {
        await supabase.from("user_category_preferences").insert({
          user_id: agg.userId,
          category: agg.category,
          score: agg.isNegative ? 0 : Math.min(100, Math.max(0, avgW)),
          interaction_count: agg.count,
          last_interaction: agg.latest,
        });
      }
    }

    // Creators
    for (const agg of creatorAgg.values()) {
      const avgW = agg.sumWeight / agg.count;
      const { data: existing } = await supabase
        .from("user_creator_preferences")
        .select("id, score, interaction_count")
        .eq("user_id", agg.userId)
        .eq("creator_id", agg.creatorId)
        .maybeSingle();
      if (existing) {
        await supabase.from("user_creator_preferences").update({
          score: applyScore(Number(existing.score) || 0, avgW, agg.isNegative),
          interaction_count: (existing.interaction_count || 0) + agg.count,
          last_interaction: agg.latest,
        }).eq("id", existing.id);
      } else {
        await supabase.from("user_creator_preferences").insert({
          user_id: agg.userId,
          creator_id: agg.creatorId,
          score: agg.isNegative ? 0 : Math.min(100, Math.max(0, avgW)),
          interaction_count: agg.count,
          last_interaction: agg.latest,
        });
      }
    }

    // Day-of-week
    for (const agg of dayAgg.values()) {
      const avgW = agg.sumWeight / agg.count;
      const { data: existing } = await supabase
        .from("user_day_preferences")
        .select("id, score, interaction_count")
        .eq("user_id", agg.userId)
        .eq("day_of_week", agg.dow)
        .eq("category", agg.category)
        .maybeSingle();
      if (existing) {
        await supabase.from("user_day_preferences").update({
          score: applyScore(Number(existing.score) || 0, avgW, false),
          interaction_count: (existing.interaction_count || 0) + agg.count,
          last_interaction: agg.latest,
        }).eq("id", existing.id);
      } else {
        await supabase.from("user_day_preferences").insert({
          user_id: agg.userId,
          day_of_week: agg.dow,
          category: agg.category,
          score: Math.min(100, Math.max(0, avgW)),
          interaction_count: agg.count,
          last_interaction: agg.latest,
        });
      }
    }

    // Tags
    for (const agg of tagAgg.values()) {
      const avgW = agg.sumWeight / agg.count;
      const { data: existing } = await supabase
        .from("user_tag_preferences")
        .select("id, score, interaction_count")
        .eq("user_id", agg.userId)
        .eq("tag", agg.tag)
        .maybeSingle();
      if (existing) {
        await supabase.from("user_tag_preferences").update({
          score: applyScore(Number(existing.score) || 0, avgW, false),
          interaction_count: (existing.interaction_count || 0) + agg.count,
          last_interaction: agg.latest,
        }).eq("id", existing.id);
      } else {
        await supabase.from("user_tag_preferences").insert({
          user_id: agg.userId,
          tag: agg.tag,
          score: Math.min(100, Math.max(0, avgW)),
          interaction_count: agg.count,
          last_interaction: agg.latest,
        });
      }
    }

    // 6. Advance cursor
    const newCursor = (rows[rows.length - 1] as any).id as number;
    await supabase.from("worker_cursors").upsert({
      name: CURSOR_NAME,
      last_processed_id: newCursor,
      last_run_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        processed: rows.length,
        cursor: newCursor,
        categories: categoryAgg.size,
        creators: creatorAgg.size,
        days: dayAgg.size,
        tags: tagAgg.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[derive-preferences] error", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
