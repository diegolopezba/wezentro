-- Add payment_qr_url to events table for QR code payments
ALTER TABLE public.events 
ADD COLUMN payment_qr_url text;

-- Add payment tracking fields to guestlist_entries
ALTER TABLE public.guestlist_entries 
ADD COLUMN payment_status text DEFAULT 'none',
ADD COLUMN payment_confirmed_at timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.events.payment_qr_url IS 'URL of payment QR code image for in-app ticket payments';
COMMENT ON COLUMN public.guestlist_entries.payment_status IS 'Payment status: none, pending, confirmed, rejected';
COMMENT ON COLUMN public.guestlist_entries.payment_confirmed_at IS 'Timestamp when organizer confirmed payment';