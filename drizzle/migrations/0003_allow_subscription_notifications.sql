ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'follow','guestlist_request','guestlist_approved','guestlist_rejected','guestlist_invitation',
  'repost','collaboration_request','collaboration_accepted','referral_signup','new_reservation',
  'reservation_cancelled','reservation_tagged','post_tag','like','comment','secret_location_changed',
  'business_cta_request','business_cta_accepted','business_cta_declined','business_cta_revoked',
  'subscription_activated','subscription_renewal','subscription_expired'
]));

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_entity_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_entity_type_check CHECK (entity_type = ANY (ARRAY[
  'event','user','chat','reservation','subscription'
]));