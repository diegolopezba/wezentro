import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Live updates for table & schedule editors: if the owner edits their
 * inventory from another session/device, this one refetches instead of
 * overwriting stale data. Only mounted in owner-facing settings UI.
 */
export const useReservationConfigRealtime = (businessId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`reservation-config-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `business_id=eq.${businessId}`,
        },
        () =>
          queryClient.invalidateQueries({
            queryKey: ["restaurant-tables", businessId],
          }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservation_schedules",
          filter: `business_id=eq.${businessId}`,
        },
        () =>
          queryClient.invalidateQueries({
            queryKey: ["reservation-schedules", businessId],
          }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);
};

export interface RestaurantTable {
  id: string;
  business_id: string;
  name: string;
  seats: number;
  zone: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface ReservationPolicy {
  business_id: string;
  turn_time_minutes: number;
  min_lead_minutes: number;
  max_party_size: number;
  cancellation_window_hours: number;
  max_covers_per_interval: number | null;
  allow_table_join: boolean;
  arrival_grace_minutes: number;
}

export interface ReservationSchedule {
  id: string;
  business_id: string;
  weekday: number;
  shift_name: string | null;
  start_time: string;
  end_time: string;
  is_closed: boolean;
}

export interface ReservationBlackout {
  id: string;
  business_id: string;
  blackout_date: string;
  reason: string | null;
}

export const DEFAULT_POLICY: Omit<ReservationPolicy, "business_id"> = {
  turn_time_minutes: 90,
  min_lead_minutes: 60,
  max_party_size: 12,
  cancellation_window_hours: 2,
  max_covers_per_interval: null,
  allow_table_join: true,
  arrival_grace_minutes: 15,
};

/* ---------------------------------- tables --------------------------------- */

export const useRestaurantTables = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["restaurant-tables", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("business_id", businessId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as RestaurantTable[];
    },
  });

export const useUpsertTable = (businessId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (table: Partial<RestaurantTable> & { name: string; seats: number }) => {
      const payload = {
        id: table.id,
        business_id: businessId!,
        name: table.name,
        seats: table.seats,
        zone: table.zone ?? null,
        is_active: table.is_active ?? true,
        sort_order: table.sort_order ?? 0,
      };
      const { error } = await supabase.from("restaurant_tables").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant-tables", businessId] });
      qc.invalidateQueries({ queryKey: ["slot-availability"] });
    },
    onError: (e: any) => toast.error(e?.message || "Error al guardar la mesa"),
  });
};

export const useBulkCreateTables = (businessId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      count,
      seats,
      zone,
      startIndex,
    }: {
      count: number;
      seats: number;
      zone?: string | null;
      startIndex: number;
    }) => {
      const rows = Array.from({ length: count }, (_, i) => ({
        business_id: businessId!,
        name: `Mesa ${startIndex + i}`,
        seats,
        zone: zone || null,
        sort_order: startIndex + i,
      }));
      const { error } = await supabase.from("restaurant_tables").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant-tables", businessId] });
      qc.invalidateQueries({ queryKey: ["slot-availability"] });
      toast.success("Mesas agregadas");
    },
    onError: (e: any) => toast.error(e?.message || "Error al agregar mesas"),
  });
};

export const useDeleteTable = (businessId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant-tables", businessId] });
      qc.invalidateQueries({ queryKey: ["slot-availability"] });
    },
    onError: (e: any) => toast.error(e?.message || "Error al eliminar la mesa"),
  });
};

/* --------------------------------- policy --------------------------------- */

export const useReservationPolicy = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["reservation-policy", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservation_policies")
        .select("*")
        .eq("business_id", businessId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ReservationPolicy | null) ?? {
        business_id: businessId!,
        ...DEFAULT_POLICY,
      };
    },
  });

export const useSaveReservationPolicy = (businessId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (policy: Partial<ReservationPolicy>) => {
      const { error } = await supabase
        .from("reservation_policies")
        .upsert({ business_id: businessId!, ...DEFAULT_POLICY, ...policy });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservation-policy", businessId] });
      qc.invalidateQueries({ queryKey: ["slot-availability"] });
      toast.success("Reglas guardadas");
    },
    onError: (e: any) => toast.error(e?.message || "Error al guardar las reglas"),
  });
};

/* -------------------------------- schedules -------------------------------- */

export const useReservationSchedules = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["reservation-schedules", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservation_schedules")
        .select("*")
        .eq("business_id", businessId!)
        .order("weekday")
        .order("start_time");
      if (error) throw error;
      return (data || []) as ReservationSchedule[];
    },
  });

export const useSaveSchedules = (businessId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Omit<ReservationSchedule, "id" | "business_id">[]) => {
      const { error: delError } = await supabase
        .from("reservation_schedules")
        .delete()
        .eq("business_id", businessId!);
      if (delError) throw delError;
      if (rows.length > 0) {
        const { error } = await supabase
          .from("reservation_schedules")
          .insert(rows.map((r) => ({ ...r, business_id: businessId! })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservation-schedules", businessId] });
      qc.invalidateQueries({ queryKey: ["slot-availability"] });
      toast.success("Horarios guardados");
    },
    onError: (e: any) => toast.error(e?.message || "Error al guardar horarios"),
  });
};

/* -------------------------------- blackouts -------------------------------- */

export const useReservationBlackouts = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["reservation-blackouts", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservation_blackouts")
        .select("*")
        .eq("business_id", businessId!)
        .gte("blackout_date", new Date().toISOString().split("T")[0])
        .order("blackout_date");
      if (error) throw error;
      return (data || []) as ReservationBlackout[];
    },
  });

export const useToggleBlackout = (businessId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, existingId }: { date: string; existingId?: string }) => {
      if (existingId) {
        const { error } = await supabase
          .from("reservation_blackouts")
          .delete()
          .eq("id", existingId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("reservation_blackouts")
        .insert({ business_id: businessId!, blackout_date: date });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservation-blackouts", businessId] });
      qc.invalidateQueries({ queryKey: ["slot-availability"] });
    },
    onError: (e: any) => toast.error(e?.message || "Error al actualizar los días cerrados"),
  });
};

/* -------------------------------- waitlist --------------------------------- */

export const useJoinWaitlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      business_id: string;
      desired_date: string;
      desired_time: string;
      party_size: number;
      user_id: string;
    }) => {
      const { error } = await supabase.from("reservation_waitlist").insert({
        business_id: params.business_id,
        user_id: params.user_id,
        desired_date: params.desired_date,
        desired_time: params.desired_time,
        party_size: params.party_size,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservation-waitlist"] });
      toast.success("Te avisaremos si se libera una mesa");
    },
    onError: (e: any) => toast.error(e?.message || "Error al unirte a la lista de espera"),
  });
};

export const useBusinessWaitlist = (businessId: string | undefined, date?: string) =>
  useQuery({
    queryKey: ["reservation-waitlist", businessId, date ?? null],
    enabled: !!businessId,
    queryFn: async () => {
      let q = supabase
        .from("reservation_waitlist")
        .select("*, user:profiles!reservation_waitlist_user_id_fkey(id, username, full_name, avatar_url)")
        .eq("business_id", businessId!)
        .eq("status", "waiting")
        .gte("desired_date", new Date().toISOString().split("T")[0])
        .order("desired_date");
      if (date) q = q.eq("desired_date", date);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
