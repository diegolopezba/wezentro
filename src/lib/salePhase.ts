/**
 * Sale phase helper for events that use the pre-sale waiting list.
 *
 * waitlist       → tickets not released yet, prices hidden, users can join the list
 * early_access   → released, but only waitlist members can buy for N hours
 * public         → anyone can buy
 */
export type SalePhase = "waitlist" | "early_access" | "public";

export interface WaitlistEventFields {
  waitlist_enabled?: boolean | null;
  sales_open_at?: string | null;
  waitlist_early_access_hours?: number | null;
  waitlist_capacity?: number | null;
  waitlist_released_at?: string | null;
}

export function getSalePhase(event: WaitlistEventFields | null | undefined, now: Date = new Date()): SalePhase {
  if (!event?.waitlist_enabled) return "public";

  const releasedAt = event.waitlist_released_at ? new Date(event.waitlist_released_at) : null;
  const scheduled = event.sales_open_at ? new Date(event.sales_open_at) : null;

  // Treat a passed schedule as released even before the cron catches up.
  const effectiveRelease =
    releasedAt && !isNaN(releasedAt.getTime())
      ? releasedAt
      : scheduled && !isNaN(scheduled.getTime()) && scheduled.getTime() <= now.getTime()
      ? scheduled
      : null;

  if (!effectiveRelease) return "waitlist";

  const hours = event.waitlist_early_access_hours ?? 0;
  if (hours > 0 && now.getTime() < effectiveRelease.getTime() + hours * 3600_000) {
    return "early_access";
  }
  return "public";
}

/** When the exclusive early-access window ends (null when there is none). */
export function earlyAccessEndsAt(event: WaitlistEventFields | null | undefined): Date | null {
  if (!event?.waitlist_enabled) return null;
  const hours = event.waitlist_early_access_hours ?? 0;
  if (hours <= 0) return null;
  const raw = event.waitlist_released_at || event.sales_open_at;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + hours * 3600_000);
}

/** Public sale start (end of early access, or the release moment). */
export function publicSaleStartsAt(event: WaitlistEventFields | null | undefined): Date | null {
  if (!event?.waitlist_enabled) return null;
  const raw = event.waitlist_released_at || event.sales_open_at;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return earlyAccessEndsAt(event) ?? d;
}
