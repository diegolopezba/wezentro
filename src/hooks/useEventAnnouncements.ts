import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EventAnnouncement {
  id: string;
  event_id: string;
  title: string;
  body: string;
  scheduled_for: string | null;
  status: string;
  recipient_count: number;
  sent_at: string | null;
  created_at: string;
}

export interface AnnouncementPreview {
  recipient_count: number;
  used_today: number;
  daily_limit: number;
  remaining: number;
}

/** Audience size + how many messages the organizer already sent today. */
export const useAnnouncementPreview = (eventId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ["event-announcement-preview", eventId],
    enabled: !!eventId && enabled,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<AnnouncementPreview> => {
      const { data, error } = await supabase.functions.invoke("send-event-announcement", {
        body: { action: "preview", eventId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as AnnouncementPreview;
    },
  });
};

/** Sent + scheduled message history for an event. */
export const useEventAnnouncements = (eventId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ["event-announcements", eventId],
    enabled: !!eventId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_announcements")
        .select("id, event_id, title, body, scheduled_for, status, recipient_count, sent_at, created_at")
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as EventAnnouncement[];
    },
  });
};

export const useSendEventAnnouncement = (eventId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { title: string; body: string; scheduledFor?: string | null }) => {
      const { data, error } = await supabase.functions.invoke("send-event-announcement", {
        body: {
          action: "send",
          eventId,
          title: input.title,
          body: input.body,
          scheduledFor: input.scheduledFor ?? null,
        },
      });
      if (error) throw error;
      if (data?.error) {
        throw new Error(
          data.error === "daily_limit_reached"
            ? "Ya enviaste 3 mensajes hoy para este evento"
            : data.error,
        );
      }
      return data as { scheduled?: boolean; recipient_count?: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-announcements", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-announcement-preview", eventId] });
    },
  });
};

export const useCancelEventAnnouncement = (eventId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcementId: string) => {
      const { data, error } = await supabase.functions.invoke("send-event-announcement", {
        body: { action: "cancel", eventId, announcementId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-announcements", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-announcement-preview", eventId] });
    },
  });
};
