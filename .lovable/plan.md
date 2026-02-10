

# Reservation System for Zentro Places

## Overview
Add a table reservation feature for Zentro Places (food_premium) businesses. Users visiting a restaurant's profile will see a "Reservar" button that opens a bottom sheet where they can book a table by selecting date, time, party size, and adding notes.

## What Changes

### 1. Database: New Tables and Columns

**New `reservations` table:**
- `id` (UUID, primary key)
- `business_id` (UUID, references profiles.id -- the restaurant)
- `user_id` (UUID, references profiles.id -- the customer)
- `reservation_date` (DATE -- the date of the reservation)
- `reservation_time` (TIME -- the time of the reservation)
- `party_size` (INTEGER -- number of people)
- `notes` (TEXT, nullable -- special instructions from the customer)
- `status` (TEXT, default 'confirmed' -- confirmed / cancelled / completed)
- `cancelled_by` (TEXT, nullable -- 'user' or 'business', to track who cancelled)
- `created_at` (TIMESTAMPTZ, default now())
- `updated_at` (TIMESTAMPTZ, default now())

**New column on `profiles` table:**
- `reservation_capacity` (INTEGER, nullable) -- total seats/capacity the restaurant has available per time slot

**RLS Policies on `reservations`:**
- Users can SELECT their own reservations (`user_id = auth.uid()`)
- Business owners can SELECT reservations for their business (`business_id = auth.uid()`)
- Authenticated users can INSERT reservations (with `user_id = auth.uid()`)
- Users can UPDATE their own reservations (to cancel)
- Business owners can UPDATE reservations for their business (to cancel/complete)

**Notification trigger:** When a new reservation is created, a database trigger will insert a notification for the business owner, and when the business cancels/modifies, a notification goes to the customer.

**Realtime:** Enable realtime on the `reservations` table so both parties see updates instantly.

### 2. Profile Page Changes (UserProfile.tsx)

For food_premium profiles viewed by other users:
- Replace the "Mensaje" (Message) button with a "Reservar" (Reserve) button styled with an orange/restaurant theme
- Keep the existing Menu icon button
- The Message button moves to the header area (small icon) so users can still message

### 3. New Component: ReservationSheet

A bottom sheet (Drawer) with:
- **Date picker** -- calendar to select the reservation date (only future dates)
- **Time picker** -- select component with available time slots (based on business hours)
- **Party size** -- number input (1-20, capped by restaurant capacity)
- **Notes** -- text area for special instructions (allergies, celebrations, etc.)
- **Availability indicator** -- shows remaining capacity for the selected date/time
- **"Confirmar Reserva" button** -- submits the reservation

### 4. New Hook: useReservations

- `useCreateReservation()` -- mutation to insert a reservation, sends push notification to business
- `useUserReservations()` -- query to fetch current user's upcoming reservations
- `useBusinessReservations(businessId)` -- query for restaurant to see all their reservations
- `useCancelReservation()` -- mutation to cancel, notifies the other party
- `useAvailableCapacity(businessId, date, time)` -- query to check remaining spots

### 5. Restaurant-Side: Manage Reservations

**New component: ReservationsManagementSheet**
- Accessible from the restaurant's own Profile page (new "Reservas" button)
- Shows upcoming reservations grouped by date
- Each reservation card shows: customer name/avatar, party size, time, notes
- Actions: Message customer, Cancel reservation
- Filtering by date

### 6. Edit Profile: Capacity Setting

- Add a "Capacidad de reservas" field in the Edit Profile page (only for food_premium subscribers)
- Simple number input for total seats available per time slot

### 7. Notifications

- **New reservation:** Business gets notified "@username reservo una mesa para X personas el DD/MM"
- **Cancellation by user:** Business gets notified "@username cancelo su reserva del DD/MM"  
- **Cancellation by business:** User gets notified "Tu reserva en [business] del DD/MM fue cancelada"
- Push notifications sent for all of the above

---

## Technical Details

### Database Migration SQL

```text
-- New reservations table
CREATE TABLE public.reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 2,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  cancelled_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add capacity column to profiles
ALTER TABLE public.profiles ADD COLUMN reservation_capacity INTEGER;

-- RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Users see their own reservations
CREATE POLICY "Users can view own reservations"
  ON public.reservations FOR SELECT
  USING (auth.uid() = user_id);

-- Business owners see reservations at their place
CREATE POLICY "Business owners can view their reservations"
  ON public.reservations FOR SELECT
  USING (auth.uid() = business_id);

-- Authenticated users can create reservations
CREATE POLICY "Users can create reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update (cancel) their own reservations
CREATE POLICY "Users can update own reservations"
  ON public.reservations FOR UPDATE
  USING (auth.uid() = user_id);

-- Business can update reservations at their place
CREATE POLICY "Business can update their reservations"
  ON public.reservations FOR UPDATE
  USING (auth.uid() = business_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

-- Notification trigger for new reservations
CREATE OR REPLACE FUNCTION public.handle_new_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ ... $$;

-- Trigger for cancellations
CREATE OR REPLACE FUNCTION public.handle_reservation_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ ... $$;
```

### Files to Create
- `src/components/reservations/ReservationSheet.tsx` -- booking bottom sheet
- `src/components/reservations/ReservationsManagementSheet.tsx` -- restaurant management view
- `src/hooks/useReservations.ts` -- all reservation hooks

### Files to Modify
- `src/pages/UserProfile.tsx` -- add Reserve button, replace Message for food businesses
- `src/pages/Profile.tsx` -- add "Manage Reservations" button for food_premium owners
- `src/pages/EditProfile.tsx` -- add capacity field for food_premium subscribers

