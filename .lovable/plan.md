

## Plan: Auto-show first 2 replies, "Ver más" for 3+

### Current behavior
All replies are hidden behind a "Ver N respuestas" toggle, regardless of count.

### New behavior
- **1–2 replies**: Show them inline automatically (no toggle needed)
- **3+ replies**: Show the first 2 inline, then a "Ver N más respuestas" button to expand the rest

### Changes — `src/components/events/CommentItem.tsx`

1. **Always fetch replies** when `replyCount > 0` (remove the `showReplies &&` guard from `useCommentReplies`)
2. **Auto-display first 2 replies** directly below the comment
3. **"Ver más" toggle** only appears when `replyCount > 2`:
   - Collapsed: shows "Ver {replyCount - 2} respuestas más"
   - Expanded: shows all remaining replies + "Ocultar respuestas"
4. Remove the current toggle that shows for any `replyCount > 0`

### Logic summary
```text
if replyCount == 0 → nothing
if replyCount <= 2 → render all replies inline, no toggle
if replyCount > 2  → render first 2 inline
                    → "Ver N más" button toggles the rest
```

Single file change, no database or hook changes needed.

