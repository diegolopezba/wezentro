import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEvent } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { Notification } from "@/hooks/useNotifications";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

interface Props {
  notification: Notification;
  index: number;
  onRead: () => void;
  onClick: () => void;
}

export const LikeNotificationItem = ({ notification, index, onRead, onClick }: Props) => {
  const extractedUsername = notification.body?.match(/@(\w+)/)?.[1];
  const { data: event } = useEvent(notification.entity_id || undefined);
  const { data: likerProfile } = useQuery({
    queryKey: ["profile-by-username", extractedUsername],
    queryFn: async () => {
      if (!extractedUsername) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("username", extractedUsername)
        .maybeSingle();
      return data;
    },
    enabled: !!extractedUsername,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer ${
        notification.is_read ? "" : "bg-primary/5"
      }`}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={likerProfile?.avatar_url || DEFAULT_AVATAR} />
          <AvatarFallback />
        </Avatar>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
          <Heart className="w-3 h-3 text-white fill-white" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          <span className="font-semibold">@{extractedUsername || "alguien"}</span>
          {" le dio like a "}
          <span className="font-semibold">{event?.title || "tu publicación"}</span>
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>

      {event?.image_url && (
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
          <img src={event.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
      )}
    </motion.div>
  );
};
