# Cost optimization plan: faithful in principle, pragmatic in stack

You asked whether my proposal was 100% how Instagram/TikTok/Pinterest do it. Honest answer: **the principles are theirs, the stack is yours.** They use Kafka + Flink + RocksDB + neural ranking at billion-user scale. Copying that literally would burn months and hundreds of dollars/month in infra for an app at your current scale — pure cargo-culting.

What we *can* copy 1:1 are the **architectural principles** behind their efficiency, using Postgres + PGMQ + Edge Functions (tools you already have).

## What we will copy from big tech

| Principle | Their tech | Our tech | Same outcome? |
|---|---|---|---|
| Append-only event log → async worker → derived store | Kafka → Flink → Cassandra | `pgmq.send()` → cron worker → tables | ✅ Yes |
| Drop low-signal events (scroll-past, sub-1s dwell) | Client SDK filter | Client filter | ✅ Yes |
| Batch "liked by me" reads | TAO `assoc_get` multi-get | `WHERE id = ANY($ids)` | ✅ Yes |
| Sampled RUM (1–10% of sessions) | Custom binary protocol | 10% JSON sample | ✅ Same intent |
| Push-based job execution | SQS / Kafka consumer | Postgres webhook + safety cron | ✅ Yes |
| Denormalized counters | Materialized counters in KV | `event_stats.view_count` column | ✅ Yes |
| Client-side event batching | TikTok SDK: 15s / 100 events | localStorage queue, same limits | ✅ Yes |

## What we will NOT copy (and why)

- **Kafka / Flink / RocksDB** — overkill below ~1M events/day. PGMQ handles 10k msg/s, which is ~100× your need.
- **Neural ranking (DLRM, two-tower)** — needs ML team, GPU inference, training pipeline. Your rule-based scoring is fine for now.
- **A/B testing framework** — premature; revisit when you have >10k DAU.

## Phased rollout

### Phase 1 — Stop the bleeding (do now, ~2 hours)
Biggest cost wins, lowest risk, no architectural changes.

1. **Email cron 5s → 1min** + add database webhook on `email_send_log` insert for instant transactional sends. Cuts ~17,000 wakeups/day → ~1,440.
2. **Trending cache 2min → 15min.** Cuts 720 refreshes/day → 96.
3. **Reservation reminders 5min → 15min.**
4. **Web Vitals: sample 10% of sessions, disable in dev/preview, daily TTL cleanup cron** (keep 30 days).
5. **Batch likes**: replace per-card `useEventLikes` exist-check with feed-level `WHERE event_id = ANY(ids)` in `useForYouEvents` / `useFollowingEventsScored`. Cuts ~180k queries/week → ~1k.

**Expected impact:** ~70% cost reduction within hours.

### Phase 2 — Async preference pipeline (next, ~4 hours)
Replaces the N+1 `trackPreferenceSignal` (3–5 table writes per interaction) with the big-tech pattern: write 1 raw event, derive scores async.

1. New table `interaction_events_log` (append-only, UNLOGGED, partitioned monthly, 90-day TTL).
2. New RPC `log_interaction(event_id, signal_type)` — single row insert, returns immediately.
3. Drop low-signal types entirely on the client: `view`, `dwell`, `scroll_past`, `hover` (Pinterest does this).
4. Edge function `derive-preferences` runs every 5 min: reads recent events, batches updates to `user_category_preferences` / `user_creator_preferences` / `user_tag_preferences` / `user_day_preferences` with exponential time decay.
5. Drop the existing synchronous `trackPreferenceSignal` round-trips.

**Expected impact:** preference writes 30k/week → ~2k/week.

### Phase 3 — Client-side impression batching (after Phase 2)
Replicates TikTok's SDK behavior exactly.

1. `localStorage` queue keyed by `eventId+date`, dedup at source.
2. Flush every 15s OR at 100 events OR on `visibilitychange=hidden`.
3. New edge function `ingest-impressions` accepts batches of ≤50, inserts into `event_interactions` with `ON CONFLICT DO NOTHING`.
4. Bump in-mount throttle from 30s to 5min.
5. Add denormalized `event_stats.view_count` counter (refreshed by Phase 2 worker), so feed reads stop aggregating from `event_interactions`.

**Expected impact:** impression writes 40k/week → ~3k/week.

### Phase 4 — Housekeeping & monitoring (after Phase 3)
1. Nightly cron: prune `event_interactions` of type `impression`/`view` older than 90 days.
2. Nightly cron: prune `web_vitals` older than 30 days.
3. Add cost dashboard query (saved in repo) so we can spot regressions early.

## Files touched

**Phase 1:**
- `supabase/migrations/` — 3 cron reschedules, web_vitals TTL cron, email webhook trigger
- `src/lib/webVitals.ts` — sampling + dev gate
- `src/hooks/useEventLikes.ts` — add batch hook
- `src/hooks/useForYouEvents.ts`, `useFollowingEventsScored.ts`, `useRelatedEvents.ts` — call batch hook, pass `likedSet` to cards
- `src/components/events/EventCard.tsx` / `TimelineCard.tsx` — accept `isLiked` prop, skip per-card hook

**Phase 2:**
- `supabase/migrations/` — `interaction_events_log` table + partitioning + `log_interaction` RPC
- `supabase/functions/derive-preferences/index.ts` — new
- `supabase/config.toml` — register function
- `src/lib/preferenceTracking.ts` — replace internals with single RPC call, drop low-signal handlers

**Phase 3:**
- `supabase/functions/ingest-impressions/index.ts` — new
- `supabase/migrations/` — `event_stats` table + counter refresh in Phase 2 worker
- `src/lib/analyticsTracking.ts` — localStorage queue + batch flush
- `src/hooks/useImpressionTracker.ts` — bump throttle

**Phase 4:**
- `supabase/migrations/` — 2 TTL crons
- `.lovable/cost-dashboard.sql` — saved monitoring query

## Honest expected impact

| Metric | Now (7d) | After Phase 1 | After all phases |
|---|---|---|---|
| Cron wakeups | ~125,000 | ~12,000 | ~12,000 |
| `event_interactions` writes | 40,678 | 40,678 | ~3,000 |
| Preference writes | 30,574 | 30,574 | ~2,000 |
| `event_likes` queries | 180,000+ | ~1,000 | ~1,000 |
| `web_vitals` writes | 14,000+ | ~1,400 | ~1,400 |
| Total DB writes/week | ~265k | ~90k | ~10k |

**Net: ~96% reduction in DB writes, ~90% reduction in cron CPU — without leaving the Supabase stack.**

I'll start with Phase 1 immediately on approval (highest ROI, lowest risk), then continue through Phase 4 unless you say otherwise.