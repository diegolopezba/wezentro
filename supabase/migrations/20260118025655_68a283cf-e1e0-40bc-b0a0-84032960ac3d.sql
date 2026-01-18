-- Make start_datetime nullable to support posts (photos without date/time)
ALTER TABLE public.events ALTER COLUMN start_datetime DROP NOT NULL;

-- Add is_post column to distinguish posts from events
ALTER TABLE public.events ADD COLUMN is_post BOOLEAN DEFAULT false;

-- Migrate existing profile_photos to events table as posts
INSERT INTO public.events (creator_id, image_url, is_public, is_post, created_at)
SELECT user_id, photo_url, true, true, COALESCE(created_at, now())
FROM public.profile_photos;

-- Update RLS policy to include posts in public events viewable by everyone
-- (existing policy already covers this since is_public = true)