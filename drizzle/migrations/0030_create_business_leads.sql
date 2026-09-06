CREATE TABLE public.business_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_kind TEXT NOT NULL DEFAULT 'events',
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'landing',
  locale TEXT NOT NULL DEFAULT 'es',
  status TEXT NOT NULL DEFAULT 'new',
  CONSTRAINT business_leads_full_name_len CHECK (char_length(full_name) BETWEEN 1 AND 120),
  CONSTRAINT business_leads_business_name_len CHECK (char_length(business_name) BETWEEN 1 AND 120),
  CONSTRAINT business_leads_phone_len CHECK (char_length(phone) BETWEEN 5 AND 40),
  CONSTRAINT business_leads_email_len CHECK (email IS NULL OR char_length(email) <= 255),
  CONSTRAINT business_leads_message_len CHECK (message IS NULL OR char_length(message) <= 1000),
  CONSTRAINT business_leads_kind_valid CHECK (business_kind IN ('events','restaurant','experiences','other')),
  CONSTRAINT business_leads_status_valid CHECK (status IN ('new','contacted','won','lost'))
);

GRANT INSERT ON public.business_leads TO anon;
GRANT INSERT ON public.business_leads TO authenticated;
GRANT ALL ON public.business_leads TO service_role;

ALTER TABLE public.business_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a business lead"
  ON public.business_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read business leads"
  ON public.business_leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update business leads"
  ON public.business_leads FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX business_leads_created_at_idx ON public.business_leads (created_at DESC);