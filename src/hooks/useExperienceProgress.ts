import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExperienceProgress {
  goal: number | null;
  goalYear: number | null;
  currentYear: number;
  count: number;
  percent: number;
  pace: "ahead" | "on_track" | "behind" | "complete";
  breakdown: {
    checkIns: number;
    reservations: number;
    posts: number;
  };
  yearProgressPercent: number;
}

const yearBounds = (year: number) => {
  const start = `${year}-01-01T00:00:00.000Z`;
  const end = `${year + 1}-01-01T00:00:00.000Z`;
  return { start, end };
};

const yearProgressPercent = (year: number) => {
  const now = new Date();
  if (now.getFullYear() !== year) return now.getFullYear() > year ? 100 : 0;
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  return ((now.getTime() - start) / (end - start)) * 100;
};

export const useExperienceProgress = (
  userId: string | undefined,
  goal: number | null | undefined,
  goalYear: number | null | undefined
) => {
  const currentYear = new Date().getFullYear();
  const activeYear = goalYear ?? currentYear;

  return useQuery({
    queryKey: ["experience-progress", userId, goal, goalYear, currentYear],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<ExperienceProgress> => {
      if (!userId) throw new Error("no user");

      const { start, end } = yearBounds(activeYear);
      const todayISO = new Date().toISOString().slice(0, 10);

      // 1. Verified check-ins: guestlist entries with checked_in_at within year, dedupe by event_id
      // 2. Past confirmed reservations within year, dedupe by (business_id, date)
      // 3. Posts/events created within year
      const [checkInsRes, reservationsRes, postsRes] = await Promise.all([
        supabase
          .from("guestlist_entries")
          .select("event_id, checked_in_at")
          .eq("user_id", userId)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", start)
          .lt("checked_in_at", end),
        supabase
          .from("reservations")
          .select("business_id, reservation_date, status")
          .eq("user_id", userId)
          .eq("status", "confirmed")
          .gte("reservation_date", start.slice(0, 10))
          .lt("reservation_date", end.slice(0, 10))
          .lte("reservation_date", todayISO),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", userId)
          .is("deleted_at", null)
          .gte("created_at", start)
          .lt("created_at", end),
      ]);

      const uniqueCheckIns = new Set(
        (checkInsRes.data || []).map((r: any) => r.event_id)
      ).size;

      const uniqueReservations = new Set(
        (reservationsRes.data || []).map(
          (r: any) => `${r.business_id}|${r.reservation_date}`
        )
      ).size;

      const postCount = postsRes.count || 0;
      const count = uniqueCheckIns + uniqueReservations + postCount;

      const effectiveGoal = goal && goal > 0 ? goal : null;
      const percent = effectiveGoal
        ? Math.min(100, Math.round((count / effectiveGoal) * 100))
        : 0;

      const yearPct = yearProgressPercent(activeYear);
      let pace: ExperienceProgress["pace"] = "on_track";
      if (effectiveGoal && count >= effectiveGoal) {
        pace = "complete";
      } else if (effectiveGoal) {
        const rawPct = (count / effectiveGoal) * 100;
        if (rawPct >= yearPct + 10) pace = "ahead";
        else if (rawPct <= yearPct - 10) pace = "behind";
      }

      return {
        goal: effectiveGoal,
        goalYear: goalYear ?? null,
        currentYear,
        count,
        percent,
        pace,
        breakdown: {
          checkIns: uniqueCheckIns,
          reservations: uniqueReservations,
          posts: postCount,
        },
        yearProgressPercent: yearPct,
      };
    },
  });
};
