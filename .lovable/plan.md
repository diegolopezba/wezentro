## Views badge — current state

The eye-icon badge already renders on profile timeline cards (`TimelineCard`, bottom-right, black/30 pill with `Eye` icon + `formatCount(viewCount)`), and it is intentionally **not** rendered on feed cards (`EventCard`). This matches the requested TikTok/IG-Reels behavior: public count visible on the profile grid, hidden in the main feed.

Now that the previous step wired impression tracking into both the feed and profiles, the badge will start filling in with real numbers on profile cards.

## What I'll do

Nothing — no code change needed. The badge is already in place on `TimelineCard` and absent from `EventCard`, exactly as requested.

If after a refresh you still see `0`/no badge on profile cards, the cause will be one of:
1. `viewCount` isn't being passed into `TimelineCard` from the profile data hook.
2. The `get_event_card_counts` RPC isn't including `impression` rows in its sum.

If that happens, tell me and I'll open a follow-up plan to trace `viewCount` from query → card.
