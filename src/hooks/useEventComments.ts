import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export const useEventComments = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event-comments", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await (supabase as any)
        .from("event_comments")
        .select(`
          id, event_id, user_id, content, created_at, deleted_at,
          user:profiles!user_id(id, username, avatar_url)
        `)
        .eq("event_id", eventId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as EventComment[];
    },
    enabled: !!eventId,
  });
};

export const useCommentCount = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event-comment-count", eventId],
    queryFn: async () => {
      if (!eventId) return 0;
      const { count, error } = await (supabase as any)
        .from("event_comments")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .is("deleted_at", null);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!eventId,
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ eventId, content }: { eventId: string; content: string }) => {
      if (!user) throw new Error("Debes iniciar sesión para comentar");
      const { data, error } = await (supabase as any)
        .from("event_comments")
        .insert({ event_id: eventId, user_id: user.id, content: content.trim() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-comments", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-comment-count", eventId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al publicar comentario");
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, eventId }: { commentId: string; eventId: string }) => {
      const { error } = await (supabase as any)
        .from("event_comments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", commentId);
      if (error) throw error;
      return { commentId, eventId };
    },
    onSuccess: ({ eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-comments", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-comment-count", eventId] });
      toast.success("Comentario eliminado");
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al eliminar comentario");
    },
  });
};
