import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Bell, Calendar, Check, Loader2, Users, CheckCircle, XCircle, UserPlus, AtSign, Heart, Repeat2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, Notification } from "@/hooks/useNotifications";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useEvent } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { useRespondToInvitation, useMyPendingInvitations } from "@/hooks/useGuestlistInvitations";
import { usePendingCollaborations, useRespondToCollaboration } from "@/hooks/useEventCollaborators";
import { toast } from "sonner";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { PostTagNotificationItem } from "@/components/notifications/PostTagNotificationItem";
import { LikeNotificationItem } from "@/components/notifications/LikeNotificationItem";
import { RepostNotificationItem } from "@/components/notifications/RepostNotificationItem";
import { CollaborationAcceptedNotificationItem } from "@/components/notifications/CollaborationAcceptedNotificationItem";
import { ReferralNotificationItem } from "@/components/notifications/ReferralNotificationItem";
import { ReservationNotificationItem } from "@/components/notifications/ReservationNotificationItem";
const getNotificationIcon = (type: string) => {
  switch (type) {
    case "event":
      return Calendar;
    case "like":
      return Heart;
    case "repost":
      return Repeat2;
    case "guestlist":
    case "guestlist_request":
    case "guestlist_invitation":
      return Users;
    case "guestlist_approved":
    case "collaboration_accepted":
      return CheckCircle;
    case "guestlist_rejected":
      return XCircle;
    case "collaboration_request":
      return UserPlus;
    case "post_tag":
      return AtSign;
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
  const {
    data: followerProfile
  } = useUserProfile(notification.entity_id || undefined);
  return <motion.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: index * 0.03
  }} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${notification.is_read ? "hover:bg-secondary/30" : "hover:bg-primary/10"}`} onClick={onClick}>
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={followerProfile?.avatar_url || DEFAULT_AVATAR} />
        <AvatarFallback />
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          <span className="font-semibold">@{followerProfile?.username || "alguien"}</span>
          {" comenzó a seguirte"}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), {
          addSuffix: true,
          locale: es
        })}
        </p>
      </div>
      
      {!notification.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
    </motion.div>;
};
const GuestlistRequestNotificationItem = ({
  notification,
  index,
  onRead,
  onClick
}: NotificationItemProps) => {
  // Extract username from body: "@username wants to join..."
  const extractedUsername = notification.body?.match(/@(\w+)/)?.[1];
  const {
    data: requesterProfile
  } = useQuery({
    queryKey: ["profile-by-username", extractedUsername],
    queryFn: async () => {
      if (!extractedUsername) return null;
      const {
        data
      } = await supabase.from("profiles").select("id, username, avatar_url").eq("username", extractedUsername).maybeSingle();
      return data;
    },
    enabled: !!extractedUsername
  });
  return <motion.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: index * 0.03
  }} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${notification.is_read ? "hover:bg-secondary/30" : "hover:bg-primary/10"}`} onClick={onClick}>
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={requesterProfile?.avatar_url || DEFAULT_AVATAR} />
        <AvatarFallback />
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          <span className="font-semibold">@{extractedUsername || "alguien"}</span>
          {" quiere unirse a tu evento"}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), {
          addSuffix: true,
          locale: es
        })}
        </p>
      </div>
      
      {!notification.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
    </motion.div>;
};
const GuestlistStatusNotificationItem = ({
  notification,
  index,
  onRead,
  onClick
}: NotificationItemProps) => {
  const {
    data: event
  } = useEvent(notification.entity_id || undefined);
  const isApproved = notification.type === "guestlist_approved";
  return <motion.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: index * 0.03
  }} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${notification.is_read ? "hover:bg-secondary/30" : "hover:bg-primary/10"}`} onClick={onClick}>
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-secondary">
        {event?.image_url ? <img src={event.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          {isApproved ? <>¡Estás en la lista de <span className="font-semibold">{event?.title || "un evento"}</span>!</> : <>Tu solicitud para <span className="font-semibold">{event?.title || "un evento"}</span> fue rechazada</>}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), {
          addSuffix: true,
          locale: es
        })}
        </p>
      </div>
      
      {!notification.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
    </motion.div>;
};
const GuestlistInvitationNotificationItem = ({
  notification,
  index,
  onRead,
  onClick
}: NotificationItemProps) => {
  const navigate = useNavigate();
  const {
    data: event
  } = useEvent(notification.entity_id || undefined);
  const {
    data: pendingInvitations
  } = useMyPendingInvitations();
  const respondToInvitation = useRespondToInvitation();
  const [isResponding, setIsResponding] = useState(false);

  // Extract username from body: "@username invited you..."
  const extractedUsername = notification.body?.match(/@(\w+)/)?.[1];

  // Find the invitation for this event
  const invitation = pendingInvitations?.find((inv: any) => inv.event_id === notification.entity_id);
  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!invitation) return;
    setIsResponding(true);
    try {
      await respondToInvitation.mutateAsync({
        invitationId: invitation.id,
        status: "accepted"
      });
      toast.success("¡Invitación aceptada!");
      if (!notification.is_read) onRead();
      // Navigate to the "You Are Going" page
      navigate(`/going/${notification.entity_id}`);
    } catch (error: any) {
      toast.error(error.message || "Error al aceptar");
    } finally {
      setIsResponding(false);
    }
  };
  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!invitation) return;
    setIsResponding(true);
    try {
      await respondToInvitation.mutateAsync({
        invitationId: invitation.id,
        status: "declined"
      });
      toast.success("Invitación rechazada");
      if (!notification.is_read) onRead();
    } catch (error: any) {
      toast.error(error.message || "Error al rechazar");
    } finally {
      setIsResponding(false);
    }
  };
  return <motion.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: index * 0.03
  }} className={`flex flex-col gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${notification.is_read ? "hover:bg-secondary/30" : "hover:bg-primary/10"}`} onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-secondary">
          {event?.image_url ? <img src={event.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
            <span className="font-semibold">@{extractedUsername || "alguien"}</span>
            {" te invitó a "}
            <span className="font-semibold">{event?.title || "un evento"}</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: es
          })}
          </p>
        </div>
        
        {!notification.is_read && !invitation && <>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={e => {
          e.stopPropagation();
          onRead();
        }}>
              <Check className="w-4 h-4" />
            </Button>
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          </>}
      </div>
      
      {/* Accept/Decline buttons for pending invitations */}
      {invitation && <div className="flex gap-2 ml-13">
          <Button variant="outline" size="sm" className="flex-1 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleDecline} disabled={isResponding}>
            {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}
            Rechazar
          </Button>
          <Button size="sm" className="flex-1 rounded-xl" onClick={handleAccept} disabled={isResponding}>
            {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
            Aceptar
          </Button>
        </div>}
    </motion.div>;
};
const CollaborationNotificationItem = ({
  notification,
  index,
  onRead,
  onClick
}: NotificationItemProps) => {
  const navigate = useNavigate();
  const {
    data: event
  } = useEvent(notification.entity_id || undefined);
  const {
    data: pendingCollaborations
  } = usePendingCollaborations();
  const respondToCollaboration = useRespondToCollaboration();
  const [isResponding, setIsResponding] = useState(false);

  // Extract username from body: "@username invited you..."
  const extractedUsername = notification.body?.match(/@(\w+)/)?.[1];

  // Find the collaboration for this event
  const collaboration = pendingCollaborations?.find((collab: any) => collab.event_id === notification.entity_id);
  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!collaboration) return;
    setIsResponding(true);
    try {
      await respondToCollaboration.mutateAsync({
        collaborationId: collaboration.id,
        status: "accepted"
      });
      toast.success("¡Colaboración aceptada!");
      if (!notification.is_read) onRead();
      navigate(`/event/${notification.entity_id}`);
    } catch (error: any) {
      toast.error(error.message || "Error al aceptar");
    } finally {
      setIsResponding(false);
    }
  };
  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!collaboration) return;
    setIsResponding(true);
    try {
      await respondToCollaboration.mutateAsync({
        collaborationId: collaboration.id,
        status: "declined"
      });
      toast.success("Colaboración rechazada");
      if (!notification.is_read) onRead();
    } catch (error: any) {
      toast.error(error.message || "Error al rechazar");
    } finally {
      setIsResponding(false);
    }
  };
  return <motion.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: index * 0.03
  }} className={`flex flex-col gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${notification.is_read ? "hover:bg-secondary/30" : "hover:bg-primary/10"}`} onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-secondary">
          {event?.image_url ? <img src={event.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-muted-foreground" />
            </div>}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
            <span className="font-semibold">@{extractedUsername || "alguien"}</span>
            {" te invitó a colaborar en "}
            <span className="font-semibold">{event?.title || "una publicación"}</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: es
          })}
          </p>
        </div>
        
        {!notification.is_read && !collaboration && <>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={e => {
          e.stopPropagation();
          onRead();
        }}>
              <Check className="w-4 h-4" />
            </Button>
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          </>}
      </div>
      
      {/* Accept/Decline buttons for pending collaborations */}
      {collaboration && <div className="flex gap-2 ml-13">
          <Button variant="outline" size="sm" className="flex-1 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleDecline} disabled={isResponding}>
            {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}
            Rechazar
          </Button>
          <Button size="sm" className="flex-1 rounded-xl" onClick={handleAccept} disabled={isResponding}>
            {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
            Aceptar
          </Button>
        </div>}
    </motion.div>;
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
  return <motion.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: index * 0.03
  }} className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-colors ${notification.is_read ? "hover:bg-secondary/30" : "hover:bg-primary/10"}`} onClick={onClick}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notification.is_read ? "bg-secondary" : "bg-primary/20"}`}>
        <Icon className={`w-5 h-5 ${notification.is_read ? "text-muted-foreground" : "text-primary"}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
              {notification.title}
            </h3>
            {notification.body && <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {notification.body}
              </p>}
            <p className="text-xs text-muted-foreground/70 mt-1">
              {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: es
            })}
            </p>
          </div>
          
          {!notification.is_read && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={e => {
          e.stopPropagation();
          onRead();
        }}>
              <Check className="w-4 h-4" />
            </Button>}
        </div>
      </div>
      
      {!notification.is_read}
    </motion.div>;
};
const Notifications = () => {
  const navigate = useNavigate();
  const {
    data: notifications,
    isLoading
  } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }

    // Navigate based on notification type and entity type
    if (notification.type === "guestlist_approved" && notification.entity_id) {
      navigate(`/going/${notification.entity_id}`);
    } else if (notification.type === "guestlist_request" && notification.entity_id) {
      navigate(`/event/${notification.entity_id}`, { state: { openGuestlist: true } });
    } else if (
      (notification.type === "like" || notification.type === "repost" || notification.type === "collaboration_accepted") &&
      notification.entity_id
    ) {
      navigate(`/event/${notification.entity_id}`);
    } else if (notification.type === "referral_signup") {
      navigate(`/referrals`);
    } else if (
      (notification.type === "new_reservation" ||
        notification.type === "reservation_tagged" ||
        notification.type === "reservation_cancelled") &&
      notification.entity_id
    ) {
      navigate(`/reservation/${notification.entity_id}`);
    } else if (notification.type === "post_tag" && notification.entity_id) {
      navigate(`/event/${notification.entity_id}`);
    } else if ((notification.entity_type === "profile" || notification.entity_type === "user") && notification.entity_id) {
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
      onClick: () => handleNotificationClick(notification)
    };
    switch (notification.type) {
      case "follow":
        return <FollowNotificationItem key={notification.id} {...commonProps} />;
      case "like":
        return <LikeNotificationItem key={notification.id} {...commonProps} />;
      case "repost":
        return <RepostNotificationItem key={notification.id} {...commonProps} />;
      case "guestlist_request":
        return <GuestlistRequestNotificationItem key={notification.id} {...commonProps} />;
      case "guestlist_approved":
      case "guestlist_rejected":
        return <GuestlistStatusNotificationItem key={notification.id} {...commonProps} />;
      case "guestlist_invitation":
        return <GuestlistInvitationNotificationItem key={notification.id} {...commonProps} />;
      case "collaboration_request":
        return <CollaborationNotificationItem key={notification.id} {...commonProps} />;
      case "collaboration_accepted":
        return <CollaborationAcceptedNotificationItem key={notification.id} {...commonProps} />;
      case "referral_signup":
        return <ReferralNotificationItem key={notification.id} {...commonProps} />;
      case "new_reservation":
      case "reservation_cancelled":
      case "reservation_tagged":
        return <ReservationNotificationItem key={notification.id} {...commonProps} />;
      case "post_tag":
        return <PostTagNotificationItem key={notification.id} {...commonProps} />;
      default:
        return <NotificationItem key={notification.id} {...commonProps} />;
    }
  };
  return <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-brand text-xl font-bold text-foreground">
              Notificaciones
            </h1>
          </div>
          
          {unreadCount > 0}
        </div>
      </header>

      <div className="space-y-0 py-0 px-0">
        {isLoading ? <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div> : !notifications || notifications.length === 0 ? <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-medium text-foreground mb-1">Sin notificaciones aún</h2>
            <p className="text-sm text-muted-foreground">
              Cuando alguien te siga o interactúe con tus eventos, lo verás aquí
            </p>
          </motion.div> : notifications.map((notification, index) => renderNotification(notification, index))}
      </div>
    </AppLayout>;
};
export default Notifications;