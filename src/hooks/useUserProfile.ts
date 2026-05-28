import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendPushNotification } from "@/lib/pushNotifications";
import { haptic } from "@/lib/haptics";

export interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  is_business: boolean;
  is_food_business: boolean;
  interests: string[] | null;
  business_address: string | null;
  business_hours: string | null;
  business_phone: string | null;
  reservation_start_time: string | null;
  reservation_end_time: string | null;
}

export interface FollowUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const useUserProfile = (userId: string | undefined, isOwnProfile = false) => {
  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      // Use raw profiles table for own profile (includes birth_date, stripe_customer_id)
      // Use profiles_public view for other users (hides sensitive fields)
      if (isOwnProfile) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("User not found");
        return data as UserProfile;
      }

      const { data, error } = await supabase
        .from("profiles_public")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("User not found");
      return data as UserProfile;
    },
    enabled: !!userId,
  });
};

export const useUserFollowers = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-followers", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      const { data, error } = await supabase
        .from("follows")
        .select(`
          id,
          follower:profiles!follows_follower_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("following_id", userId);

      if (error) throw error;
      return data?.map((entry) => entry.follower).filter(Boolean) as FollowUser[];
    },
    enabled: !!userId,
  });
};

export const useUserFollowing = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-following", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      const { data, error } = await supabase
        .from("follows")
        .select(`
          id,
          following:profiles!follows_following_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("follower_id", userId);

      if (error) throw error;
      return data?.map((entry) => entry.following).filter(Boolean) as FollowUser[];
    },
    enabled: !!userId,
  });
};

export const useIsFollowing = (targetUserId: string | undefined) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["is-following", user?.id, targetUserId],
    queryFn: async () => {
      // Return false for guests - safe default
      if (!user?.id || !targetUserId) return false;

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    // Enable for guests too - will return false
    enabled: !!targetUserId,
  });
};

export const useIsFollowedBy = (targetUserId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-followed-by", user?.id, targetUserId],
    queryFn: async () => {
      if (!user?.id || !targetUserId || user.id === targetUserId) return false;

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", targetUserId)
        .eq("following_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!targetUserId,
  });
};

export const useFollowUser = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user?.id) throw new Error("Must be logged in");

      // Get current user's username for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
      });

      if (error) throw error;

      // Send push notification to the followed user
      sendPushNotification({
        userIds: [targetUserId],
        title: "New Follower",
        body: `@${profile?.username || "Someone"} started following you`,
        data: { type: "follow", userId: user.id },
        url: `/profile/${user.id}`,
      });
    },
    onSuccess: (_, targetUserId) => {
      haptic("medium");
      queryClient.invalidateQueries({ queryKey: ["is-following", user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["user-followers", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["user-following", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
  });
};

export const useUnfollowUser = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user?.id) throw new Error("Must be logged in");

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (error) throw error;
    },
    onSuccess: (_, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["is-following", user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["user-followers", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["user-following", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
  });
};
