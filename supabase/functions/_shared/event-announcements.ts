// Shared delivery logic for organizer -> attendee event announcements.
// Used by both `send-event-announcement` (immediate) and
// `dispatch-event-announcements` (scheduled via pg_cron).

export interface AnnouncementRow {
  id: string;
  event_id: string;
  title: string;
  body: string;
}

export async function resolveRecipients(
  admin: any,
  eventId: string,
): Promise<string[]> {
  const { data, error } = await admin.rpc("get_event_announcement_recipients", {
    _event_id: eventId,
  });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r: { user_id: string }) => r.user_id)
    .filter(Boolean);
}

/**
 * Fan out one announcement: writes in-app notifications and fires a push.
 * Returns the number of recipients reached.
 */
export async function deliverAnnouncement(
  admin: any,
  announcement: AnnouncementRow,
): Promise<number> {
  const userIds = await resolveRecipients(admin, announcement.event_id);
  if (userIds.length === 0) return 0;

  const rows = userIds.map((uid) => ({
    user_id: uid,
    type: "event_announcement",
    title: announcement.title,
    body: announcement.body,
    entity_type: "event",
    entity_id: announcement.event_id,
  }));

  // Chunk inserts so very large guest lists don't hit statement limits.
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("notifications").insert(rows.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }

  // Push (best effort — an in-app notification already landed).
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        user_ids: userIds,
        title: announcement.title,
        body: announcement.body,
        url: `https://zentro.today/event/${announcement.event_id}`,
        data: { route: `/event/${announcement.event_id}` },
      }),
    });
  } catch (e) {
    console.error("announcement push failed", e);
  }

  return userIds.length;
}
