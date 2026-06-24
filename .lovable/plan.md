
# Better Home Feed — V7 "Quality-First"

## The problem (what you're seeing)

Right now a brand-new post with **zero likes, zero attendees, zero relevance to you** can outrank a popular post from yesterday. Two real causes:

### 1. Recency dominates posts (30%)
A fresh post gets `recency=100 × 0.30 = 30 pts` for free, before any quality signal is measured. A 1-day-old post with lots of likes loses that head start. The current weights reward "newest" more than "best" — the opposite of what Instagram/TikTok/Pinterest do.

### 2. Our trending signal is broken
We recently routed likes/saves/joins through a new `interaction_events_log` table. But the trending score (`refresh_trending_scores_cache`) still reads from the old `event_interactions` table, which barely receives writes anymore. So **almost every post has `trending=0` right now**, which is why the trending+velocity weights aren't doing their job and recency wins everything.

### 3. No engagement-rate floor
TikTok/IG/Pinterest demote content that's been shown a lot but no one engages with it (low CTR = bad content). We have impression counts in `event_stats` but never compare them to likes/saves. A post with 200 impressions and 0 likes should sink, not float.

## The fix — V7 weight & signal overhaul

### Server changes (`assemble-for-you-slate` + `feedScoring.ts` mirror)

**New POST weights — virality-first instead of recency-first:**

```text
                V6 (now)   V7 (proposed)
  trending        12%   →   22%   ← quality dominates
  engagement       0%   →   12%   ← NEW: likes+saves vs impressions
  recency         30%   →   14%   ← still matters, no longer king
  friends         14%   →   12%
  learned         10%   →    8%
  interest        10%   →    8%
  velocity         6%   →    8%   ← early burst still rewarded
  descTags         8%   →    6%
  collaborative    6%   →    5%
  socialProof      2%   →    3%
  proximity        2%   →    2%
  quality penalty               ← multiplicative, see below
```

**New EVENT weights — small rebalance toward quality:**

```text
  popularity       7%   →  10%
  trending         9%   →  14%
  engagement       0%   →   8%   ← NEW
  friends         14%   →  12%
  proximity       12%   →  10%
  (others trimmed proportionally)
```

**New signals introduced**

1. **`engagementScore`** — uses `event_stats` we already denormalize:
   ```
   ratio = (likes + 2*saves + 3*joins) / max(impressions, 20)
   ```
   Floor of 20 impressions prevents tiny-sample noise. Scored 0–100.

2. **Quality multiplier (penalty)** — applied to the final composite:
   - Post with ≥50 impressions and 0 likes/saves/joins → ×0.55
   - Post with ≥100 impressions and engagement ratio < 1% → ×0.7
   - Otherwise → ×1.0
   This is exactly the "dead content sinks" rule IG/TikTok use.

3. **Cold-start exemption** — posts <6h old with <20 impressions skip the penalty so brand-new content gets a fair shot (the recency score still rewards them, just less than before).

### Fix the broken trending signal

The trending cache must read from the live signal stores, not the dead `event_interactions` table.

Rewrite `refresh_trending_scores_cache` to union from the actual source-of-truth tables:
- `event_likes` (last 24h) — weight 3
- `saved_events` (last 24h) — weight 5
- `guestlist_entries` (joined last 24h, status=approved) — weight 5
- `reposts` (last 24h) — weight 3
- `interaction_events_log` where `signal_type='click'` (last 24h) — weight 1

Velocity (2h window) uses the same tables filtered to the last 2 hours.

This restores trending to its V6 strength **and** keeps it accurate going forward as we phase out `event_interactions` writes.

### Diversity guardrail (creator de-duplication)

Right now a single creator can occupy 3–4 consecutive cards at the top. Add a soft constraint in the ranker:
- After sorting, walk the list and push any item to position +3 if the previous 2 cards share its `creator_id`.
- Pinterest/IG do this exactly; it costs nothing and stops "feed monopolization."

## Technical details

**Files changed**

- `supabase/migrations/<new>.sql` — replace `refresh_trending_scores_cache` body with the union-from-source-tables version. No schema change, function-body only.
- `supabase/functions/assemble-for-you-slate/index.ts` — new weights, `engagementScore`, quality multiplier, creator de-dup pass. Add `like_count, save_count, attendee_count, impression_count` to the candidate projection (read from `event_stats` + a small join).
- `src/lib/feedScoring.ts` — mirror the V7 weights/penalty so client-side scoring used by `useFollowingEventsScored` and `useRelatedEvents` stays in lockstep.
- `supabase/migrations/<new2>.sql` — extend `get_for_you_events` RPC to return `like_count`, `save_count`, `impression_count` from `event_stats` so the edge function doesn't need an extra query.

**Determinism preserved** — the per-seed jitter (`hashJitter`) stays, so pagination remains stable within a session.

**No client-visible breakage** — same response shape, same card components, only ordering changes.

## What you'll notice

- Posts with real engagement (likes/saves/attendees) move up.
- Brand-new posts still appear, but only in the top section if they're also relevant to you; otherwise they're spaced out.
- Posts with lots of impressions but no engagement sink (the "I don't like this and no one else does either" cases).
- Same creator stops dominating consecutive slots.

## Out of scope

- No ML model / embeddings (still rule-based, runs in <50ms).
- No changes to "Siguiendo" tab logic, sponsored slot positions, or ad targeting.
- Not touching impressions/likes write paths — we already cleaned those up.
