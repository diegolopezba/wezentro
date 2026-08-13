import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SpecialInvite {
  id: string;
  event_id: string;
  created_by: string;
  token: string;
  ticket_tier_id: string | null;
  label: string | null;
  status: "pending" | "redeemed" | "revoked";
  redeemed_by: string | null;
  redeemed_at: string | null;
  created_at: string;
  guest_name: string | null;
  guest_email: string | null;
  segment: string | null;
  batch_id: string | null;
  email_status: "not_sent" | "queued" | "sent" | "failed";
  email_sent_at: string | null;
  delivery_mode: "app" | "direct";
  qr_code_token: string | null;
  rsvp_name: string | null;
  rsvp_email: string | null;
  rsvp_confirmed_at: string | null;
  checked_in_at: string | null;
}

/** Token-scoped payload for the public (no-account) invite page. */
export interface PublicInvite {
  id: string;
  event_id: string;
  token: string;
  status: "pending" | "redeemed" | "revoked";
  segment: string | null;
  delivery_mode: "app" | "direct";
  guest_name: string | null;
  guest_email: string | null;
  rsvp_name: string | null;
  rsvp_email: string | null;
  rsvp_confirmed_at: string | null;
  checked_in_at: string | null;
  qr_code_token: string | null;
  event_title: string | null;
  event_start: string | null;
  event_location: string | null;
  event_image_url: string | null;
  host_name: string | null;
}


const PENDING_INVITE_KEY = "zentro_pending_special_invite";

export const setPendingSpecialInvite = (token: string) => {
  try { localStorage.setItem(PENDING_INVITE_KEY, token); } catch { /* ignore */ }
};

export const takePendingSpecialInvite = (): string | null => {
  try {
    const t = localStorage.getItem(PENDING_INVITE_KEY);
    if (t) localStorage.removeItem(PENDING_INVITE_KEY);
    return t;
  } catch {
    return null;
  }
};

/** Public share URL for a special invite. */
export const getSpecialInviteUrl = (token: string) =>
  `${window.location.origin}/i/${token}`;

/** Look up a single invite by its link token (token-scoped, no email exposure). */
export function useSpecialInvite(token: string | undefined) {
  return useQuery({
    queryKey: ["special-invite", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_special_invite_by_token", {
        _token: token,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as SpecialInvite | null;
    },
    enabled: !!token,
    staleTime: 30_000,
  });
}

