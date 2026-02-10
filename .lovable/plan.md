

# Add Guest Tagging to Reservations

## Overview
Allow the user making a reservation to tag other users (friends) who are joining. Tagged users will receive a notification about the reservation, and the restaurant will see who's been tagged alongside each booking.

## What Changes

### 1. Database: New `reservation_guests` Table

A new join table to link tagged users to a reservation:
- `id` (UUID, primary key)
- `reservation_id` (UUID, references reservations)
- `user_id` (UUID, references profiles -- the tagged guest)
- `created_at` (TIMESTAMPTZ)

**RLS Policies:**
- The reservation owner can INSERT guests (they created the reservation)
- The reservation owner and the business can SELECT guests
- Tagged guests themselves can SELECT (so they can see their own tagged reservations)
- The reservation owner can DELETE guests (untag)

**Notification trigger:** When a guest is tagged, a notification is created for them: "@username te incluyó en una reserva en [business] el DD/MM"

### 2. ReservationSheet -- Add Tagging UI

Between the party size and notes sections, add a "Invitados" (Guests) section:
- A search input that queries mutual followers (reusing the existing `useMutualFollowers` hook)
- Tappable user chips showing selected guests with an X to remove
- Each selected user shown with avatar and username
- Tagged users are stored locally, then inserted into `reservation_guests` after the reservation is created

### 3. useReservations Hook -- Updated

- `useCreateReservation` mutation updated to also insert tagged guest IDs into `reservation_guests` after creating the reservation, and send push notifications to tagged users
- New `useReservationGuests(reservationId)` query to fetch tagged guests for a reservation

### 4. ReservationsManagementSheet -- Show Tagged Guests

Each reservation card will show tagged guest avatars below the party size info, so the restaurant can see who else is coming.

### 5. Notifications

- Tagged guests receive: "@username te incluyó en una reserva en [business] el DD/MM"
- Push notification sent to all tagged users

---

## Technical Details

### Database Migration

```text
CREATE TABLE public.reservation_guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reservation_id, user_id)
);

ALTER TABLE public.reservation_guests ENABLE ROW LEVEL SECURITY;

-- Reservation owner can see guests
CREATE POLICY "Reservation owner can view guests"
  ON public.reservation_guests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM reservations r WHERE r.id = reservation_id AND r.user_id = auth.uid())
  );

-- Business can see guests
CREATE POLICY "Business can view reservation guests"
  ON public.reservation_guests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM reservations r WHERE r.id = reservation_id AND r.business_id = auth.uid())
  );

-- Tagged user can see their own entry
CREATE POLICY "Tagged users can view own guest entry"
  ON public.reservation_guests FOR SELECT
  USING (auth.uid() = user_id);

-- Reservation owner can add guests
CREATE POLICY "Reservation owner can add guests"
  ON public.reservation_guests FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM reservations r WHERE r.id = reservation_id AND r.user_id = auth.uid())
  );

-- Reservation owner can remove guests
CREATE POLICY "Reservation owner can remove guests"
  ON public.reservation_guests FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM reservations r WHERE r.id = reservation_id AND r.user_id = auth.uid())
  );

-- Trigger: notify tagged guests
CREATE OR REPLACE FUNCTION public.handle_reservation_guest_tagged()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  reserver_username TEXT;
  business_name TEXT;
  formatted_date TEXT;
  res RECORD;
BEGIN
  SELECT r.*, p_biz.full_name AS biz_name, p_biz.username AS biz_username
  INTO res
  FROM reservations r
  JOIN profiles p_biz ON p_biz.id = r.business_id
  WHERE r.id = NEW.reservation_id;

  SELECT username INTO reserver_username FROM profiles WHERE id = res.user_id;
  formatted_date := to_char(res.reservation_date, 'DD/MM');

  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    NEW.user_id,
    'reservation_tagged',
    'Reserva',
    '@' || reserver_username || ' te incluyó en una reserva en ' || COALESCE(res.biz_name, res.biz_username) || ' el ' || formatted_date,
    'reservation',
    NEW.reservation_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_reservation_guest_tagged
  AFTER INSERT ON public.reservation_guests
  FOR EACH ROW EXECUTE FUNCTION public.handle_reservation_guest_tagged();
```

### Files to Modify

- **`src/hooks/useReservations.ts`** -- Add `tagged_user_ids` to `CreateReservationParams`, insert into `reservation_guests` after creating reservation, add `useReservationGuests` hook
- **`src/components/reservations/ReservationSheet.tsx`** -- Add guest tagging UI section with mutual followers search and selected user chips
- **`src/components/reservations/ReservationsManagementSheet.tsx`** -- Fetch and display tagged guest avatars on each reservation card
- **`src/integrations/supabase/types.ts`** -- Will auto-update with new table types
