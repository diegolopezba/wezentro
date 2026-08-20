import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

/** Bookable experience owned by a business (tours, clases, buceo, etc.). */
export interface Experience {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  duration_minutes: number;
  location_note: string | null;
  is_active: boolean;
}

export interface ExperienceSegment {
  id: string;
  experience_id: string;
  name: string;
  description: string | null;
  price: number;
  max_per_booking: number | null;
  display_order: number;
  is_active: boolean;
}

export interface ExperienceSchedule {
  id: string;
  experience_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_interval_minutes: number;
  is_closed: boolean;
}

export interface ExperiencePolicies {
  experience_id: string;
  spots_per_slot: number;
  min_lead_minutes: number;
  cancellation_window_hours: number;
  max_per_booking: number;
}

const db = supabase as any;

/* ------------------------------- reads ------------------------------- */

export const useBusinessExperiences = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["experiences", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<Experience[]> => {
      const { data, error } = await db
        .from("experiences")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Experience[];
    },
  });

/** Public list used by guests: only active experiences. */
export const usePublicExperiences = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["experiences", "public", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<Experience[]> => {
      const { data, error } = await db
        .from("experiences")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Experience[];
    },
  });

/** Single experience by id (used to render the booking CTA on a linked post). */
export const useExperience = (experienceId: string | undefined | null) =>
  useQuery({
    queryKey: ["experience", experienceId],
    enabled: !!experienceId,
    queryFn: async (): Promise<Experience | null> => {
      const { data, error } = await db
        .from("experiences")
        .select("*")
        .eq("id", experienceId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Experience | null;
    },
  });


export const useExperienceConfig = (experienceId: string | undefined) =>
  useQuery({
    queryKey: ["experience-config", experienceId],
    enabled: !!experienceId,
    queryFn: async () => {
      const [segments, schedules, policies] = await Promise.all([
        db.from("experience_segments").select("*").eq("experience_id", experienceId).order("display_order"),
        db.from("experience_schedules").select("*").eq("experience_id", experienceId).order("weekday"),
        db.from("experience_policies").select("*").eq("experience_id", experienceId).maybeSingle(),
      ]);
      if (segments.error) throw segments.error;
      if (schedules.error) throw schedules.error;
      if (policies.error) throw policies.error;
      return {
        segments: (segments.data ?? []) as ExperienceSegment[],
        schedules: (schedules.data ?? []) as ExperienceSchedule[],
        policies: (policies.data ?? null) as ExperiencePolicies | null,
      };
    },
  });

/* ------------------------------ writes ------------------------------- */

export interface ExperienceDraft {
  id?: string;
  business_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  duration_minutes: number;
  location_note?: string | null;
  is_active: boolean;
  segments: Array<{ name: string; price: number; description?: string | null }>;
  weekdays: number[];
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  slot_interval_minutes: number;
  spots_per_slot: number;
  min_lead_minutes: number;
  max_per_booking: number;
}

/** Saves the experience together with its segments, weekly schedule and rules. */
export const useSaveExperience = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: ExperienceDraft) => {
      const payload = {
        business_id: draft.business_id,
        title: draft.title.trim(),
        description: draft.description?.trim() || null,
        image_url: draft.image_url || null,
        duration_minutes: draft.duration_minutes,
        location_note: draft.location_note?.trim() || null,
        is_active: draft.is_active,
      };

      let experienceId = draft.id;
      if (experienceId) {
        const { error } = await db.from("experiences").update(payload).eq("id", experienceId);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("experiences").insert(payload).select("id").single();
        if (error) throw error;
        experienceId = data.id as string;
      }

      // Segments: replace wholesale (simple and predictable).
      await db.from("experience_segments").delete().eq("experience_id", experienceId);
      if (draft.segments.length) {
        const { error } = await db.from("experience_segments").insert(
          draft.segments.map((s, i) => ({
            experience_id: experienceId,
            name: s.name.trim(),
            description: s.description?.trim() || null,
            price: s.price,
            display_order: i,
          })),
        );
        if (error) throw error;
      }

      // Weekly schedule: replace wholesale.
      await db.from("experience_schedules").delete().eq("experience_id", experienceId);
      if (draft.weekdays.length) {
        const { error } = await db.from("experience_schedules").insert(
          draft.weekdays.map((w) => ({
            experience_id: experienceId,
            weekday: w,
            start_time: `${draft.start_time}:00`,
            end_time: `${draft.end_time}:00`,
            slot_interval_minutes: draft.slot_interval_minutes,
          })),
        );
        if (error) throw error;
      }

      const { error: polErr } = await db.from("experience_policies").upsert(
        {
          experience_id: experienceId,
          spots_per_slot: draft.spots_per_slot,
          min_lead_minutes: draft.min_lead_minutes,
          max_per_booking: draft.max_per_booking,
        },
        { onConflict: "experience_id" },
      );
      if (polErr) throw polErr;

      return experienceId as string;
    },
    onSuccess: (_id, draft) => {
      haptic("success");
      qc.invalidateQueries({ queryKey: ["experiences"] });
      qc.invalidateQueries({ queryKey: ["experience-config", draft.id] });
      toast.success("Experiencia guardada");
    },
    onError: (e: any) => toast.error(e?.message || "No se pudo guardar la experiencia"),
  });
};

