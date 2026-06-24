/**
 * Client-side impression queue. Mirrors TikTok/Pinterest SDK behavior:
 * buffer events in memory + localStorage, flush every 15s OR at 50 events
 * OR when the tab is hidden / unloaded.
 *
 * Persistence: localStorage daily-key dedupe prevents counting the same
 * event again across page reloads or tab restores within the same day.
 */

import { supabase } from "@/integrations/supabase/client";

type QueuedType = "impression" | "view";

interface QueuedEvent {
  eventId: string;
  type: QueuedType;
}

const FLUSH_INTERVAL_MS = 15_000;
const FLUSH_THRESHOLD = 50;
const STORAGE_KEY = "zentro_impression_queue_v1";
const SEEN_KEY = "zentro_impression_seen_v1"; // { date: 'YYYY-MM-DD', keys: [...] }
const SEEN_MAX = 2000;

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

const today = () => new Date().toISOString().slice(0, 10);

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
    // ignore quota errors
  }
}

const seen = typeof window !== "undefined" ? loadSeen() : new Set<string>();

function loadQueue(): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}

function persistQueue() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

async function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;

  const batch = queue.splice(0, FLUSH_THRESHOLD);
  persistQueue();

  try {
    await supabase.functions.invoke("ingest-impressions", {
      body: { events: batch },
    });
  } catch (err) {
    // Best-effort; drop the batch rather than retry-storm.
    console.warn("[impressionQueue] flush failed", err);
  }

  // If more queued, schedule another flush soon.
  if (queue.length > 0) scheduleFlush(0);
}

function scheduleFlush(delay = FLUSH_INTERVAL_MS) {
  if (timer) return;
  timer = setTimeout(flush, delay);
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Restore anything from a previous session
  queue = loadQueue();
  if (queue.length > 0) scheduleFlush(0);

  // Flush on tab hide / unload (most accurate point at which a user
  // session truly ends in a SPA / mobile webview).
  const onHide = () => {
    if (queue.length === 0) return;
    // Best-effort beacon-style flush. supabase-js still uses fetch, so
    // accept that some events may be dropped on hard unload.
    void flush();
  };
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") onHide();
  });
  window.addEventListener("pagehide", onHide);
}

export function enqueueImpression(eventId: string, type: QueuedType = "impression") {
  if (!eventId) return;
  init();

  const dedupKey = `${type}:${eventId}`;
  if (seen.has(dedupKey)) return;
  seen.add(dedupKey);
  saveSeen(seen);

  queue.push({ eventId, type });
  persistQueue();

  if (queue.length >= FLUSH_THRESHOLD) {
    void flush();
  } else {
    scheduleFlush();
  }
}
