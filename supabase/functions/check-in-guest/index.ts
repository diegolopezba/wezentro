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

    const { qr_code_token, event_id, experience_id } = await req.json();

    // Experience booking check-in: only the owning business (JWT) can check guests in.
    if (experience_id && qr_code_token) {
      const authHeaderExp = req.headers.get("Authorization");
      if (!authHeaderExp?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseClientExp = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeaderExp } } }
      );
      const { data: claimsExp, error: claimsExpErr } = await supabaseClientExp.auth.getClaims(
        authHeaderExp.replace("Bearer ", "")
      );
      const callerId = claimsExpErr ? null : claimsExp?.claims?.sub;
      if (!callerId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: experience } = await supabaseAdmin
        .from("experiences")
        .select("id, title, business_id")
        .eq("id", experience_id)
        .maybeSingle();
      if (!experience || experience.business_id !== callerId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: booking } = await supabaseAdmin
        .from("experience_bookings")
        .select("id, status, quantity, user_id")
        .eq("check_in_token", qr_code_token)
        .eq("experience_id", experience_id)
        .maybeSingle();

      if (!booking) {
        return new Response(
          JSON.stringify({ success: false, error: "QR inválido o no pertenece a esta experiencia" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: guestProfile } = await supabaseAdmin
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", booking.user_id)
        .maybeSingle();

      const guest = { ...(guestProfile ?? {}), quantity: booking.quantity };

      if (booking.status === "cancelled") {
        return new Response(
          JSON.stringify({ success: false, error: "Esta reserva fue cancelada", guest }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (booking.status === "completed") {
        return new Response(
          JSON.stringify({ success: false, alreadyUsed: true, guest }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (booking.status !== "confirmed") {
        return new Response(
          JSON.stringify({ success: false, error: "La reserva no está confirmada", guest }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: updated } = await supabaseAdmin
        .from("experience_bookings")
        .update({ status: "completed" })
        .eq("id", booking.id)
        .eq("status", "confirmed")
        .select("id")
        .maybeSingle();

      if (!updated) {
        return new Response(
          JSON.stringify({ success: false, alreadyUsed: true, guest }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, alreadyUsed: false, guest, experienceTitle: experience.title }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (!qr_code_token || !event_id) {
      return json({ error: "qr_code_token and event_id are required" }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    const scannerKey = req.headers.get("x-scanner-key");
    let isAuthorized = false;

    if (scannerKey) {
      const { data: eventData } = await supabaseAdmin
        .from("events").select("id").eq("id", event_id).eq("scanner_access_token", scannerKey).maybeSingle();
      if (eventData) isAuthorized = true;
    } else if (authHeader?.startsWith("Bearer ")) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (!claimsError && claimsData?.claims) {
        const { data: eventData } = await supabaseAdmin
          .from("events").select("id").eq("id", event_id).eq("creator_id", claimsData.claims.sub).maybeSingle();
        if (eventData) isAuthorized = true;
      }
    }

    if (!isAuthorized) return json({ error: "Unauthorized", code: "unauthorized" }, 401);

    const profileOf = async (id: string | null) => {
      if (!id) return null;
      const { data } = await supabaseAdmin.from("profiles").select("username, full_name, avatar_url").eq("id", id).maybeSingle();
      return data ?? null;
    };

    const { data: entry } = await supabaseAdmin
      .from("guestlist_entries")
      .select("id, status, checked_in_at, user_id, purchased_by_user_id, guest_name, ticket_tier_id, is_special_guest, special_guest_label, area_booking_id, payment_session_id, gate_ticket_index")
      .eq("qr_code_token", qr_code_token)
      .eq("event_id", event_id)
      .maybeSingle();

    if (!entry) {
      // Frictionless RSVP ticket stored on the special invite itself
      const { data: invite } = await supabaseAdmin
        .from("event_special_invites")
        .select("id, status, checked_in_at, rsvp_name, guest_name, label, redeemed_by")
        .eq("qr_code_token", qr_code_token)
        .eq("event_id", event_id)
        .maybeSingle();

      if (!invite) {
        const [{ data: otherEntry }, { data: otherInvite }] = await Promise.all([
          supabaseAdmin.from("guestlist_entries").select("id").eq("qr_code_token", qr_code_token).limit(1).maybeSingle(),
          supabaseAdmin.from("event_special_invites").select("id").eq("qr_code_token", qr_code_token).limit(1).maybeSingle(),
        ]);
        if (otherEntry || otherInvite) {
          return json({ success: false, code: "wrong_event", error: "Esta entrada es de otro evento" }, 404);
        }
        return json({ success: false, code: "not_found", error: "Este QR no corresponde a ninguna entrada" }, 404);
      }

      const p = await profileOf(invite.redeemed_by);
      const guest = {
        username: p?.username ?? null,
        full_name: invite.rsvp_name ?? invite.guest_name ?? p?.full_name ?? "Invitado especial",
        avatar_url: p?.avatar_url ?? null,
      };
      const entryInfo = { entry_label: invite.label || "Invitado especial", is_special: true, details: [] as string[] };

      if (invite.status === "revoked") {
        return json({ success: false, code: "revoked", error: "Esta invitación fue cancelada", guest, ...entryInfo }, 403);
      }
      if (invite.checked_in_at) {
        return json({ success: false, alreadyUsed: true, checkedInAt: invite.checked_in_at, guest, ...entryInfo });
      }
      const now = new Date().toISOString();
      const { data: updatedInvite } = await supabaseAdmin
        .from("event_special_invites").update({ checked_in_at: now }).eq("id", invite.id).is("checked_in_at", null).select("id").maybeSingle();
      if (!updatedInvite) {
        const { data: fresh } = await supabaseAdmin.from("event_special_invites").select("checked_in_at").eq("id", invite.id).maybeSingle();
        return json({ success: false, alreadyUsed: true, checkedInAt: fresh?.checked_in_at ?? null, guest, ...entryInfo });
      }
      return json({ success: true, alreadyUsed: false, guest, ...entryInfo });
    }

    // Build guest + ticket description
    const [userProfile, buyerProfile] = await Promise.all([
      profileOf(entry.user_id),
      entry.purchased_by_user_id && entry.purchased_by_user_id !== entry.user_id ? profileOf(entry.purchased_by_user_id) : Promise.resolve(null),
    ]);

    const details: string[] = [];
    let entryLabel = "Entrada";
    const isGate = !!entry.gate_ticket_index;

    if (entry.is_special_guest) {
      entryLabel = entry.special_guest_label || "Invitado especial";
    } else if (entry.ticket_tier_id) {
      const { data: tier } = await supabaseAdmin.from("ticket_tiers").select("name").eq("id", entry.ticket_tier_id).maybeSingle();
      entryLabel = tier?.name || "Entrada";
    } else if (isGate && entry.payment_session_id) {
      const { data: ps } = await supabaseAdmin.from("payment_sessions").select("gate_offer_name").eq("id", entry.payment_session_id).maybeSingle();
      entryLabel = ps?.gate_offer_name ? `Puerta · ${ps.gate_offer_name}` : "Entrada de puerta";
    } else if (entry.payment_session_id) {
      entryLabel = "Precio único";
    }

    if (entry.area_booking_id) {
      const { data: booking } = await supabaseAdmin
        .from("area_bookings").select("party_size, event_area_id").eq("id", entry.area_booking_id).maybeSingle();
      if (booking) {
        const { data: area } = await supabaseAdmin.from("event_areas").select("name").eq("id", booking.event_area_id).maybeSingle();
        if (!entry.is_special_guest && !entry.ticket_tier_id) entryLabel = "Lounge";
        details.push(`Lounge / mesa: ${area?.name ?? "Reservado"}`);
        if (booking.party_size) details.push(`${booking.party_size} personas en la reserva`);
      }
    }

    const buyerName = buyerProfile?.full_name || buyerProfile?.username || null;
    if (buyerName) details.push(`Comprada por ${buyerName}`);

    const guest = isGate
      ? { username: "", full_name: "Entrada de puerta", avatar_url: null }
      : {
          username: userProfile?.username ?? "",
          full_name: entry.guest_name || userProfile?.full_name || userProfile?.username || (buyerName ? `Invitado de ${buyerName}` : "Invitado"),
          avatar_url: userProfile?.avatar_url ?? null,
        };
    const entryInfo = { entry_label: entryLabel, is_special: !!entry.is_special_guest, details };

    if (entry.status !== "approved") {
      return json({ success: false, code: "not_approved", error: "Esta entrada no está aprobada o fue cancelada", guest, ...entryInfo }, 403);
    }
    if (entry.checked_in_at) {
      return json({ success: false, alreadyUsed: true, checkedInAt: entry.checked_in_at, guest, ...entryInfo });
    }

    const { data: updatedEntry } = await supabaseAdmin
      .from("guestlist_entries")
      .update({ checked_in_at: new Date().toISOString(), attended: true })
      .eq("id", entry.id)
      .is("checked_in_at", null)
      .select("id")
      .maybeSingle();

    if (!updatedEntry) {
      const { data: fresh } = await supabaseAdmin.from("guestlist_entries").select("checked_in_at").eq("id", entry.id).maybeSingle();
      return json({ success: false, alreadyUsed: true, checkedInAt: fresh?.checked_in_at ?? null, guest, ...entryInfo });
    }

    // Best-effort analytics counter
    supabaseAdmin.from("event_analytics").select("check_ins").eq("event_id", event_id).maybeSingle()
      .then(({ data: a }) => {
        if (a) supabaseAdmin.from("event_analytics")
          .update({ check_ins: (a.check_ins ?? 0) + 1, updated_at: new Date().toISOString() })
          .eq("event_id", event_id).then(() => {});
      }, () => {});

    return json({ success: true, alreadyUsed: false, guest, ...entryInfo });
  } catch (error) {
    console.error("check-in-guest error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
