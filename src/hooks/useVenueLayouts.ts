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
  "#E60023",
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

/** Shape shared by template areas, event areas and in-editor drafts. */
export interface DraftArea {
  /** Local id while editing; equals the DB id for persisted rows. */
  id: string;
  name: string;
  area_type: VenueAreaType;
  capacity: number;
  is_exclusive: boolean;
  price: number | null;
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

export const cancelAreaBooking = async (bookingId: string) => {
  await db.from("area_bookings").update({ status: "cancelled" }).eq("id", bookingId);
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

