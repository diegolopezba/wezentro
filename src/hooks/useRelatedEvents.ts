import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EventWithCreator } from "@/hooks/useEvents";
import { useBlockedIds } from "@/hooks/useBlockedUsers";

export const useRelatedEvents = (
  eventId: string | undefined,
  category: string | null | undefined,
  creatorId: string | undefined
) => {
  const { data: blockedIds } = useBlockedIds();

  return useQuery({
    queryKey: ["related-events", eventId, category, creatorId, blockedIds?.size ?? 0],
    queryFn: async () => {
      if (!eventId) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch events by same category OR same creator, recent, exclude current
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("is_public", true)
        .is("deleted_at", null)
        .neq("id", eventId)
        .or(
          [
            category ? `category.eq.${category}` : null,
            creatorId ? `creator_id.eq.${creatorId}` : null,
          ]
            .filter(Boolean)
            .join(",") || `id.neq.${eventId}`
        )
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      const events = (data || []) as EventWithCreator[];
      if (blockedIds && blockedIds.size > 0) {
        return events.filter((e) => !blockedIds.has(e.creator_id));
      }
      return events;
    },
    enabled: !!eventId && (!!category || !!creatorId),
    staleTime: 5 * 60 * 1000,
  });
};
