import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Gift } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Notification } from "@/hooks/useNotifications";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

interface Props {
  notification: Notification;
  index: number;
  onRead: () => void;
  onClick: () => void;
}

export const ReferralNotificationItem = ({ notification, index, onRead, onClick }: Props) => {
  const extractedUsername = notification.body?.match(/@(\w+)/)?.[1];
  // Extract progress like "(3/5 para tu mes gratis)"
  const progressMatch = notification.body?.match(/\((\d+)\/(\d+)/);
  const current = progressMatch ? parseInt(progressMatch[1]) : 0;
  const total = progressMatch ? parseInt(progressMatch[2]) : 5;

  const { data: referredProfile } = useQuery({
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
      className={`flex flex-col gap-2 p-4 rounded-2xl cursor-pointer ${
        notification.is_read ? "" : "bg-primary/5"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={referredProfile?.avatar_url || DEFAULT_AVATAR} />
            <AvatarFallback />
          </Avatar>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
            <Gift className="w-3 h-3 text-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
            <span className="font-semibold">@{extractedUsername || "alguien"}</span>
            {" se unió usando tu enlace"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>

        {!notification.is_read && (
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        )}
      </div>

      {/* Progress bar */}
      <div className="ml-13 flex items-center gap-2">
        <Progress value={(current / total) * 100} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground font-medium">{current}/{total}</span>
      </div>
    </motion.div>
  );
};
