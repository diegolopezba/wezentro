/**
 * Promoter attribution helpers.
 *
 * Captures a `?p=<code>` query param when a visitor lands on an event page,
 * stores it in localStorage for 7 days, and lets conversion flows
 * (ticket purchase, guestlist join) look up the attributed promoter id.
 */
import { supabase } from "@/integrations/supabase/client";

const TTL_DAYS = 7;
const KEY_PREFIX = "zentro_attr_";
const FP_KEY = "zentro_fp";

interface AttributionRecord {
  promoterId: string;
  code: string;
  ts: number;
}

const storageKey = (eventId: string) => `${KEY_PREFIX}${eventId}`;

const getFingerprint = (): string => {
  try {
    let fp = localStorage.getItem(FP_KEY);
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem(FP_KEY, fp);
    }
    return fp;
  } catch {
    return "anon";
  }
};

/**
 * Read attribution stored for this event, if still within TTL.
 * Returns the promoter id or null.
 */
export const getAttribution = (eventId: string): string | null => {
  try {
    const raw = localStorage.getItem(storageKey(eventId));
    if (!raw) return null;
    const rec = JSON.parse(raw) as AttributionRecord;
    const ageMs = Date.now() - rec.ts;
    if (ageMs > TTL_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(storageKey(eventId));
      return null;
    }
    return rec.promoterId;
  } catch {
    return null;
  }
};

/**
 * Read `?p=<code>` from the URL, resolve it to a promoter id via RPC,
 * persist for 7 days, and log a (deduped) click.
 * Safe to call on every EventDetail mount — does nothing when no code present.
 */
export const captureFromUrl = async (eventId: string, search: string): Promise<void> => {
  try {
    const params = new URLSearchParams(search);
    const code = params.get("p");
    if (!code || !eventId) return;

    const { data: promoterId, error } = await supabase.rpc("resolve_promoter", {
      _event_id: eventId,
      _code: code,
    });
    if (error || !promoterId) return;

    const rec: AttributionRecord = {
      promoterId: promoterId as string,
      code,
      ts: Date.now(),
    };
    localStorage.setItem(storageKey(eventId), JSON.stringify(rec));

    // Fire-and-forget click log (deduped server-side per day)
    supabase
      .rpc("log_promoter_click", {
        _promoter_id: promoterId as string,
        _fingerprint: getFingerprint(),
      })
      .then(() => {}, () => {});
  } catch {
    // never break the page
  }
};

/** Build a shareable URL for a promoter. */
export const buildPromoterLink = (eventId: string, shortCode: string): string => {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://zentro.today";
  return `${origin}/event/${eventId}?p=${shortCode}`;
};
