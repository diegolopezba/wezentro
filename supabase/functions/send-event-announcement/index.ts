import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { deliverAnnouncement, resolveRecipients } from "../_shared/event-announcements.ts";

const DAILY_LIMIT = 3;
const MAX_TITLE = 80;
const MAX_BODY = 300;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Server configuration error" }, 500);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action: string = body?.action ?? "send";
  const eventId: string | undefined = body?.eventId;
  if (!eventId || typeof eventId !== "string") {
    return json({ error: "eventId is required" }, 400);
  }

  // Authenticate caller
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "not_authenticated" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: event } = await admin
    .from("events")
    .select("id, title, creator_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return json({ error: "event_not_found" }, 404);
  if (event.creator_id !== user.id) return json({ error: "not_event_owner" }, 403);

  const usedToday = async () => {
    const { data } = await admin.rpc("count_event_announcements_24h", { _event_id: eventId });
    return Number(data ?? 0);
  };

  try {
    if (action === "preview") {
      const [recipients, used] = await Promise.all([
        resolveRecipients(admin, eventId),
        usedToday(),
      ]);
      return json({
        recipient_count: recipients.length,
        used_today: used,
        daily_limit: DAILY_LIMIT,
        remaining: Math.max(0, DAILY_LIMIT - used),
      });
    }

    if (action === "cancel") {
      const announcementId: string | undefined = body?.announcementId;
      if (!announcementId) return json({ error: "announcementId is required" }, 400);
      const { error } = await admin
        .from("event_announcements")
        .update({ status: "cancelled" })
        .eq("id", announcementId)
        .eq("event_id", eventId)
        .eq("status", "scheduled");
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ---- send / schedule ----
    const title = String(body?.title ?? "").trim();
    const message = String(body?.body ?? "").trim();
    const scheduledFor: string | null = body?.scheduledFor ?? null;

    if (!title || title.length > MAX_TITLE) {
      return json({ error: `El título debe tener entre 1 y ${MAX_TITLE} caracteres` }, 400);
    }
    if (!message || message.length > MAX_BODY) {
      return json({ error: `El mensaje debe tener entre 1 y ${MAX_BODY} caracteres` }, 400);
    }
    if (scheduledFor && Number.isNaN(Date.parse(scheduledFor))) {
      return json({ error: "Fecha programada inválida" }, 400);
    }

    const used = await usedToday();
    if (used >= DAILY_LIMIT) {
      return json({ error: "daily_limit_reached", used_today: used, daily_limit: DAILY_LIMIT }, 429);
    }

    const isScheduled = !!scheduledFor && Date.parse(scheduledFor) > Date.now() + 30_000;

    const { data: inserted, error: insertError } = await admin
      .from("event_announcements")
      .insert({
        event_id: eventId,
        sender_id: user.id,
        title,
        body: message,
        scheduled_for: isScheduled ? scheduledFor : null,
        status: isScheduled ? "scheduled" : "sent",
      })
      .select("id, event_id, title, body, status")
      .single();

    if (insertError || !inserted) {
      return json({ error: insertError?.message ?? "insert_failed" }, 500);
    }

    if (isScheduled) {
      return json({ success: true, scheduled: true, announcement_id: inserted.id });
    }

    let recipientCount = 0;
    try {
      recipientCount = await deliverAnnouncement(admin, inserted);
      await admin
        .from("event_announcements")
        .update({ recipient_count: recipientCount, sent_at: new Date().toISOString() })
        .eq("id", inserted.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      await admin
        .from("event_announcements")
        .update({ status: "failed", error: msg })
        .eq("id", inserted.id);
      return json({ error: msg }, 500);
    }

    return json({ success: true, recipient_count: recipientCount, announcement_id: inserted.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("send-event-announcement error", msg);
    return json({ error: msg }, 500);
  }
});
