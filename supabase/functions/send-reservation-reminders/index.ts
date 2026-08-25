import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = "5b6aae46-50f4-4a83-b3cf-bf62ec1138f1";

interface PendingReminder {
  id: string;
  reservation_id: string;
  reminder_type: "24h" | "2h";
  scheduled_for: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error("ONESIGNAL_REST_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pull due reminders (sent_at is null, scheduled_for in the past, not too old)
    const { data: pending, error: pendingError } = await supabase
      .from("reservation_reminders")
      .select("id, reservation_id, reminder_type, scheduled_for")
      .is("sent_at", null)
      .lte("scheduled_for", new Date().toISOString())
      .gte(
        "scheduled_for",
        new Date(Date.now() - 30 * 60 * 1000).toISOString()
      ) // within last 30 min
      .limit(100);

    if (pendingError) throw pendingError;

    const reminders = (pending || []) as PendingReminder[];
    if (reminders.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const sentIds: string[] = [];

    for (const r of reminders) {
      // Fetch reservation + business
      const { data: res } = await supabase
        .from("reservations")
        .select(
          "id, user_id, business_id, reservation_time, status, business:profiles!reservations_business_id_fkey(full_name, username)"
        )
        .eq("id", r.reservation_id)
        .maybeSingle();

      if (!res || res.status !== "confirmed") {
        // Stale reminder; mark sent so we stop processing
        sentIds.push(r.id);
        continue;
      }

      const businessName =
        (res as any).business?.full_name ||
        (res as any).business?.username ||
        "el negocio";
      const time = String(res.reservation_time).slice(0, 5);

      // Recipients = reservation owner + tagged guests
      const { data: guests } = await supabase
        .from("reservation_guests")
        .select("user_id")
        .eq("reservation_id", r.reservation_id);

      const userIds = Array.from(
        new Set([res.user_id, ...((guests || []).map((g: any) => g.user_id))])
      );

      // Lookup OneSignal player ids
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("onesignal_player_id")
        .in("user_id", userIds);

      const playerIds = (subs || []).map((s: any) => s.onesignal_player_id).filter(Boolean);

      if (playerIds.length > 0) {
        const title = "Recordatorio de reserva";
        const body =
          r.reminder_type === "24h"
            ? `Mañana a las ${time} en ${businessName}`
            : `En 2 horas: tu reserva en ${businessName} a las ${time}`;

        const oneSignalRes = await fetch(
          "https://onesignal.com/api/v1/notifications",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              include_subscription_ids: playerIds,
              headings: { en: title, es: title },
              contents: { en: body, es: body },
              data: {
                type: "reservation_reminder",
                reservation_id: r.reservation_id,
                url: `/reservation/${r.reservation_id}`,
              },
              ios_badgeType: "Increase",
              ios_badgeCount: 1,
              small_icon: "ic_stat_onesignal_default",
              url: `/reservation/${r.reservation_id}`,
            }),
          }
        );

        if (!oneSignalRes.ok) {
          console.error(
            "OneSignal failed for reminder",
            r.id,
            await oneSignalRes.text()
          );
          continue;
        }
        sentCount++;
      }

      sentIds.push(r.id);
    }

    if (sentIds.length > 0) {
      await supabase
        .from("reservation_reminders")
        .update({ sent_at: new Date().toISOString() })
        .in("id", sentIds);
    }

    return new Response(
      JSON.stringify({ processed: sentIds.length, sent: sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-reservation-reminders error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
