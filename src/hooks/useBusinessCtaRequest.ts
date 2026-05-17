import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BusinessCtaRequest {
  id: string;
  event_id: string;
  business_id: string;
  requested_by: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  revoked_by: "user" | "business" | null;
  created_at: string;
  responded_at: string | null;
  business?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    is_food_business: boolean | null;
    menu_enabled: boolean | null;
    reservations_enabled: boolean | null;
    business_hours: string | null;
    reservation_start_time: string | null;
    reservation_end_time: string | null;
  };
}

/** Accepted CTA requests for a post — public, used to render extra menu/reservation buttons. */
export const useAcceptedBusinessCtas = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["business-cta-accepted", eventId],
    queryFn: async (): Promise<BusinessCtaRequest[]> => {
      if (!eventId) return [];
      const { data, error } = await (supabase as any)
        .from("post_business_cta_requests")
        .select(
          `*, business:profiles!post_business_cta_requests_business_id_fkey(
            id, username, full_name, avatar_url, is_food_business, menu_enabled,
            reservations_enabled, business_hours, reservation_start_time, reservation_end_time
          )`
        )
        .eq("event_id", eventId)
        .eq("status", "accepted");
      if (error) throw error;
      return (data || []) as BusinessCtaRequest[];
    },
    enabled: !!eventId,
  });
};

/** The current business viewer's request row (if any) for a post. */
export const useMyBusinessCtaRequest = (
  eventId: string | undefined,
  enabled = true
) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["business-cta-mine", eventId, user?.id],
    queryFn: async (): Promise<BusinessCtaRequest | null> => {
      if (!eventId || !user?.id) return null;
      const { data, error } = await (supabase as any)
        .from("post_business_cta_requests")
        .select("*")
        .eq("event_id", eventId)
        .eq("business_id", user.id)
        .in("status", ["pending", "accepted"])
        .maybeSingle();
      if (error) throw error;
      return data as BusinessCtaRequest | null;
    },
    enabled: !!eventId && !!user?.id && enabled,
  });
};

const invalidate = (qc: ReturnType<typeof useQueryClient>, eventId: string) => {
  qc.invalidateQueries({ queryKey: ["business-cta-accepted", eventId] });
  qc.invalidateQueries({ queryKey: ["business-cta-mine", eventId] });
  qc.invalidateQueries({ queryKey: ["business-cta-pending-for-owner"] });
};

export const useRequestBusinessCta = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) throw new Error("Inicia sesión");
      const { error } = await (supabase as any)
        .from("post_business_cta_requests")
        .insert({
          event_id: eventId,
          business_id: user.id,
          requested_by: user.id,
          status: "pending",
        });
      if (error) throw error;
    },
    onSuccess: (_, eventId) => invalidate(qc, eventId),
  });
};

export const useRespondToBusinessCta = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: {
      requestId: string;
      eventId: string;
      status: "accepted" | "declined";
    }) => {
      const { error } = await (supabase as any)
        .from("post_business_cta_requests")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => invalidate(qc, eventId),
  });
};

export const useRevokeBusinessCta = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      by,
    }: {
      requestId: string;
      eventId: string;
      by: "user" | "business";
    }) => {
      const { error } = await (supabase as any)
        .from("post_business_cta_requests")
        .update({
          status: "revoked",
          revoked_by: by,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => invalidate(qc, eventId),
  });
};

/** Pending CTA request for a specific post, visible to the post owner. */
export const usePendingCtaRequestForOwner = (
  eventId: string | undefined,
  enabled = true
) => {
  return useQuery({
    queryKey: ["business-cta-pending-for-owner", eventId],
    queryFn: async (): Promise<BusinessCtaRequest | null> => {
      if (!eventId) return null;
      const { data, error } = await (supabase as any)
        .from("post_business_cta_requests")
        .select(
          `*, business:profiles!post_business_cta_requests_business_id_fkey(
            id, username, full_name, avatar_url
          )`
        )
        .eq("event_id", eventId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as BusinessCtaRequest | null;
    },
    enabled: !!eventId && enabled,
  });
};
