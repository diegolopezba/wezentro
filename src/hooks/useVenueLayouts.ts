import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VenueAreaType =
  | "table"
  | "lounge"
  | "long_table"
  | "section"
  | "general_admission";

export const AREA_TYPE_LABELS: Record<VenueAreaType, string> = {
  table: "Mesa",
  lounge: "Lounge",
  long_table: "Mesa larga",
  section: "Sección",
  general_admission: "General",
};

/** Areas that are usually bought as a whole unit. */
export const AREA_TYPE_DEFAULT_EXCLUSIVE: Record<VenueAreaType, boolean> = {
  table: true,
  lounge: true,
  long_table: false,
  section: false,
  general_admission: false,
};

export const AREA_COLORS = [
  "#F5F5F5",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#64748B",
];

export const CANVAS_UNITS = 1000;

export interface VenueLayout {
  id: string;
  business_id: string;
  name: string;
  canvas_width: number;
  canvas_height: number;
  created_at: string;
  updated_at: string;
}

export type AreaShape = "rect" | "circle";

/** Elementos no vendibles que solo dan contexto visual al plano. */
export const DECOR_PRESETS: {
  key: string;
  label: string;
  width: number;
  height: number;
  shape: AreaShape;
}[] = [
  { key: "stage", label: "Escenario", width: 400, height: 140, shape: "rect" },
  { key: "bar", label: "Barra", width: 320, height: 100, shape: "rect" },
  { key: "dj", label: "DJ", width: 140, height: 140, shape: "circle" },
  { key: "dancefloor", label: "Pista", width: 300, height: 300, shape: "rect" },
  { key: "entrance", label: "Entrada", width: 180, height: 80, shape: "rect" },
  { key: "restrooms", label: "Baños", width: 160, height: 120, shape: "rect" },
  { key: "other", label: "Otro", width: 200, height: 120, shape: "rect" },
];

/** Shape shared by template areas, event areas and in-editor drafts. */
export interface DraftArea {
  /** Local id while editing; equals the DB id for persisted rows. */
  id: string;
  name: string;
  area_type: VenueAreaType;
  capacity: number;
  is_exclusive: boolean;
  price: number | null;
  /** Entradas incluidas con la reserva del área (0/null = ninguna). */
  included_tickets?: number | null;
  /** Forma dibujada en el plano. */
  shape?: AreaShape;
  /** true = elemento decorativo (escenario, barra…), no reservable. */
  is_decor?: boolean;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  display_order: number;
  /** Only set when the draft came from a saved template area. */
  source_layout_area_id?: string | null;
}

export interface EventArea extends DraftArea {
  event_id: string;
  is_active: boolean;
  price: number;
}

export interface AreaAvailability {
  event_area_id: string;
  capacity: number;
  is_exclusive: boolean;
  taken: number;
  remaining: number;
  state: "available" | "partial" | "unavailable";
}

const db = supabase as any;

