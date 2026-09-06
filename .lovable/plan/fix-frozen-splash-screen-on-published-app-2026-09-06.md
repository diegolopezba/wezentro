# Fix frozen splash screen on published app

## Diagnosis (confirmed)
- The published bundle at zentro.today contains **no Supabase/backend URL** — it was built while `.env` was missing, so `VITE_SUPABASE_URL` was baked in as `undefined` and the app crashes on startup, leaving the splash screen frozen.
- The local `.env` file was never deleted from the project (it still exists with all 3 `VITE_SUPABASE_*` values — we only stopped tracking it in git). So this is purely a stale publish.

## Fix
1. **Republish the app.** The publish build now reads the restored `.env` and bakes in the correct backend URL and key. No code changes needed.
2. **Verify after publish** by fetching the published bundle and confirming it contains the backend URL, and loading zentro.today on desktop + mobile viewport to confirm the splash clears and the feed loads.
3. **Guard for the future:** add a small startup check in `src/main.tsx` that, if the backend URL is missing, removes the splash and shows a clear "configuration error" message instead of freezing silently (prevents this exact symptom from being invisible again).

## Notes
- No changes to `.env` contents — the values are correct and must stay as-is (they are public/anon values, safe to ship in the bundle).
- Preview in the editor is unaffected (dev server reads the local `.env`).
