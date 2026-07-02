## What I found

I pulled 24h of DB stats + slow-query stats + cron history. The problem is **not user traffic** — it's **background write amplification**. Even with ~0 sessions, we're generating tens of thousands of writes/hour because our own jobs and hot-path inserts are misbehaving.

Top offenders in the last ~24h:

| Table | Writes | Cause |
|---|---|---|
| `trending_scores_cache` | 174,516 ins + 174,516 del | `refresh_trending_scores_cache` runs every 15 min and **TRUNCATE+re-INSERTs every row**. |
| `event_interactions` | 42,377 inserts | Still receiving direct inserts despite our "queue only" refactor. |
| `user_creator_preferences` | 30,670 UPDATEs | `derive-preferences` cron does **one UPDATE per (user, creator)** every 15 min. |
| `user_tag/category/day_preferences` | ~33,000 UPDATEs | Same N+1 pattern from `derive-preferences`. |
| `net.http_request_queue` | 27,535 inserts | pg_net queue churn from crons + webhooks. |
| `web_vitals` | 14,193 inserts | 6,903 pgrst calls for a supposedly 10%-sampled metric — not actually sampled, or sampling only in one entrypoint. |
| `sponsored_posts` | 3,296 UPDATEs on ~4 rows | Lifecycle cron re-touches every row every 15 min. |
| `sponsored_daily_spend` | 2,549 UPDATEs on 78 rows | Same. |
| `cron.job_run_details` | 141,956 UPDATEs | Every cron heartbeat writes here. |

WAL is 304MB on a 992MB DB — ~30% of the disk is write-log bloat from these churny updates. Rolled-back transactions since boot: **735,832** — likely retries on the `event_interactions` inserts that hit the type CHECK constraint before we widened it. That churn is billed as compute too.

## What Instagram / Pinterest / TikTok do (and we don't)

1. **Trending / feed rankings**: kept in **Redis / Memcached** (or a materialized view refreshed `CONCURRENTLY`) — never TRUNCATE+INSERT into a hot table. Pinterest's Pixie/Terrapin serve rankings from an in-memory KV; the DB never sees the churn.
2. **Preference derivation**: runs as a **stream job (Kafka → Flink)** that emits ONE bulk upsert per user, not per (user, creator) pair. Cadence is **hourly or daily**, not every 15 min. Pinterest's user embeddings refresh nightly.
3. **Metrics (Web Vitals, impressions)**: heavy sampling (**1% for RUM, 10% for impressions on cold users**), and shipped to a **cold analytics store** (Snowflake / BigQuery), never OLTP.
4. **Ad lifecycle**: event-driven (state machine flips only when balance / date crosses a threshold) — not "touch every row every 15 min".
5. **Adaptive cadence**: if DAU on a shard = 0, the workers **skip entirely**. IG "sleeps" cold shards.

## Plan (4 phases, biggest wins first)

### Phase 1 — kill idle-time write amplification (biggest $/effort)

1. **`refresh_trending_scores_cache`**: rewrite the RPC to `INSERT … ON CONFLICT DO UPDATE` only rows whose score changed by more than a threshold (or use `MERGE`). Drop cadence to **every 60 min** (from 15). Skip entirely when there were 0 impressions in the last hour.
2. **`derive-preferences`**: 
   - Skip run when `interaction_events_log` has 0 new rows since last watermark (currently the function runs unconditionally).
   - Replace per-row UPDATE with **one `INSERT … ON CONFLICT DO UPDATE`** per preference table (batched by unnest). Cuts 30k statements → ~5.
   - Cadence: every 60 min instead of 15.
3. **`sponsored-posts-lifecycle`**: only UPDATE rows where a state transition actually applies (`WHERE status = 'active' AND end_at < now()` etc.). Cadence: every 60 min.
4. **`event_interactions` direct inserts**: audit and remove the 40k/day source. `menu_view` / `reserve_tap` still insert directly — route through `bump_event_stats` (denormalized counter) like impressions. Delete the `event_interactions` insert paths.
5. **Web Vitals**: enforce the 10% sample rate at the source (currently 6.9k inserts/24h with zero traffic means it's not sampling). Drop to 1% and cap at 100 events / session.

Expected result: **>85% reduction in daily write volume** and matching WAL/backup cost.

### Phase 2 — reduce cron heartbeat cost

6. Merge the 4 nightly cleanup crons into a **single nightly maintenance job** — one `job_run_details` row per night instead of four.
7. Add a `cleanup_cron_job_run_details` step that keeps only the last 7 days (currently unbounded — 141k rows).
8. Add a `pg_net._http_response` TTL (7 days).

### Phase 3 — adopt hot/cold split for analytics

9. Move `web_vitals` and raw `interaction_events_log` to a **rolling 7-day partitioned table**, drop old partitions with `DETACH+DROP` (O(1)), instead of `DELETE`ing rows nightly (which is what generates most WAL).
10. Long-term (not this phase, flag for later): ship raw analytics to a cold store; keep only aggregates in Postgres.

### Phase 4 — right-size the instance once writes drop

11. After Phase 1 lands, re-check `db_health`. If memory stays < 40% and disk < 25%, we're on an oversized instance and can downgrade in **Backend → Advanced settings → Instance size** for a further cost cut.

### Files/objects touched (Phase 1)

- `supabase/migrations/*` — rewrite `refresh_trending_scores_cache`, add bulk-upsert helpers for `user_*_preferences`.
- `supabase/functions/derive-preferences/index.ts` — batched upsert + watermark short-circuit + cron cadence.
- `supabase/functions/sponsored-posts-lifecycle/index.ts` — filtered update + cadence.
- `src/lib/analyticsTracking.ts` — route `trackMenuView`/`trackReserveTap` through the impression queue (or a similar `bump_event_stats` counter).
- `src/lib/webVitals.ts` — enforce sampling, cap per session.
- `cron.job` — update schedules for jobids 3, 7, 2.

### Verification

- Re-run `pg_stat_user_tables` after 24h; target: `event_interactions` inserts < 500/day, `trending_scores_cache` writes < 5k/day, `user_creator_preferences` updates < 2k/day.
- `db_health`: WAL should drop below 100MB within 48h after autovacuum catches up.
- Confirm `Cloud & AI balance` free-balance-used grows more slowly than the current $1.33/day.

Want me to proceed with Phase 1 first, or all four phases in sequence?
