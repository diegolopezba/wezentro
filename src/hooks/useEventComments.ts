import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  parent_id: string | null;
  like_count: number;
  is_liked: boolean;
  user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

// Fetch top-level comments (parent_id IS NULL)
export const useEventComments = (eventId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["event-comments", eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await (supabase as any)
        .from("event_comments")
        .select(`
          id, event_id, user_id, content, created_at, deleted_at, parent_id,
          user:profiles!user_id(id, username, avatar_url)
        `)
        .eq("event_id", eventId)
        .is("deleted_at", null)
        .is("parent_id", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      const comments = (data || []) as EventComment[];

      // Batch fetch like counts
      const commentIds = comments.map((c) => c.id);
      if (commentIds.length === 0) return [];

      const { data: likeCounts } = await (supabase as any)
        .from("comment_likes")
        .select("comment_id")
        .in("comment_id", commentIds);

      const likeMap: Record<string, number> = {};
      (likeCounts || []).forEach((l: any) => {
        likeMap[l.comment_id] = (likeMap[l.comment_id] || 0) + 1;
      });

      // Check which ones current user liked
      let userLikedSet = new Set<string>();
      if (user) {
        const { data: userLikes } = await (supabase as any)
          .from("comment_likes")
          .select("comment_id")
          .in("comment_id", commentIds)
          .eq("user_id", user.id);
        (userLikes || []).forEach((l: any) => userLikedSet.add(l.comment_id));
      }

      return comments.map((c) => ({
        ...c,
        like_count: likeMap[c.id] || 0,
        is_liked: userLikedSet.has(c.id),
      }));
    },
    enabled: !!eventId,
    staleTime: 60_000,
  });
};

// Fetch replies for a parent comment
export const useCommentReplies = (parentId: string | undefined, eventId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["comment-replies", parentId],
    queryFn: async () => {
      if (!parentId || !eventId) return [];

      const { data, error } = await (supabase as any)
        .from("event_comments")
        .select(`
          id, event_id, user_id, content, created_at, deleted_at, parent_id,
          user:profiles!user_id(id, username, avatar_url)
        `)
        .eq("parent_id", parentId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      const replies = (data || []) as EventComment[];

      const replyIds = replies.map((c) => c.id);
      if (replyIds.length === 0) return [];

      const { data: likeCounts } = await (supabase as any)
        .from("comment_likes")
        .select("comment_id")
        .in("comment_id", replyIds);

      const likeMap: Record<string, number> = {};
      (likeCounts || []).forEach((l: any) => {
        likeMap[l.comment_id] = (likeMap[l.comment_id] || 0) + 1;
      });

      let userLikedSet = new Set<string>();
      if (user) {
        const { data: userLikes } = await (supabase as any)
          .from("comment_likes")
          .select("comment_id")
          .in("comment_id", replyIds)
          .eq("user_id", user.id);
        (userLikes || []).forEach((l: any) => userLikedSet.add(l.comment_id));
      }

      return replies.map((c) => ({
        ...c,
        like_count: likeMap[c.id] || 0,
        is_liked: userLikedSet.has(c.id),
      }));
    },
    enabled: !!parentId && !!eventId,
    staleTime: 60_000,
  });
};

// Count of replies for a parent comment
export const useReplyCount = (parentId: string | undefined) => {
  return useQuery({
    queryKey: ["comment-reply-count", parentId],
    queryFn: async () => {
      if (!parentId) return 0;
      const { count, error } = await (supabase as any)
        .from("event_comments")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", parentId)
        .is("deleted_at", null);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!parentId,
    staleTime: 60_000,
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
    staleTime: 60_000,
  });
};

export const useLatestComment = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event-latest-comment", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data } = await (supabase as any)
        .from("event_comments")
        .select(`
          id, event_id, user_id, content, created_at, deleted_at, parent_id,
          user:profiles!user_id(id, username, avatar_url)
        `)
        .eq("event_id", eventId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as EventComment | null;
    },
    enabled: !!eventId,
    staleTime: 60_000,
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventId,
      content,
      parentId,
    }: {
      eventId: string;
      content: string;
      parentId?: string | null;
    }) => {
      if (!user) throw new Error("Debes iniciar sesión para comentar");
      const insertData: any = {
        event_id: eventId,
        user_id: user.id,
        content: content.trim(),
      };
      if (parentId) insertData.parent_id = parentId;

      const { data, error } = await (supabase as any)
        .from("event_comments")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any, { eventId, parentId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-comments", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-comment-count", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-latest-comment", eventId] });
      if (parentId) {
        queryClient.invalidateQueries({ queryKey: ["comment-replies", parentId] });
        queryClient.invalidateQueries({ queryKey: ["comment-reply-count", parentId] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al publicar comentario");
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      eventId,
      parentId,
    }: {
      commentId: string;
      eventId: string;
      parentId?: string | null;
    }) => {
      const { error } = await (supabase as any)
        .from("event_comments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", commentId);
      if (error) throw error;
      return { commentId, eventId, parentId };
    },
    onSuccess: ({ eventId, parentId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-comments", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-comment-count", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-latest-comment", eventId] });
      if (parentId) {
        queryClient.invalidateQueries({ queryKey: ["comment-replies", parentId] });
        queryClient.invalidateQueries({ queryKey: ["comment-reply-count", parentId] });
      }
      toast.success("Comentario eliminado");
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al eliminar comentario");
    },
  });
};

export const useLikeComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string }) => {
      if (!user) throw new Error("Debes iniciar sesión");
      const { error } = await (supabase as any)
        .from("comment_likes")
        .insert({ comment_id: commentId, user_id: user.id });
      if (error) throw error;
    },
    onMutate: async ({ commentId }) => {
      haptic("light");
    },
    onSuccess: () => {
      // Invalidate all comment queries to refresh like states
      queryClient.invalidateQueries({ queryKey: ["event-comments"] });
      queryClient.invalidateQueries({ queryKey: ["comment-replies"] });
    },
  });
};

export const useUnlikeComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string }) => {
      if (!user) throw new Error("Debes iniciar sesión");
      const { error } = await (supabase as any)
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-comments"] });
      queryClient.invalidateQueries({ queryKey: ["comment-replies"] });
    },
  });
};
