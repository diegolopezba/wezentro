import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

/**
 * Live updates for the business reservation view: any change to this
 * business's reservations triggers a refetch of the range list and slot
 * availability. Mounted only in owner-facing management UI — guests rely on
 * server-side locking instead (cost-effective: very few concurrent channels).
 */
export const useReservationRealtime = (businessId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`reservations-biz-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["reservations"] });
          queryClient.invalidateQueries({ queryKey: ["slot-availability"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);
};

export interface Reservation {
  id: string;
  business_id: string;
  user_id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  notes: string | null;
  status: string;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithProfile extends Reservation {
  user: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface CreateReservationParams {
  business_id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  notes?: string;
  tagged_user_ids?: string[];
}

/** Fire-and-forget notification emails; never block or fail the booking flow. */
const sendReservationEmails = (
  reservationId: string,
  kind: "created" | "cancelled",
) => {
  supabase.functions
    .invoke("send-reservation-emails", { body: { reservationId, kind } })
    .catch((e) => console.error("send-reservation-emails failed", e));
};



export const useCreateReservation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateReservationParams) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: reservationId, error } = await supabase.rpc("create_reservation", {
        _business_id: params.business_id,
        _date: params.reservation_date,
        _time: params.reservation_time,
        _party_size: params.party_size,
        _notes: params.notes || null,
        _guest_ids: params.tagged_user_ids ?? null,
      });

      if (error) throw error;
      return { id: reservationId as string };
    },
    onSuccess: ({ id }) => {
      haptic("success");
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["slot-availability"] });
      toast.success("¡Reserva confirmada!");
      sendReservationEmails(id, "created");
    },
    onError: (error: any) => {
      console.error("Error creating reservation:", error);
      // A capacity/availability failure means our cached slots are stale —
      // refetch so the guest immediately sees the real state.
      queryClient.invalidateQueries({ queryKey: ["slot-availability"] });
      toast.error(error?.message || "Error al crear la reserva");
    },
  });
};

export const useUserReservations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reservations", "user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("reservations")
        .select("id, business_id, user_id, reservation_date, reservation_time, party_size, notes, status, cancelled_by, created_at, updated_at")
        .eq("user_id", user.id)
        .gte("reservation_date", new Date().toISOString().split("T")[0])
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });

      if (error) throw error;
      return data as Reservation[];
    },
    enabled: !!user?.id,
  });
};

export const useBusinessReservations = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["reservations", "business", businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          user:profiles!reservations_user_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq("business_id", businessId)
        .gte("reservation_date", new Date().toISOString().split("T")[0])
        .neq("status", "cancelled")
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });

      if (error) throw error;
      return data as ReservationWithProfile[];
    },
    enabled: !!businessId,
  });
};

export interface ReservationWithGuests extends ReservationWithProfile {
  guests: {
    user_id: string;
    user: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }[];
}

/**
 * Business reservations within a date range (inclusive), including cancelled
 * ones so operational views can show their status badge. Guests are joined in
 * the same query to avoid N+1 per card.
 */
export const useBusinessReservationsByDate = (
  businessId: string | undefined,
  from: string,
  to: string,
) => {
  return useQuery({
    queryKey: ["reservations", "business-range", businessId, from, to],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          user:profiles!reservations_user_id_fkey(id, username, full_name, avatar_url),
          guests:reservation_guests(user_id, user:profiles!reservation_guests_user_id_fkey(id, username, full_name, avatar_url))
        `)
        .eq("business_id", businessId)
        .gte("reservation_date", from)
        .lte("reservation_date", to)
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });

      if (error) throw error;
      return data as unknown as ReservationWithGuests[];
    },
    enabled: !!businessId,
  });
};

export const useCancelReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reservationId,
    }: {
      reservationId: string;
      cancelledBy?: "user" | "business";
    }) => {
      const { error } = await supabase.rpc("set_reservation_status", {
        _reservation_id: reservationId,
        _status: "cancelled",
      });
      if (error) throw error;
      return reservationId;
    },
    onSuccess: (reservationId) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-detail"] });
      queryClient.invalidateQueries({ queryKey: ["slot-availability"] });
      toast.success("Reserva cancelada");
      sendReservationEmails(reservationId, "cancelled");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Error al cancelar la reserva");
    },
  });
};

export type ReservationStatus =
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";

const STATUS_TOAST: Record<ReservationStatus, string> = {
  confirmed: "Reserva reactivada",
  seated: "Mesa marcada como sentada",
  completed: "Reserva completada",
  cancelled: "Reserva cancelada",
  no_show: "Marcada como no-show",
};

/** Business-side lifecycle actions: seated / completed / no_show / cancelled. */
export const useSetReservationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reservationId,
      status,
    }: {
      reservationId: string;
      status: ReservationStatus;
    }) => {
      const { error } = await supabase.rpc("set_reservation_status", {
        _reservation_id: reservationId,
        _status: status,
      });
      if (error) throw error;
      return { status, reservationId };
    },
    onSuccess: ({ status, reservationId }) => {
      haptic("success");
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-detail"] });
      queryClient.invalidateQueries({ queryKey: ["slot-availability"] });
      toast.success(STATUS_TOAST[status]);
      if (status === "cancelled") sendReservationEmails(reservationId, "cancelled");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Error al actualizar la reserva");
    },
  });
};

interface UpdateReservationParams {
  reservationId: string;
  business_id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  notes?: string;
}

/**
 * Modify an existing reservation through the validated booking function,
 * which re-checks schedule, lead time, table availability and pacing.
 */
export const useUpdateReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateReservationParams) => {
      const { data, error } = await supabase.rpc("create_reservation", {
        _business_id: params.business_id,
        _date: params.reservation_date,
        _time: params.reservation_time,
        _party_size: params.party_size,
        _notes: params.notes ?? null,
        _guest_ids: null,
        _reservation_id: params.reservationId,
      });

      if (error) throw error;
      return { id: data as string };
    },
    onSuccess: () => {
      haptic("success");
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-detail"] });
      queryClient.invalidateQueries({ queryKey: ["slot-availability"] });
      toast.success("Reserva actualizada");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Error al actualizar la reserva");
    },
  });
};

export const useReservationGuests = (reservationId: string | undefined) => {
  return useQuery({
    queryKey: ["reservation-guests", reservationId],
    queryFn: async () => {
      if (!reservationId) return [];
      const { data, error } = await supabase
        .from("reservation_guests")
        .select("user_id, user:profiles!reservation_guests_user_id_fkey(id, username, full_name, avatar_url)")
        .eq("reservation_id", reservationId);
      if (error) throw error;
      return data;
    },
    enabled: !!reservationId,
  });
};

export const useReservationDetail = (reservationId: string | undefined) => {
  return useQuery({
    queryKey: ["reservation-detail", reservationId],
    queryFn: async () => {
      if (!reservationId) return null;

      const { data: reservation, error } = await supabase
        .from("reservations")
        .select("*, business:profiles!reservations_business_id_fkey(id, username, full_name, avatar_url, business_address)")
        .eq("id", reservationId)
        .single();

      if (error) throw error;

      const { data: guests, error: guestsError } = await supabase
        .from("reservation_guests")
        .select("user_id, user:profiles!reservation_guests_user_id_fkey(id, username, full_name, avatar_url)")
        .eq("reservation_id", reservationId);

      if (guestsError) throw guestsError;

      return {
        reservation: reservation as any,
        guests: guests as any[],
      };
    },
    enabled: !!reservationId,
  });
};

