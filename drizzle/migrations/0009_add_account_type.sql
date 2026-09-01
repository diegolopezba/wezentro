ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'personal';

UPDATE public.profiles SET account_type = 'business' WHERE is_business = true AND account_type <> 'business';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_business BOOLEAN := COALESCE((NEW.raw_user_meta_data->>'account_type') = 'business', false);
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, account_type, is_business)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN _is_business THEN 'business' ELSE 'personal' END,
    _is_business
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;