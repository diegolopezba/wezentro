ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'follow', 'guestlist_request', 'guestlist_approved', 'guestlist_rejected',
  'guestlist_invitation', 'repost', 'collaboration_request', 'collaboration_accepted',
  'referral_signup', 'new_reservation', 'reservation_cancelled', 'reservation_tagged'
));