export const useDeleteExperience = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (experienceId: string) => {
      const { error } = await db.from("experiences").delete().eq("id", experienceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiences"] });
      toast.success("Experiencia eliminada");
    },
    onError: (e: any) => toast.error(e?.message || "No se pudo eliminar"),
  });
};

/* --------------------------- availability ---------------------------- */

export type ExperienceSlotStatus = "available" | "limited" | "full";

export interface ExperienceSlot {
  time: string;
  status: ExperienceSlotStatus;
  spotsLeft: number;
}

export const useExperienceAvailability = (
  experienceId: string | undefined,
  date: string | undefined,
  quantity: number,
) =>
  useQuery({
    queryKey: ["experience-availability", experienceId, date, quantity],
    enabled: !!experienceId && !!date,
    staleTime: 30_000,
    queryFn: async (): Promise<ExperienceSlot[]> => {
      const { data, error } = await db.rpc("get_experience_availability", {
        _experience_id: experienceId,
        _date: date,
        _quantity: quantity,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        time: String(r.slot_time).slice(0, 5),
        status: r.status as ExperienceSlotStatus,
        spotsLeft: Number(r.spots_left ?? 0),
      }));
    },
  });

/* ----------------------------- bookings ------------------------------ */

interface CreateBookingParams {
  experienceId: string;
  segmentId: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:MM
  quantity: number;
  notes?: string;
  guestIds?: string[];
}

/** Creates a pending booking that holds the spots for 20 minutes. */
export const useCreateExperienceBooking = () =>
  useMutation({
    mutationFn: async (p: CreateBookingParams): Promise<string> => {
      const { data, error } = await db.rpc("create_experience_booking", {
        _experience_id: p.experienceId,
        _segment_id: p.segmentId,
        _date: p.date,
        _time: `${p.time}:00`,
        _quantity: p.quantity,
        _notes: p.notes ?? null,
        _guest_ids: p.guestIds?.length ? p.guestIds : null,
      });
      if (error) throw error;
      return data as string;
    },
  });

export const useMyExperienceBookings = (userId: string | undefined) =>
  useQuery({
    queryKey: ["experience-bookings", "user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from("experience_bookings")
        .select("*, experience:experiences(id, title, image_url, business_id), segment:experience_segments(name)")
        .eq("user_id", userId)
        .neq("status", "pending_payment")
        .order("booking_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useExperienceBookingsForBusiness = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["experience-bookings", "business", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await db
        .from("experience_bookings")
        .select(
          "*, experience:experiences!inner(id, title, business_id), user:profiles!experience_bookings_user_id_fkey(id, username, full_name, avatar_url)",
        )
        .eq("experience.business_id", businessId)
        .neq("status", "pending_payment")
        .order("booking_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
