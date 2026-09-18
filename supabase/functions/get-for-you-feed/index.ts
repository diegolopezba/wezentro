// Edge-cached first-page wrapper for the Para Ti feed.
// Sits behind Cloudflare so guest/cold-user first-page hits are served from
// edge cache instead of hitting Postgres on every session. Only the first
// page (cursor=null) is cached — cursor pages keep calling the RPC directly.

import { createClient, corsHeaders } from "npm:@supabase/supabase-js@2";

const responseHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: responseHeaders });
  }

  try {
    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get("limit") ?? "20");
    const limit = Math.max(1, Math.min(50, Number.isFinite(limitParam) ? limitParam : 20));

    const backendUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!backendUrl || !serviceRoleKey) throw new Error("Feed service is not configured");
    const supabase = createClient(backendUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("events")
      .select(`
        id, title, description, description_tags, image_url, category,
        location_name, latitude, longitude, start_datetime, end_datetime,
        price, has_guestlist, has_guestlist_chat, max_guestlist_capacity,
        is_post, is_public, is_business_event, show_menu_button,
        show_reservation_button, payment_qr_url, creator_id, created_at,
        creator:profiles!events_creator_id_fkey(username, full_name, avatar_url),
        guestlist_entries(user:profiles!guestlist_entries_user_id_fkey(id, avatar_url)),
        media:event_media(id, media_url, media_type, display_order, aspect_ratio)
      `)
      .eq("is_public", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...responseHeaders, "Content-Type": "application/json" },
      });
    }

    const items = (data || []).map((event: any) => ({
      ...event,
      creator_username: event.creator?.username ?? "",
      creator_full_name: event.creator?.full_name ?? null,
      creator_avatar_url: event.creator?.avatar_url ?? null,
      attendee_count: event.guestlist_entries?.length ?? 0,
      attendee_avatars: (event.guestlist_entries || []).map((entry: any) => entry.user),
    }));

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: {
        ...responseHeaders,
        "Content-Type": "application/json",
        // Edge cache: 60s fresh, 120s stale-while-revalidate.
        // Same cold-page payload is reused across guests + new users.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...responseHeaders, "Content-Type": "application/json" },
    });
  }
});
