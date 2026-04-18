
-- 1. REPORTS
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('event','post','comment','profile','message')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','hate_speech','nudity','violence','illegal','self_harm','impersonation','other')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','dismissed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid
);

CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX idx_reports_target ON public.reports(target_type, target_id);
CREATE UNIQUE INDEX idx_reports_unique_per_user
  ON public.reports(reporter_id, target_type, target_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. BLOCKED USERS
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create own blocks"
  ON public.blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can remove own blocks"
  ON public.blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- Helper function: is there a block in either direction between viewer and target?
CREATE OR REPLACE FUNCTION public.is_blocked(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = _viewer AND blocked_id = _target)
       OR (blocker_id = _target AND blocked_id = _viewer)
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) TO authenticated;

-- 3. EULA ACCEPTANCES (Apple Guideline 1.2)
CREATE TABLE public.eula_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  version text NOT NULL DEFAULT '1.0'
);

ALTER TABLE public.eula_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own EULA acceptance"
  ON public.eula_acceptances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record own EULA acceptance"
  ON public.eula_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);
