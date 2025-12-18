import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AllowMessagesFrom = "everyone" | "followers" | "mutual";

export interface UserSettings {
  id: string;
  user_id: string;
  allow_messages_from: AllowMessagesFrom;
  created_at: string;
  updated_at: string;
}

// Fetch current user's settings (auto-create if not exists)
export const useUserSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async (): Promise<UserSettings | null> => {
      if (!user?.id) return null;

      // Try to get existing settings
      const { data: existing, error: fetchError } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Return existing if found
      if (existing) {
        return existing as UserSettings;
      }

      // Create default settings
      const { data: created, error: createError } = await supabase
        .from("user_settings")
        .insert({ user_id: user.id, allow_messages_from: "everyone" })
        .select()
        .single();

      if (createError) throw createError;
      return created as UserSettings;
    },
    enabled: !!user?.id,
  });
};

// Update user settings
export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<UserSettings, "allow_messages_from">>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_settings")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings", user?.id] });
    },
  });
};

// Check if current user can message a specific user
export const useCanMessageUser = (targetUserId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["can-message-user", user?.id, targetUserId],
    queryFn: async (): Promise<{ canMessage: boolean; reason?: string }> => {
      if (!user?.id || !targetUserId) return { canMessage: false, reason: "Not authenticated" };
      
      // Can always message yourself
      if (user.id === targetUserId) return { canMessage: true };

      // Get target user's settings
      const { data: settings, error: settingsError } = await supabase
        .from("user_settings")
        .select("allow_messages_from")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (settingsError) throw settingsError;

      // Default to "everyone" if no settings exist
      const allowFrom = (settings?.allow_messages_from as AllowMessagesFrom) || "everyone";

      if (allowFrom === "everyone") {
        return { canMessage: true };
      }

      if (allowFrom === "followers") {
        // Check if current user follows the target user
        const { data: followData, error: followError } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId)
          .maybeSingle();

        if (followError) throw followError;
        
        if (followData) {
          return { canMessage: true };
        }
        return { canMessage: false, reason: "This user only accepts messages from followers" };
      }

      if (allowFrom === "mutual") {
        // Check if both users follow each other
        const { data: mutualData, error: mutualError } = await supabase
          .from("follows")
          .select("id")
          .or(`and(follower_id.eq.${user.id},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${user.id})`);

        if (mutualError) throw mutualError;
        
        // Need exactly 2 rows (one for each direction)
        if (mutualData && mutualData.length >= 2) {
          return { canMessage: true };
        }
        return { canMessage: false, reason: "This user only accepts messages from mutual followers" };
      }

      return { canMessage: true };
    },
    enabled: !!user?.id && !!targetUserId,
  });
};
