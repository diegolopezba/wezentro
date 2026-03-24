
## Delete Collaboration Feature — Complete Removal Plan

### All collab touch points found across the codebase

| File | What to do |
|---|---|
| `src/components/events/CollaboratorPickerModal.tsx` | Delete entire file |
| `src/hooks/useEventCollaborators.ts` | Delete entire file |
| `src/components/notifications/CollaborationAcceptedNotificationItem.tsx` | Delete entire file |
| `src/pages/Create.tsx` | Remove collab imports, state (`showCollaboratorPicker`, `selectedCollaborator`), the post-save invite call (lines 290–295), the toast message branch referencing `selectedCollaborator`, the entire "Collaborator section" Card (lines 651–703), and the `<CollaboratorPickerModal>` render at the bottom |
| `src/pages/Notifications.tsx` | Remove `usePendingCollaborations`, `useRespondToCollaboration` imports; remove `CollaborationNotificationItem` component (lines 297–405); remove `CollaborationAcceptedNotificationItem` import; remove `UserPlus` from icon imports; remove the two `collaboration_*` cases from `getNotificationIcon`, `handleNotificationClick`, and `renderNotification` |

### What is NOT touched
- The `event_collaborators` database table and its RLS policies — left in place (no harm keeping it, no migration needed, avoids risk)
- `src/lib/feedScoring.ts` — the `getCollaborativeScore` function and `collaborativeBoosts` field in the scoring context are a separate algorithmic signal unrelated to the UI feature; leaving them keeps the feed scoring intact
- `src/hooks/useForYouEvents.ts` — the `collaborativeBoosts` query is a feed ranking input (measures mutual-follower attendance patterns), not the collaboration invitation UI; leaving it untouched

### Result
- 3 files deleted
- 2 files surgically cleaned
- No database migration required
- No broken imports remain
- Existing `collaboration_request` / `collaboration_accepted` notifications already in the database will fall through to the generic `NotificationItem` fallback renderer — they will display correctly as plain notifications with no broken UI
