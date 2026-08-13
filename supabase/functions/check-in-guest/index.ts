import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-scanner-key, x-supabase-client-platform, x-supabase-client-platform-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { qr_code_token, event_id } = await req.json();

    if (!qr_code_token || !event_id) {
      return new Response(
        JSON.stringify({ error: "qr_code_token and event_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine auth mode: JWT owner OR x-scanner-key bouncer
    const authHeader = req.headers.get("Authorization");
    const scannerKey = req.headers.get("x-scanner-key");

    let isAuthorized = false;

    if (scannerKey) {
      // Bouncer mode: validate scanner_access_token matches the event
      const { data: eventData, error: eventError } = await supabaseAdmin
        .from("events")
        .select("id, scanner_access_token")
        .eq("id", event_id)
        .eq("scanner_access_token", scannerKey)
        .single();

      if (!eventError && eventData) {
        isAuthorized = true;
      }
    } else if (authHeader?.startsWith("Bearer ")) {
      // Owner mode: validate JWT and check if user is the event creator
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

      if (!claimsError && claimsData?.claims) {
        const userId = claimsData.claims.sub;

        const { data: eventData, error: eventError } = await supabaseAdmin
          .from("events")
          .select("id, creator_id")
          .eq("id", event_id)
          .eq("creator_id", userId)
          .single();

        if (!eventError && eventData) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First check if the entry exists and its current state
    const { data: existingEntry, error: lookupError } = await supabaseAdmin
      .from("guestlist_entries")
      .select("id, status, checked_in_at, user_id, event_id")
      .eq("qr_code_token", qr_code_token)
      .eq("event_id", event_id)
      .maybeSingle();

    if (lookupError || !existingEntry) {
      // Fallback: frictionless RSVP ticket stored on the special invite itself
      const { data: invite } = await supabaseAdmin
        .from("event_special_invites")
        .select("id, status, checked_in_at, rsvp_name, guest_name, segment")
        .eq("qr_code_token", qr_code_token)
        .eq("event_id", event_id)
        .maybeSingle();

      if (!invite) {
        return new Response(
          JSON.stringify({ success: false, error: "QR inválido o no pertenece a este evento" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const guest = {
        username: null,
        full_name: invite.rsvp_name ?? invite.guest_name ?? "Invitado especial",
        avatar_url: null,
      };

      if (invite.status === "revoked") {
        return new Response(
          JSON.stringify({ success: false, error: "Esta invitación fue cancelada" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (invite.checked_in_at) {
        return new Response(
          JSON.stringify({
            success: false,
            alreadyUsed: true,
            checkedInAt: invite.checked_in_at,
            guest,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: updatedInvite } = await supabaseAdmin
        .from("event_special_invites")
        .update({ checked_in_at: new Date().toISOString() })
        .eq("id", invite.id)
        .is("checked_in_at", null)
        .select("id")
        .maybeSingle();

      if (!updatedInvite) {
        return new Response(
          JSON.stringify({ success: false, alreadyUsed: true, guest }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, alreadyUsed: false, guest }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    if (existingEntry.status !== "approved") {
      return new Response(
        JSON.stringify({ success: false, error: "El acceso no está aprobado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already checked in — return alreadyUsed flag with guest info
    if (existingEntry.checked_in_at) {
      const { data: guestProfile } = await supabaseAdmin
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", existingEntry.user_id)
        .single();

      return new Response(
        JSON.stringify({
          success: false,
          alreadyUsed: true,
          checkedInAt: existingEntry.checked_in_at,
          guest: guestProfile ?? null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atomic single-use check-in: only update if checked_in_at IS NULL
    const { data: updatedEntry, error: updateError } = await supabaseAdmin
      .from("guestlist_entries")
      .update({ checked_in_at: new Date().toISOString(), attended: true })
      .eq("qr_code_token", qr_code_token)
      .eq("event_id", event_id)
      .is("checked_in_at", null)
      .select("id, user_id")
      .single();

    if (updateError || !updatedEntry) {
      // Race condition: someone else checked them in between the read and this update
      return new Response(
        JSON.stringify({ success: false, alreadyUsed: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch guest profile for the success response
    const { data: guestProfile } = await supabaseAdmin
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", updatedEntry.user_id)
      .single();

    // Update event_analytics check_ins counter (best-effort, ignore errors)
    supabaseAdmin
      .from("event_analytics")
      .select("id, check_ins")
      .eq("event_id", event_id)
      .single()
      .then(({ data: analytics }) => {
        if (analytics) {
          supabaseAdmin
            .from("event_analytics")
            .update({ check_ins: (analytics.check_ins ?? 0) + 1, updated_at: new Date().toISOString() })
            .eq("event_id", event_id)
            .then(() => {});
        }
      })
      .catch(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        alreadyUsed: false,
        guest: guestProfile ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-in-guest error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
