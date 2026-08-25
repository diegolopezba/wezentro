import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UpdateEventData {
  title?: string;
  description?: string;
  category?: string;
  start_datetime?: string;
  end_datetime?: string | null;
  location_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  price?: number;
  max_guestlist_capacity?: number | null;
  has_guestlist?: boolean;
  payment_qr_url?: string | null;
  show_menu_button?: boolean;
  show_reservation_button?: boolean;
  experience_id?: string | null;
  is_location_secret?: boolean;
  waitlist_enabled?: boolean;
  sales_open_at?: string | null;
  waitlist_early_access_hours?: number;
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: UpdateEventData }) => {
      const { data: result, error } = await supabase
        .from("events")
        .update(data)
        .eq("id", eventId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("events")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all event-related caches for instant UI updates
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["user-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["for-you-events"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-events"] });
      queryClient.invalidateQueries({ queryKey: ["following-events"] });
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return {
    invalidateAfterCreate: () => {
      // Invalidate all relevant caches after creating new content
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["user-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["for-you-events"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-events"] });
      queryClient.invalidateQueries({ queryKey: ["following-events"] });
    },
  };
}