export const makeDraftArea = (
  overrides: Partial<DraftArea> = {},
  index = 0,
): DraftArea => {
  const type = (overrides.area_type ?? "table") as VenueAreaType;
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Mesa ${index + 1}`,
    area_type: type,
    capacity: 4,
    is_exclusive: AREA_TYPE_DEFAULT_EXCLUSIVE[type],
    price: null,
    pos_x: 60,
    pos_y: 60,
    width: 160,
    height: 160,
    rotation: 0,
    color: AREA_COLORS[0],
    display_order: index,
    ...overrides,
  };
};

/* ─────────────────────────── Layout templates ─────────────────────────── */

export const useVenueLayouts = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["venue-layouts", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<VenueLayout[]> => {
      const { data, error } = await db
        .from("venue_layouts")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VenueLayout[];
    },
  });

export const useVenueLayoutAreas = (layoutId: string | undefined) =>
  useQuery({
    queryKey: ["venue-layout-areas", layoutId],
    enabled: !!layoutId,
    queryFn: async (): Promise<DraftArea[]> => {
      const { data, error } = await db
        .from("venue_layout_areas")
        .select("*")
        .eq("layout_id", layoutId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((a) => ({
        ...a,
        price: a.default_price != null ? Number(a.default_price) : null,
        source_layout_area_id: a.id,
      })) as DraftArea[];
    },
  });

/** Create or update a template, replacing its areas wholesale. */
export const useSaveVenueLayout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      layoutId,
      businessId,
      name,
      areas,
    }: {
      layoutId?: string | null;
      businessId: string;
      name: string;
      areas: DraftArea[];
    }): Promise<string> => {
      let id = layoutId ?? null;
      if (id) {
        const { error } = await db
          .from("venue_layouts")
          .update({ name })
          .eq("id", id);
        if (error) throw error;
        const { error: delErr } = await db
          .from("venue_layout_areas")
          .delete()
          .eq("layout_id", id);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await db
          .from("venue_layouts")
          .insert({
            business_id: businessId,
            name,
            canvas_width: CANVAS_UNITS,
            canvas_height: CANVAS_UNITS,
          })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id as string;
      }

      if (areas.length > 0) {
        const rows = areas.map((a, i) => ({
          layout_id: id,
          name: a.name,
          area_type: a.area_type,
          capacity: a.capacity,
          is_exclusive: a.is_exclusive,
          included_tickets: a.included_tickets ?? null,
          pos_x: a.pos_x,
          pos_y: a.pos_y,
          width: a.width,
          height: a.height,
          rotation: a.rotation,
          color: a.color,
          display_order: i,
          default_price: a.price,
        }));
        const { error } = await db.from("venue_layout_areas").insert(rows);
        if (error) throw error;
      }
      return id!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venue-layouts"] });
      qc.invalidateQueries({ queryKey: ["venue-layout-areas"] });
    },
  });
};

export const useDeleteVenueLayout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (layoutId: string) => {
      const { error } = await db.from("venue_layouts").delete().eq("id", layoutId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["venue-layouts"] }),
  });
};

/* ───────────────────────────── Event areas ───────────────────────────── */

export const useEventAreas = (eventId: string | undefined) =>
  useQuery({
    queryKey: ["event-areas", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<EventArea[]> => {
      const { data, error } = await db
        .from("event_areas")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((a) => ({
        ...a,
        price: Number(a.price ?? 0),
      })) as EventArea[];
    },
    staleTime: 30_000,
  });

export const useEventAreaAvailability = (
  eventId: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: ["event-area-availability", eventId],
    enabled: !!eventId && enabled,
    refetchInterval: 15_000,
    staleTime: 5_000,
    queryFn: async (): Promise<AreaAvailability[]> => {
      const { data, error } = await db.rpc("get_event_area_availability", {
        _event_id: eventId,
      });
      if (error) throw error;
      return (data ?? []) as AreaAvailability[];
    },
  });

/** Replace all areas of an event with the given drafts. */
export const useReplaceEventAreas = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      areas,
    }: {
      eventId: string;
      areas: DraftArea[];
    }) => {
      const { error: delErr } = await db
        .from("event_areas")
        .delete()
        .eq("event_id", eventId);
      if (delErr) throw delErr;
      if (areas.length === 0) return;
      const rows = areas.map((a, i) => ({
        event_id: eventId,
        source_layout_area_id: a.source_layout_area_id ?? null,
        name: a.name,
        area_type: a.area_type,
        capacity: a.capacity,
        is_exclusive: a.is_exclusive,
        included_tickets: a.included_tickets ?? null,
        price: a.price ?? 0,
        pos_x: a.pos_x,
        pos_y: a.pos_y,
        width: a.width,
        height: a.height,
        rotation: a.rotation,
        color: a.color,
        display_order: i,
        is_active: true,
      }));
      const { error } = await db.from("event_areas").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["event-areas", vars.eventId] });
    },
  });
};

/* ────────────────────────────── Booking ────────────────────────────── */

const HOLD_ERRORS: Record<string, string> = {
  area_taken: "Alguien acaba de reservar esta área.",
  area_capacity_exceeded: "Ya no quedan tantos lugares en esta área.",
  area_not_available: "Esta área ya no está disponible.",
  auth_required: "Inicia sesión para continuar.",
  invalid_party_size: "Número de personas inválido.",
};

/** Atomically hold an area for ~10 minutes. Throws a friendly error on conflict. */
export const holdEventArea = async (
  eventAreaId: string,
  partySize: number,
): Promise<{ id: string; hold_expires_at: string | null }> => {
  const { data, error } = await db.rpc("hold_event_area", {
    _event_area_id: eventAreaId,
    _party_size: partySize,
  });
  if (error) {
    const key = Object.keys(HOLD_ERRORS).find((k) =>
      (error.message || "").includes(k),
    );
    throw new Error(key ? HOLD_ERRORS[key] : "No se pudo reservar esta área.");
  }
  return data as any;
};

export const cancelAreaBooking = async (
  bookingId: string,
  options: { cancelledBy?: "user" | "business"; reason?: string } = {},
) => {
  const { error } = await db
    .from("area_bookings")
    .update({
      status: "cancelled",
      cancelled_by: options.cancelledBy ?? "user",
      cancellation_reason: options.reason ?? null,
    })
    .eq("id", bookingId);
  if (error) throw error;
};

/* ───────────────────── Business booking management ───────────────────── */

export interface EventAreaBooking {
  id: string;
  event_area_id: string;
  area_name: string;
  user_id: string;
  party_size: number;
  included_tickets: number;
  status: "held" | "confirmed" | "cancelled" | "checked_in" | "no_show";
  cancelled_by: "user" | "business" | null;
  cancellation_reason: string | null;
  hold_expires_at: string | null;
  created_at: string;
  buyer_username: string | null;
  buyer_full_name: string | null;
  buyer_avatar_url: string | null;
  amount: number | null;
  payment_method: string | null;
}

/** All bookings for an event's areas (owner view; RLS restricts to owners). */
export const useEventAreaBookings = (eventId: string | undefined) =>
  useQuery({
    queryKey: ["event-area-bookings", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<EventAreaBooking[]> => {
      const { data: areas, error: aErr } = await db
        .from("event_areas")
        .select("id, name")
        .eq("event_id", eventId);
      if (aErr) throw aErr;
      const areaIds = (areas ?? []).map((a: any) => a.id);
      if (areaIds.length === 0) return [];
      const areaName: Record<string, string> = {};
      for (const a of areas ?? []) areaName[a.id] = a.name;

      const { data, error } = await db
        .from("area_bookings")
        .select(
          "id, event_area_id, user_id, party_size, included_tickets, status, cancelled_by, cancellation_reason, hold_expires_at, created_at, payment_session_id, profiles:user_id(username, full_name, avatar_url), payment_sessions:payment_session_id(amount, payment_method)",
        )
        .in("event_area_id", areaIds)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return ((data ?? []) as any[]).map((b) => ({
        id: b.id,
        event_area_id: b.event_area_id,
        area_name: areaName[b.event_area_id] ?? "Área",
        user_id: b.user_id,
        party_size: b.party_size,
        included_tickets: b.included_tickets ?? 0,
        status: b.status,
        cancelled_by: b.cancelled_by,
        cancellation_reason: b.cancellation_reason,
        hold_expires_at: b.hold_expires_at,
        created_at: b.created_at,
        buyer_username: b.profiles?.username ?? null,
        buyer_full_name: b.profiles?.full_name ?? null,
        buyer_avatar_url: b.profiles?.avatar_url ?? null,
        amount: b.payment_sessions?.amount != null ? Number(b.payment_sessions.amount) : null,
        payment_method: b.payment_sessions?.payment_method ?? null,
      }));
    },
    staleTime: 10_000,
  });

export type AreaBookingAction = "checked_in" | "no_show";

export const useSetAreaBookingStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      status,
    }: {
      bookingId: string;
      status: AreaBookingAction;
    }) => {
      const { error } = await db
        .from("area_bookings")
        .update({ status })
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-area-bookings"] });
      qc.invalidateQueries({ queryKey: ["event-area-availability"] });
    },
  });
};

export const useCancelAreaBookingAsBusiness = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      reason,
    }: {
      bookingId: string;
      reason: string;
    }) => {
      await cancelAreaBooking(bookingId, {
        cancelledBy: "business",
        reason: reason || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-area-bookings"] });
      qc.invalidateQueries({ queryKey: ["event-area-availability"] });
    },
  });
};

/** Realtime owner-only: refresca la lista de reservas de áreas del evento. */
export const useEventAreaBookingsRealtime = (eventId: string | undefined) => {
  const qc = useQueryClient();
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`event-area-bookings:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "area_bookings" },
        () => {
          qc.invalidateQueries({ queryKey: ["event-area-bookings", eventId] });
          qc.invalidateQueries({
            queryKey: ["event-area-availability", eventId],
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, qc]);
};

/** Confirm a hold on a free (price 0) area — no payment involved. */
export const confirmFreeAreaBooking = async (bookingId: string) => {
  const { error } = await db.rpc("confirm_free_area_booking", {
    _booking_id: bookingId,
  });
  if (error) {
    const msg = error.message || "";
    if (msg.includes("hold_expired"))
      throw new Error("Tu reserva expiró, elegí el área de nuevo.");
    throw new Error("No se pudo confirmar tu lugar.");
  }
};

