import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { deliverAnnouncement } from "../_shared/event-announcements.ts";

// Cron-driven dispatcher: sends any scheduled organizer announcement whose
// scheduled_for has passed. Invoked every 5 minutes by pg_cron.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: due, error } = await admin
    .from("event_announcements")
    .select("id, event_id, title, body")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  for (const row of due ?? []) {
    try {
      const count = await deliverAnnouncement(admin, row);
      await admin
        .from("event_announcements")
        .update({ status: "sent", recipient_count: count, sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      console.error("dispatch failed for", row.id, msg);
      await admin
        .from("event_announcements")
        .update({ status: "failed", error: msg })
        .eq("id", row.id);
    }
  }

  return new Response(JSON.stringify({ processed: due?.length ?? 0, sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
