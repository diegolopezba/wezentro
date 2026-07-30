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

/** Look up a single invite by its link token. */
export function useSpecialInvite(token: string | undefined) {
  return useQuery({
    queryKey: ["special-invite", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from("event_special_invites")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (error) throw error;
      return data as SpecialInvite | null;
    },
    enabled: !!token,
    staleTime: 30_000,
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
      ticketTierId,
    }: {
      eventId: string;
      label?: string | null;
      ticketTierId?: string | null;
    }) => {
      if (!user) throw new Error("Must be logged in");
      const { data, error } = await supabase
        .from("event_special_invites")
        .insert({
          event_id: eventId,
          created_by: user.id,
          label: label?.trim() || null,
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
