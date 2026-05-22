## Problem

When publishing an event/post with a video, the upload XHR in `src/pages/Create.tsx` (`uploadMedia`) fails and only surfaces a generic "Error al subir". Three issues stack up:

1. **No `Content-Type` header.** Supabase Storage stores the object with the wrong MIME and can reject large binary bodies without a declared type.
2. **`POST` + `x-upsert`.** Supabase Storage expects `PUT` for upserts; `POST` to an existing path returns 409, and even fresh paths are sturdier with `PUT`.
3. **Opaque errors.** We never read `xhr.responseText`, so the real cause (size, auth, mime, RLS) is invisible to the user and to us in logs.

## Fix

Edit only `src/pages/Create.tsx` → `uploadMedia`:

- Switch the XHR to `PUT` (matches `x-upsert: true`).
- Set `Content-Type` to `file.type || "application/octet-stream"`.
- On non-2xx and on `error`, parse `xhr.responseText` and `reject(new Error(...))` with the real message; also `console.error` it so it shows in the runtime logs.
- Keep the existing progress tracking and the `getPublicUrl` resolution.

No backend, schema, or bucket changes — bucket already has no size/MIME limits.

## Verification

- Publish a post with a short video → upload completes and event opens.
- If it still fails, the toast will now show the real Storage error (e.g. payload size, auth) so we can iterate.
