## Remove + button from ChatDetail input area

### What
Remove the "+" (event invite) button from the chat input bar in `ChatDetail.tsx` while keeping the `handleSendEventInvite` function and `EventPickerModal` intact for future use.

### Changes
1. **src/pages/ChatDetail.tsx**
   - Remove `Plus` from the `lucide-react` import
   - Delete the `<Button>` element with the `Plus` icon (lines 234–241) from the input area
   - Keep `eventPickerOpen`, `setEventPickerOpen`, `handleSendEventInvite`, and `<EventPickerModal>` untouched

### What stays
- The `EventPickerModal` component remains in the file, mounted at the bottom.
- The `handleSendEventInvite` callback remains available.
- All state for the modal (`eventPickerOpen`, `setEventPickerOpen`) remains.

This is a single-file, two-line surgical edit.