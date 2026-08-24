import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = "https://zentro.today";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface EventRow {
  id: string;
  title: string | null;
  image_url: string | null;
  location_name: string | null;
  start_datetime: string | null;
  creator_id: string;
  waitlist_enabled: boolean;
  waitlist_released_at: string | null;
  waitlist_early_access_hours: number | null;
}

async function releaseEvent(admin: ReturnType<typeof createClient>, event: EventRow) {
  const releasedAt = new Date().toISOString();

  const { error: updErr } = await admin
    .from("events")
    .update({ waitlist_released_at: releasedAt })
    .eq("id", event.id)
    .is("waitlist_released_at", null);
  if (updErr) throw updErr;

  const hours = event.waitlist_early_access_hours ?? 0;
  const title = event.title || "un evento";
  const body =
    hours > 0
      ? `Las entradas ya están a la venta. Tenés ${hours}h de acceso anticipado.`
      : "Las entradas ya están a la venta. ¡Sos de los primeros en saberlo!";

  // Fetch waitlist in insertion order, in pages
  let notified = 0;
  let from = 0;
  const PAGE = 500;

  for (;;) {
    const { data: rows, error } = await admin
      .from("event_waitlist")
      .select("id, user_id")
      .eq("event_id", event.id)
      .is("notified_at", null)
      .order("position", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!rows || rows.length === 0) break;

    const userIds = rows.map((r: any) => r.user_id);

    await admin.from("notifications").insert(
      rows.map((r: any) => ({
        user_id: r.user_id,
        type: "waitlist_release",
        title: title,
        body,
        entity_type: "event",
        entity_id: event.id,
      }))
    );

    // Emails (best-effort, one per recipient)
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, username")
      .in("id", userIds);
    const nameById = new Map((profiles || []).map((p: any) => [p.id, p.full_name || p.username]));

    for (const uid of userIds) {
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(uid);
        const email = authUser?.user?.email;
        if (!email) continue;
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "waitlist-released",
            recipientEmail: email,
            idempotencyKey: `waitlist-${event.id}-${uid}`,
            templateData: {
              guestName: nameById.get(uid) ?? undefined,
              eventTitle: title,
              eventDate: event.start_datetime ?? undefined,
              eventLocation: event.location_name ?? undefined,
              eventImageUrl: event.image_url ?? undefined,
              eventUrl: `${SITE_URL}/event/${event.id}`,
              earlyAccessHours: hours,
            },
          },
        });
      } catch (e) {
        console.error("[waitlist] email failed", uid, (e as Error).message);
      }
    }

    await admin
      .from("event_waitlist")
      .update({ notified_at: releasedAt })
      .in("id", rows.map((r: any) => r.id));

    notified += rows.length;
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  return notified;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const eventId = typeof body.eventId === "string" ? body.eventId : null;

    // ── Manual release by the event owner ──
    if (eventId) {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await admin.auth.getUser(token);
      const uid = userData?.user?.id;
      if (!uid) return json({ error: "No autenticado" }, 401);

      const { data: event } = await admin
        .from("events")
        .select(
          "id, title, image_url, location_name, start_datetime, creator_id, waitlist_enabled, waitlist_released_at, waitlist_early_access_hours"
        )
        .eq("id", eventId)
        .maybeSingle();

      if (!event) return json({ error: "Evento no encontrado" }, 404);
      if (event.creator_id !== uid) return json({ error: "No autorizado" }, 403);
      if (!event.waitlist_enabled) return json({ error: "Este evento no tiene lista de espera" }, 400);
      if (event.waitlist_released_at) return json({ notified: 0, alreadyReleased: true });

      const notified = await releaseEvent(admin, event as unknown as EventRow);
      return json({ notified });
    }

    // ── Scheduled sweep (cron): release everything whose sales_open_at has passed ──
    const { data: due, error } = await admin
      .from("events")
      .select(
        "id, title, image_url, location_name, start_datetime, creator_id, waitlist_enabled, waitlist_released_at, waitlist_early_access_hours"
      )
      .eq("waitlist_enabled", true)
      .is("waitlist_released_at", null)
      .not("sales_open_at", "is", null)
      .lte("sales_open_at", new Date().toISOString())
      .limit(50);
    if (error) throw error;

    let total = 0;
    for (const event of due || []) {
      try {
        total += await releaseEvent(admin, event as unknown as EventRow);
      } catch (e) {
        console.error("[waitlist] release failed", event.id, (e as Error).message);
      }
    }
    return json({ released: (due || []).length, notified: total });
  } catch (e) {
    console.error("[waitlist] error", (e as Error).message);
    return json({ error: "Error interno" }, 500);
  }
});
