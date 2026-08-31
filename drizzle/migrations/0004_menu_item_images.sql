ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url text;

-- Storage policies for the menu-images bucket: public read, owner-only write.
DROP POLICY IF EXISTS "Menu images are publicly readable" ON storage.objects;
CREATE POLICY "Menu images are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Owners can upload menu images" ON storage.objects;
CREATE POLICY "Owners can upload menu images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'menu-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','webp','gif'])
);

DROP POLICY IF EXISTS "Owners can update menu images" ON storage.objects;
CREATE POLICY "Owners can update menu images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owners can delete menu images" ON storage.objects;
CREATE POLICY "Owners can delete menu images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]);