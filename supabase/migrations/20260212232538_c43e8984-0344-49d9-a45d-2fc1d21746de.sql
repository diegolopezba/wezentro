
-- Add menu and reservations enabled toggles to profiles
ALTER TABLE public.profiles
ADD COLUMN menu_enabled boolean DEFAULT true,
ADD COLUMN reservations_enabled boolean DEFAULT true;
