## Problem

The upload now reaches Storage and returns a clear error: `400: new row violates row-level security policy`.

The INSERT policy on `storage.objects` for the `event-images` bucket only allows these extensions:

`jpg, jpeg, png, webp, gif`

Videos (`mp4`, `mov`, `webm`, etc.) are rejected by RLS — that's why image posts work but video posts fail.

## Fix

Update the INSERT policy on `storage.objects` to also allow common video extensions, while keeping the bucket scoped and requiring the user to be authenticated.

New allowlist: `jpg, jpeg, png, webp, gif, mp4, mov, webm, m4v, quicktime`.

Migration (single statement):

```sql
DROP POLICY "Authenticated users can upload event images" ON storage.objects;

CREATE POLICY "Authenticated users can upload event media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-images'
  AND lower(storage.extension(name)) = ANY (ARRAY[
    'jpg','jpeg','png','webp','gif',
    'mp4','mov','webm','m4v'
  ])
);
```

No code changes in `Create.tsx` — the earlier PUT/Content-Type fix stays.

## Verification

Publish a post with a short `.mp4` video → upload succeeds, event opens with the video playing.
