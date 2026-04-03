import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

export const useRecentFollowers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business-recent-followers", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("follows")
        .select("follower_id, created_at, profiles:follower_id(id, username, full_name, avatar_url)")
        .eq("following_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
};

export const AudienceInsights = () => {
  const { data: followers, isLoading } = useRecentFollowers();

  if (isLoading) {
    return <div className="h-24 bg-secondary/50 rounded-xl animate-pulse" />;
  }

  if (!followers || followers.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 text-center">
        <p className="text-sm text-muted-foreground">Aún no tienes seguidores</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <p className="text-sm font-medium text-muted-foreground mb-3">Seguidores recientes</p>
      <div className="space-y-3">
        {followers.map((f: any, i: number) => {
          const profile = f.profiles;
          return (
            <motion.div
              key={f.follower_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url || DEFAULT_AVATAR} />
                <AvatarFallback>{(profile?.username || "U")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || `@${profile?.username}`}
                </p>
                <p className="text-xs text-muted-foreground">{profile?.username}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
