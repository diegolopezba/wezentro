import { m } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarCheck, CalendarX, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Notification } from "@/hooks/useNotifications";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

interface Props {
  notification: Notification;
  index: number;
  onRead: () => void;
  onClick: () => void;
}

export const ReservationNotificationItem = ({ notification, index, onRead, onClick }: Props) => {
  const extractedUsername = notification.body?.match(/@(\w+)/)?.[1];
  const isCancelled = notification.type === "reservation_cancelled";
  const isTagged = notification.type === "reservation_tagged";

  const { data: userProfile } = useQuery({
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
    staleTime: 5 * 60 * 1000,
  });

  const IconComponent = isCancelled ? CalendarX : isTagged ? UserCheck : CalendarCheck;
  const iconBgColor = isCancelled ? "bg-red-500" : isTagged ? "bg-blue-500" : "bg-emerald-500";

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.02 }}
      className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer`}
      onClick={onClick}
    >
      <div className="relative">
        {extractedUsername ? (
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={userProfile?.avatar_url || DEFAULT_AVATAR} />
            <AvatarFallback />
          </Avatar>
        ) : (
          <div className={`w-10 h-10 rounded-full ${iconBgColor} flex items-center justify-center shrink-0`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
        )}
        {extractedUsername && (
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${iconBgColor} flex items-center justify-center`}>
            <IconComponent className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          {notification.body || notification.title}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>

      {!notification.is_read && (
        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
      )}
    </m.div>
  );
};
