
## Replace trash icon with a 3-dot dropdown menu on comments

### What changes
In `CommentsSheet.tsx`, replace the always-visible `<button><Trash2></button>` with a `DropdownMenu` (already in the project) triggered by a `MoreHorizontal` (⋯) icon. The dropdown contains a single "Eliminar comentario" item with a red destructive style. The 3-dot button is only rendered when `canDelete` is true — same logic as before.

### Visual result
```
[avatar] @username  comment text...   [⋯]   ← only shows when user can delete
                    2 hours ago
```
Tapping ⋯ opens a small dropdown with:
```
  🗑  Eliminar comentario   ← red text
```

### Files changed
| File | Change |
|---|---|
| `src/components/events/CommentsSheet.tsx` | Replace `Trash2` button with `DropdownMenu` + `MoreHorizontal` trigger + "Eliminar" item |

### Implementation detail
- Import `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` from `@/components/ui/dropdown-menu`
- Import `MoreHorizontal` and `Trash2` from `lucide-react`
- Wrap the existing `canDelete && <button>` block with the dropdown
- The `DropdownMenuContent` uses `align="end"` so it doesn't clip off-screen on the right
- The delete item calls `handleDelete(comment.id)` on click — same as before
- No database or hook changes needed
