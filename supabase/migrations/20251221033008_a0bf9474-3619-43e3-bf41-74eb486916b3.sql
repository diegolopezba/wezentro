-- Drop the existing constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with all notification types
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'follow'::text, 
  'invite'::text, 
  'guestlist'::text, 
  'reminder'::text, 
  'message'::text, 
  'system'::text,
  'guestlist_invitation'::text,
  'guestlist_request'::text,
  'guestlist_approved'::text,
  'guestlist_rejected'::text
]));