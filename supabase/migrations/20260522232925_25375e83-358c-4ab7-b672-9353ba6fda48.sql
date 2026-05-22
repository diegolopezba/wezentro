DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;

CREATE POLICY "Authenticated users can upload event media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-images'
  AND lower(storage.extension(name)) = ANY (ARRAY[
    'jpg','jpeg','png','webp','gif',
    'mp4','mov','webm','m4v'
  ])
);