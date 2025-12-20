import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Bell, Calendar, Check, Loader2, Users, CheckCircle, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  useNotifications, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead,
  Notification 
} from "@/hooks/useNotifications";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useEvent } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "event":
      return Calendar;
    case "guestlist":
    case "guestlist_request":
    case "guestlist_invitation":
      return Users;
    case "guestlist_approved":
      return CheckCircle;
    case "guestlist_rejected":
      return XCircle;
    default:
      return Bell;
  }
};

interface NotificationItemProps {
  notification: Notification;
  index: number;
  onRead: () => void;
  onClick: () => void;
}

const FollowNotificationItem = ({ 
  notification, 
  index, 
  onRead, 
  onClick 
}: NotificationItemProps) => {
  const { data: followerProfile } = useUserProfile(notification.entity_id || undefined);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${
        notification.is_read 
          ? "bg-secondary/30 hover:bg-secondary/50" 
          : "bg-primary/10 hover:bg-primary/15"
      }`}
      onClick={onClick}
    >
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={followerProfile?.avatar_url || ""} />
        <AvatarFallback>
          {followerProfile?.username?.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          <span className="font-semibold">@{followerProfile?.username || "someone"}</span>
          {" started following you"}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      
      {!notification.is_read && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
          >
            <Check className="w-4 h-4" />
          </Button>
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        </>
      )}
    </motion.div>
  );
};

const GuestlistRequestNotificationItem = ({ 
  notification, 
  index, 
  onRead, 
  onClick 
}: NotificationItemProps) => {
  // Extract username from body: "@username wants to join..."
  const extractedUsername = notification.body?.match(/@(\w+)/)?.[1];
  
  const { data: requesterProfile } = useQuery({
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
      className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${
        notification.is_read 
          ? "bg-secondary/30 hover:bg-secondary/50" 
          : "bg-primary/10 hover:bg-primary/15"
      }`}
      onClick={onClick}
    >
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={requesterProfile?.avatar_url || ""} />
        <AvatarFallback>
          {extractedUsername?.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          <span className="font-semibold">@{extractedUsername || "someone"}</span>
          {" wants to join your event"}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      
      {!notification.is_read && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
          >
            <Check className="w-4 h-4" />
          </Button>
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        </>
      )}
    </motion.div>
  );
};

const GuestlistStatusNotificationItem = ({ 
  notification, 
  index, 
  onRead, 
  onClick 
}: NotificationItemProps) => {
  const { data: event } = useEvent(notification.entity_id || undefined);
  const isApproved = notification.type === "guestlist_approved";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${
        notification.is_read 
          ? "bg-secondary/30 hover:bg-secondary/50" 
          : "bg-primary/10 hover:bg-primary/15"
      }`}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-secondary">
        {event?.image_url ? (
          <img src={event.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          {isApproved ? (
            <>You're on the guestlist for <span className="font-semibold">{event?.title || "an event"}</span>!</>
          ) : (
            <>Your request for <span className="font-semibold">{event?.title || "an event"}</span> was declined</>
          )}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      
      {!notification.is_read && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
          >
            <Check className="w-4 h-4" />
          </Button>
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        </>
      )}
    </motion.div>
  );
};

const GuestlistInvitationNotificationItem = ({ 
  notification, 
  index, 
  onRead, 
  onClick 
}: NotificationItemProps) => {
  const { data: event } = useEvent(notification.entity_id || undefined);
  
  // Extract username from body: "@username invited you..."
  const extractedUsername = notification.body?.match(/@(\w+)/)?.[1];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${
        notification.is_read 
          ? "bg-secondary/30 hover:bg-secondary/50" 
          : "bg-primary/10 hover:bg-primary/15"
      }`}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-secondary">
        {event?.image_url ? (
          <img src={event.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          <span className="font-semibold">@{extractedUsername || "someone"}</span>
          {" invited you to join "}
          <span className="font-semibold">{event?.title || "an event"}</span>
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      
      {!notification.is_read && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
          >
            <Check className="w-4 h-4" />
          </Button>
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        </>
      )}
    </motion.div>
  );
};

const NotificationItem = ({
  notification, 
  index, 
  onRead, 
  onClick 
}: { 
  notification: Notification; 
  index: number;
  onRead: () => void;
  onClick: () => void;
}) => {
  const Icon = getNotificationIcon(notification.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-colors ${
        notification.is_read 
          ? "bg-secondary/30 hover:bg-secondary/50" 
          : "bg-primary/10 hover:bg-primary/15"
      }`}
      onClick={onClick}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        notification.is_read ? "bg-secondary" : "bg-primary/20"
      }`}>
        <Icon className={`w-5 h-5 ${notification.is_read ? "text-muted-foreground" : "text-primary"}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-sm ${
              notification.is_read ? "text-muted-foreground" : "text-foreground"
            }`}>
              {notification.title}
            </h3>
            {notification.body && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {notification.body}
              </p>
            )}
            <p className="text-xs text-muted-foreground/70 mt-1">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </div>
          
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onRead();
              }}
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </motion.div>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }

    // Navigate based on entity type - handle both 'profile' and 'user' types
    if ((notification.entity_type === "profile" || notification.entity_type === "user") && notification.entity_id) {
      navigate(`/user/${notification.entity_id}`);
    } else if (notification.entity_type === "event" && notification.entity_id) {
      navigate(`/event/${notification.entity_id}`);
    }
  };

  const renderNotification = (notification: Notification, index: number) => {
    const commonProps = {
      notification,
      index,
      onRead: () => markRead.mutate(notification.id),
      onClick: () => handleNotificationClick(notification),
    };

    switch (notification.type) {
      case "follow":
        return <FollowNotificationItem key={notification.id} {...commonProps} />;
      case "guestlist_request":
        return <GuestlistRequestNotificationItem key={notification.id} {...commonProps} />;
      case "guestlist_approved":
      case "guestlist_rejected":
        return <GuestlistStatusNotificationItem key={notification.id} {...commonProps} />;
      case "guestlist_invitation":
        return <GuestlistInvitationNotificationItem key={notification.id} {...commonProps} />;
      default:
        return <NotificationItem key={notification.id} {...commonProps} />;
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-brand text-xl font-bold text-foreground">
              Notifications
            </h1>
          </div>
          
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-primary"
            >
              {markAllRead.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Mark all read"
              )}
            </Button>
          )}
        </div>
      </header>

      <div className="px-4 py-2 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-medium text-foreground mb-1">No notifications yet</h2>
            <p className="text-sm text-muted-foreground">
              When someone follows you or interacts with your events, you'll see it here
            </p>
          </motion.div>
        ) : (
          notifications.map((notification, index) => renderNotification(notification, index))
        )}
      </div>
    </AppLayout>
  );
};

export default Notifications;
