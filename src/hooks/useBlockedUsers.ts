import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const BLOCKED_USERS_KEY = ["blocked-users"];

interface BlockedUserRow {
  id: string;
  blocked_id: string;
  created_at: string;
  blocked: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

/** Returns list of users the current user has blocked (with profile details). */
export const useBlockedUsersList = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...BLOCKED_USERS_KEY, "list", user?.id],
    queryFn: async (): Promise<BlockedUserRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("blocked_users")
        .select("id, blocked_id, created_at, blocked:profiles!blocked_users_blocked_id_fkey(id, username, full_name, avatar_url)")
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as BlockedUserRow[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
};

/** Returns Set of blocked user IDs (in either direction) for fast filtering. */
export const useBlockedIds = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...BLOCKED_USERS_KEY, "ids", user?.id],
    queryFn: async (): Promise<Set<string>> => {
      if (!user?.id) return new Set();
      const { data, error } = await (supabase as any)
        .from("blocked_users")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      if (error) {
        console.error("[useBlockedIds]", error);
        return new Set();
      }
      const ids = new Set<string>();
      (data || []).forEach((r: { blocker_id: string; blocked_id: string }) => {
        if (r.blocker_id === user.id) ids.add(r.blocked_id);
        if (r.blocked_id === user.id) ids.add(r.blocker_id);
      });
      return ids;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useBlockUser = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user?.id) throw new Error("Debes iniciar sesión");
      if (user.id === blockedId) throw new Error("No puedes bloquearte a ti mismo");
      const { error } = await (supabase as any)
        .from("blocked_users")
        .insert({ blocker_id: user.id, blocked_id: blockedId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuario bloqueado");
      queryClient.invalidateQueries({ queryKey: BLOCKED_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["for-you-events"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (err: Error) => {
      if (err.message.includes("duplicate")) {
        toast.info("Este usuario ya está bloqueado");
      } else {
        toast.error(err.message || "Error al bloquear");
      }
    },
  });
};

export const useUnblockUser = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user?.id) throw new Error("Debes iniciar sesión");
      const { error } = await (supabase as any)
        .from("blocked_users")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuario desbloqueado");
      queryClient.invalidateQueries({ queryKey: BLOCKED_USERS_KEY });
    },
    onError: (err: Error) => toast.error(err.message || "Error al desbloquear"),
  });
};

export const useIsBlocked = (otherUserId?: string) => {
  const { data: blockedIds } = useBlockedIds();
  return otherUserId ? blockedIds?.has(otherUserId) ?? false : false;
};
