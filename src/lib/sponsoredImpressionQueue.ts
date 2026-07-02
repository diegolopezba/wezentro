/**
 * Client-side batching queue for sponsored-ad impressions.
 *
 * Instagram/TikTok/Pinterest all aggregate ad telemetry client-side and
 * flush in a single request every few seconds. That collapses N individual
 * "impressions = impressions + 1" UPDATEs into ONE grouped SQL statement
 * per flush cycle, which is exactly what our cost problem needs.
 *
 * Contract:
 *   - `queueSponsoredImpression(postId)` is fire-and-forget (idempotent
 *     per (post, day) via localStorage — same viewer cannot pay-per-impress
 *     twice in a day, matching the pre-batch RPC's implicit dedupe from
 *     UI-level guards).
 *   - Flushes every 15s, at 25 queued events, or on tab hide / unload.
 *   - Groups by post_id so the DB sees one UPDATE per campaign.
 */

import { supabase } from "@/integrations/supabase/client";

const FLUSH_INTERVAL_MS = 15_000;
const FLUSH_THRESHOLD = 25;
const STORAGE_KEY = "zentro_sponsored_imp_queue_v1";
const SEEN_KEY = "zentro_sponsored_imp_seen_v1";
const SEEN_MAX = 500;

const today = () => new Date().toISOString().slice(0, 10);

let queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

// ---------- persistence ----------

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { date: string; keys: string[] };
    if (parsed.date !== today()) return new Set();
    return new Set(parsed.keys);
  } catch {
    return new Set();
  }
}

function saveSeen(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const arr = Array.from(set);
    const trimmed = arr.length > SEEN_MAX ? arr.slice(-SEEN_MAX) : arr;
    window.localStorage.setItem(
      SEEN_KEY,
      JSON.stringify({ date: today(), keys: trimmed }),
    );
  } catch {
    /* quota — ignore */
  }
}

const seen = typeof window !== "undefined" ? loadSeen() : new Set<string>();

function loadQueue(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persistQueue() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

// ---------- flush ----------

async function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;

  // Group by post_id so the DB does one UPDATE per campaign.
  const counts = new Map<string, number>();
  for (const id of queue) counts.set(id, (counts.get(id) ?? 0) + 1);
  const payload = Array.from(counts.entries()).map(([post_id, count]) => ({
    post_id,
    count,
  }));

  // Optimistically clear so new events during the round-trip aren't lost.
  queue = [];
  persistQueue();

  try {
    const { error } = await supabase.rpc(
      "increment_sponsored_impressions_batch" as any,
      { _counts: payload },
    );
    if (error) throw error;
  } catch (err) {
    // Requeue on failure — keeps at-least-once semantics.
    console.warn("[sponsored-imp-queue] flush failed, requeuing", err);
    queue = queue.concat(
      payload.flatMap((p) => Array(p.count).fill(p.post_id)),
    );
    persistQueue();
  }
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

// ---------- init ----------

function initOnce() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Restore any events left over from a previous session.
  queue = loadQueue();
  if (queue.length > 0) scheduleFlush();

  // Fire on tab hide / unload so we don't lose in-flight events.
  const emergencyFlush = () => {
    if (queue.length === 0) return;
    // sendBeacon-style: fire the RPC without awaiting.
    void flush();
  };
  window.addEventListener("pagehide", emergencyFlush);
  window.addEventListener("beforeunload", emergencyFlush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") emergencyFlush();
  });
}

// ---------- public API ----------

export function queueSponsoredImpression(postId: string) {
  if (!postId || typeof window === "undefined") return;
  initOnce();

  // Same-day dedupe — a given ad only counts once per viewer per day.
  const key = `${postId}|${today()}`;
  if (seen.has(key)) return;
  seen.add(key);
  saveSeen(seen);

  queue.push(postId);
  persistQueue();

  if (queue.length >= FLUSH_THRESHOLD) {
    void flush();
  } else {
    scheduleFlush();
  }
}