/** Public QR image URL for a confirmed frictionless ticket. */
export const getInviteQrImageUrl = (qrToken: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-qr?token=${encodeURIComponent(qrToken)}`;

/** Anonymous, token-scoped invite lookup used by the public RSVP page. */
export function usePublicInvite(token: string | undefined) {
  return useQuery({
    queryKey: ["public-invite", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_public_invite", { _token: token });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as PublicInvite | null;
    },
    enabled: !!token,
    staleTime: 15_000,
  });
}

const RSVP_ERRORS: Record<string, string> = {
  invalid_name: "Escribí tu nombre.",
  invalid_email: "Escribí un correo válido.",
  invitation_not_found: "Esta invitación no existe.",
  invitation_revoked: "Esta invitación fue cancelada por el organizador.",
  invitation_already_used: "Esta invitación ya fue usada.",
  invitation_requires_account: "Esta invitación requiere iniciar sesión.",
};

/** One-tap RSVP: confirms attendance and mints the ticket QR, no account needed. */
export function useConfirmInviteRsvp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      name,
      email,
    }: {
      token: string;
      name: string;
      email: string;
    }) => {
      const { data, error } = await supabase.rpc("confirm_invite_rsvp", {
        _token: token,
        _name: name,
        _email: email,
      });
      if (error) {
        const key = Object.keys(RSVP_ERRORS).find((k) => error.message?.includes(k));
        throw new Error(key ? RSVP_ERRORS[key] : "No se pudo confirmar tu asistencia");
      }
      return data as {
        invite_id: string;
        event_id: string;
        qr_code_token: string;
        already_confirmed: boolean;
      };
    },
    onSuccess: (_d, { token }) => {
      queryClient.invalidateQueries({ queryKey: ["public-invite", token] });
    },
  });
}

/** Owner switch between the in-app flow and the frictionless RSVP flow. */
export function useSetInviteDeliveryMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inviteIds,
      mode,
    }: {
      inviteIds: string[];
      mode: "app" | "direct";
      eventId: string;
    }) => {
      const { error } = await supabase.rpc("set_special_invite_mode", {
        _invite_ids: inviteIds,
        _mode: mode,
      });
      if (error) throw error;
    },
    onSuccess: (_d, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-special-invites", eventId] });
    },
  });
}



/** All invites the owner created for an event. */
export function useEventSpecialInvites(eventId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["event-special-invites", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("event_special_invites")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SpecialInvite[];
    },
    enabled: !!eventId && enabled,
  });
}

export function useCreateSpecialInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventId,
      label,
      segment,
      ticketTierId,
    }: {
      eventId: string;
      label?: string | null;
      segment?: string | null;
      ticketTierId?: string | null;
    }) => {
      if (!user) throw new Error("Must be logged in");
      const { data, error } = await supabase
        .from("event_special_invites")
        .insert({
          event_id: eventId,
          created_by: user.id,
          label: label?.trim() || null,
          segment: segment?.trim() || null,
          ticket_tier_id: ticketTierId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SpecialInvite;
    },
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-special-invites", eventId] });
    },
  });
}

/** Bulk-create invites from an imported guest list (chunked, ~200 rows per call). */
export function useBulkCreateSpecialInvites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      segment,
      guests,
      onProgress,
    }: {
      eventId: string;
      segment: string | null;
      guests: { name: string | null; email: string }[];
      onProgress?: (done: number, total: number) => void;
    }) => {
      const CHUNK = 200;
      const batchId = crypto.randomUUID();
      let created = 0;
      let skipped = 0;

      for (let i = 0; i < guests.length; i += CHUNK) {
        const chunk = guests.slice(i, i + CHUNK);
        const { data, error } = await supabase.rpc("bulk_create_special_invites", {
          _event_id: eventId,
          _segment: segment,
          _guests: chunk.map((g) => ({ name: g.name, email: g.email })),
          _batch_id: batchId,
        });
        if (error) throw error;
        const res = (data ?? {}) as { created?: number; skipped?: number };
        created += res.created ?? 0;
        skipped += res.skipped ?? 0;
        onProgress?.(Math.min(i + CHUNK, guests.length), guests.length);
      }

      return { batchId, created, skipped };
    },
    onSuccess: (_d, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-special-invites", eventId] });
    },
  });
}

/** Send (or retry) invitation emails for a batch. */
export function useSendSpecialInviteEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      batchId,
      inviteIds,
    }: {
      eventId: string;
      batchId?: string;
      inviteIds?: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke("send-special-invites", {
        body: { eventId, batchId, inviteIds },
      });
      if (error) throw error;
      return data as { sent: number; failed: number; processed: number };
    },
    onSuccess: (_d, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-special-invites", eventId] });
    },
  });
}

export function useRevokeSpecialInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string; eventId: string }) => {
      const { error } = await supabase
        .from("event_special_invites")
        .update({ status: "revoked" })
        .eq("id", inviteId)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: (_d, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-special-invites", eventId] });
    },
  });
}

const INVITE_ERRORS: Record<string, string> = {
  invitation_not_found: "Esta invitación no existe.",
  invitation_revoked: "Esta invitación fue cancelada por el organizador.",
  invitation_already_used: "Esta invitación ya fue usada.",
  event_not_found: "Este evento ya no está disponible.",
  event_full: "El evento está lleno.",
  tier_sold_out: "Ya no quedan entradas de este tipo.",
};

export function useRedeemSpecialInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("redeem_special_invite", { _token: token });
      if (error) {
        const key = Object.keys(INVITE_ERRORS).find((k) => error.message?.includes(k));
        throw new Error(key ? INVITE_ERRORS[key] : "No se pudo aceptar la invitación");
      }
      return data as { event_id: string; entry_id: string };
    },
    onSuccess: (data) => {
      const eventId = data?.event_id;
      queryClient.invalidateQueries({ queryKey: ["guestlist-status", eventId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["guestlist-status", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-guestlist", eventId] });
      queryClient.invalidateQueries({ queryKey: ["guestlist-entry", eventId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["event-special-invites", eventId] });
      queryClient.invalidateQueries({ queryKey: ["special-invite"] });
    },
  });
}
