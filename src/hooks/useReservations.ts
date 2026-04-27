import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

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

export const useCreateReservation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateReservationParams) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reservations")
        .insert({
          business_id: params.business_id,
          user_id: user.id,
          reservation_date: params.reservation_date,
          reservation_time: params.reservation_time,
          party_size: params.party_size,
          notes: params.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert tagged guests
      if (params.tagged_user_ids && params.tagged_user_ids.length > 0) {
        const guestRows = params.tagged_user_ids.map((uid) => ({
          reservation_id: data.id,
          user_id: uid,
        }));
        await supabase.from("reservation_guests").insert(guestRows);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      haptic("success");
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({
        queryKey: ["available-capacity", variables.business_id],
      });
      toast.success("¡Reserva confirmada!");
    },
    onError: (error: any) => {
      console.error("Error creating reservation:", error);
      toast.error("Error al crear la reserva");
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

export const useCancelReservation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reservationId,
      cancelledBy,
    }: {
      reservationId: string;
      cancelledBy: "user" | "business";
    }) => {
      const { error } = await supabase
        .from("reservations")
        .update({
          status: "cancelled",
          cancelled_by: cancelledBy,
        })
        .eq("id", reservationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["slot-availability"] });
      toast.success("Reserva cancelada");
    },
    onError: () => {
      toast.error("Error al cancelar la reserva");
    },
  });
};

interface UpdateReservationParams {
  reservationId: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  notes?: string;
}

/**
 * Modify an existing reservation. Allowed only when the reservation
 * starts more than 2 hours in the future. Reminders are auto-refreshed
 * by a database trigger when date/time/status change.
 */
export const useUpdateReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateReservationParams) => {
      const newWhen = new Date(`${params.reservation_date}T${params.reservation_time}`);
      if (newWhen.getTime() - Date.now() < 2 * 60 * 60 * 1000) {
        throw new Error("Solo puedes modificar con más de 2 horas de anticipación");
      }

      const { data, error } = await supabase
        .from("reservations")
        .update({
          reservation_date: params.reservation_date,
          reservation_time: params.reservation_time,
          party_size: params.party_size,
          notes: params.notes ?? null,
        })
        .eq("id", params.reservationId)
        .select()
        .single();

      if (error) throw error;
      return data;
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

export const useAvailableCapacity = (
  businessId: string | undefined,
  date: string | undefined,
  time: string | undefined
) => {
  return useQuery({
    queryKey: ["available-capacity", businessId, date, time],
    queryFn: async () => {
      if (!businessId || !date || !time) return null;

      // Get business capacity
      const { data: profile } = await supabase
        .from("profiles")
        .select("reservation_capacity")
        .eq("id", businessId)
        .single();

      const capacity = profile?.reservation_capacity;
      if (!capacity) return { capacity: null, booked: 0, available: null };

      // Count existing reservations for that date/time
      const { data: reservations, error } = await supabase
        .from("reservations")
        .select("party_size")
        .eq("business_id", businessId)
        .eq("reservation_date", date)
        .eq("reservation_time", time)
        .eq("status", "confirmed");

      if (error) throw error;

      const booked = (reservations || []).reduce(
        (sum, r) => sum + r.party_size,
        0
      );

      return {
        capacity,
        booked,
        available: Math.max(0, capacity - booked),
      };
    },
    enabled: !!businessId && !!date && !!time,
  });
};
