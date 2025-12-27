-- Allow authenticated users to view guestlist entries for public events
CREATE POLICY "Users can view guestlist for public events"
  ON guestlist_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = guestlist_entries.event_id 
      AND events.is_public = true
      AND events.deleted_at IS NULL
    )
  );