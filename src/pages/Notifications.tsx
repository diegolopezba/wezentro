import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ChevronLeft, Bell, Calendar, Check, Loader2, Users, CheckCircle, XCircle, AtSign, Heart, Repeat2, MessageCircle, Sparkles, MapPin, HelpCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications, useMarkNotificationRead, useMarkNotificationsReadBulk, Notification } from "@/hooks/useNotifications";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useEvent } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { useRespondToInvitation, useMyPendingInvitations } from "@/hooks/useGuestlistInvitations";
import { toast } from "sonner";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { PostTagNotificationItem } from "@/components/notifications/PostTagNotificationItem";
import { LikeNotificationItem } from "@/components/notifications/LikeNotificationItem";
import { RepostNotificationItem } from "@/components/notifications/RepostNotificationItem";
import { ReferralNotificationItem } from "@/components/notifications/ReferralNotificationItem";
import { ReservationNotificationItem } from "@/components/notifications/ReservationNotificationItem";
import { BusinessCtaRequestNotificationItem } from "@/components/notifications/BusinessCtaRequestNotificationItem";
import { FeatureIntroSheet, useFeatureIntro } from "@/components/business/FeatureIntroSheet";
import { NOTIFICATIONS_INTRO } from "@/components/business/featureIntroSteps";
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
      return CheckCircle;
    case "guestlist_rejected":
      return XCircle;
    case "post_tag":
      return AtSign;
    case "business_cta_request":
    case "business_cta_accepted":
    case "business_cta_declined":
    case "business_cta_revoked":
      return Sparkles;
    case "secret_location_changed":
      return MapPin;
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
  return <m.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: Math.min(index, 8) * 0.02
  }} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer`} onClick={onClick}>
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={followerProfile?.avatar_url || DEFAULT_AVATAR} />
        <AvatarFallback />
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          <span className="font-semibold">{followerProfile?.username || "alguien"}</span>
          {" comenzó a seguirte"}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), {
          addSuffix: true,
          locale: es
        })}
        </p>
      </div>
      
      {!notification.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
    </m.div>;
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
    enabled: !!extractedUsername,
    staleTime: 5 * 60 * 1000,
  });
  return <m.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: Math.min(index, 8) * 0.02
  }} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer`} onClick={onClick}>
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={requesterProfile?.avatar_url || DEFAULT_AVATAR} />
        <AvatarFallback />
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          <span className="font-semibold">{extractedUsername || "alguien"}</span>
          {" quiere unirse a tu evento"}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), {
          addSuffix: true,
          locale: es
        })}
        </p>
      </div>
      
      {!notification.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
    </m.div>;
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
  return <m.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: Math.min(index, 8) * 0.02
  }} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer`} onClick={onClick}>
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
      
      {!notification.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
    </m.div>;
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
  return <m.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: Math.min(index, 8) * 0.02
  }} className={`flex flex-col gap-3 p-4 rounded-2xl cursor-pointer`} onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-secondary">
          {event?.image_url ? <img src={event.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
            <span className="font-semibold">{extractedUsername || "alguien"}</span>
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
        
        {!notification.is_read && !invitation && (
          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
        )}
      </div>
      
      {/* Accept/Decline buttons for pending invitations */}
      {invitation && <div className="flex gap-2 ml-13">
          <Button variant="outline" size="sm" className="flex-1 rounded-xl border-destructive/30 text-destructive" onClick={handleDecline} disabled={isResponding}>
            {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}
            Rechazar
          </Button>
          <Button size="sm" className="flex-1 rounded-xl" onClick={handleAccept} disabled={isResponding}>
            {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
            Aceptar
          </Button>
        </div>}
    </m.div>;
};
const CommentNotificationItem = ({
  notification,
  index,
  onRead,
  onClick
}: NotificationItemProps) => {
  const extractedUsername = notification.body?.match(/@(\w+)/)?.[1];
  const { data: event } = useEvent(notification.entity_id || undefined);
  return <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index, 8) * 0.02 }} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer`} onClick={onClick}>
    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-secondary">
      {event?.image_url ? <img src={event.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><MessageCircle className="w-5 h-5 text-muted-foreground" /></div>}
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
        <span className="font-semibold">{extractedUsername || "alguien"}</span>
        {" comentó en "}
        <span className="font-semibold">{event?.title || "tu publicación"}</span>
      </p>
      <p className="text-xs text-muted-foreground/70 mt-0.5">
        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
      </p>
    </div>
    {!notification.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
  </m.div>;
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
  return <m.div initial={{
    opacity: 0,
    x: -20
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    delay: Math.min(index, 8) * 0.02
  }} className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer`} onClick={onClick}>
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
          
          {!notification.is_read && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
          )}
        </div>
      </div>
    </m.div>;
};
/**
 * Wraps a virtualized row and auto-marks the notification as read after
 * it has been on screen for ~500ms (Instagram behavior). Batched marking
 * happens at the page level via useMarkNotificationsReadBulk.
 */
const AutoReadRow = ({
  notification,
  index,
  onVisible,
  measureRef,
  translateY,
  children,
}: {
  notification: Notification;
  index: number;
  onVisible: (id: string) => void;
  measureRef: (el: HTMLDivElement | null) => void;
  translateY: number;
  children: React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (notification.is_read) return;
    const el = ref.current;
    if (!el) return;
    let timer: number | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = window.setTimeout(() => onVisible(notification.id), 500);
        } else if (timer) {
          window.clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      if (timer) window.clearTimeout(timer);
      io.disconnect();
    };
  }, [notification.id, notification.is_read, onVisible]);

  return (
    <div
      ref={(el) => {
        ref.current = el;
        measureRef(el);
      }}
      data-index={index}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${translateY}px)`,
      }}
    >
      {children}
    </div>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const intro = useFeatureIntro("notifications");
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markBulk = useMarkNotificationsReadBulk();

  const handleBack = () => {
    navigate("/");
  };

  // Auto-mark-on-view: collect ids and flush every 400ms so we don't
  // fire a request per row while the user scrolls.
  const pendingRef = useRef<Set<string>>(new Set());
  const flushTimer = useRef<number | undefined>(undefined);
  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) return;
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = undefined;
      const ids = Array.from(pendingRef.current);
      pendingRef.current.clear();
      if (ids.length) markBulk.mutate(ids);
    }, 400);
  }, [markBulk]);
  const handleVisible = useCallback(
    (id: string) => {
      pendingRef.current.add(id);
      scheduleFlush();
    },
    [scheduleFlush]
  );
  useEffect(() => () => {
    if (flushTimer.current) window.clearTimeout(flushTimer.current);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }

    if (notification.type === "guestlist_approved" && notification.entity_id) {
      navigate(`/going/${notification.entity_id}`);
    } else if (notification.type === "guestlist_request" && notification.entity_id) {
      navigate(`/event/${notification.entity_id}`, { state: { openGuestlist: true } });
    } else if (
      (notification.type === "like" || notification.type === "repost") &&
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
    } else if (
      (notification.type === "business_cta_request" ||
        notification.type === "business_cta_accepted" ||
        notification.type === "business_cta_declined" ||
        notification.type === "business_cta_revoked") &&
      notification.entity_id
    ) {
      navigate(`/event/${notification.entity_id}`);
    } else if (notification.type === "secret_location_changed" && notification.entity_id) {
      navigate(`/event/${notification.entity_id}`);
    } else if (
      (notification.entity_type === "profile" || notification.entity_type === "user") &&
      notification.entity_id
    ) {
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
        return <FollowNotificationItem {...commonProps} />;
      case "like":
        return <LikeNotificationItem {...commonProps} />;
      case "repost":
        return <RepostNotificationItem {...commonProps} />;
      case "guestlist_request":
        return <GuestlistRequestNotificationItem {...commonProps} />;
      case "guestlist_approved":
      case "guestlist_rejected":
        return <GuestlistStatusNotificationItem {...commonProps} />;
      case "guestlist_invitation":
        return <GuestlistInvitationNotificationItem {...commonProps} />;
      case "referral_signup":
        return <ReferralNotificationItem {...commonProps} />;
      case "new_reservation":
      case "reservation_cancelled":
      case "reservation_tagged":
        return <ReservationNotificationItem {...commonProps} />;
      case "post_tag":
        return <PostTagNotificationItem {...commonProps} />;
      case "business_cta_request":
        return <BusinessCtaRequestNotificationItem {...commonProps} />;
      case "comment":
        return <CommentNotificationItem {...commonProps} />;
      default:
        return <NotificationItem {...commonProps} />;
    }
  };

  const items = notifications ?? [];

  // Window-level virtualizer: the document/window is the real scroll container
  // (AppLayout's inner div is not height-constrained, so it does not scroll).
  // scrollMargin is the absolute distance from the document top to the list,
  // measured robustly with getBoundingClientRect so row transforms stay correct.
  const listStartRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    const update = () => {
      const el = listStartRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      setScrollMargin(rect.top + scrollY);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, []);
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => 88,
    overscan: 8,
    scrollMargin,
  });

  return (
    <AppLayout hideNav>
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-brand text-xl font-medium text-foreground">
              Notificaciones
            </h1>
          </div>
        </div>
      </header>

      <div ref={listStartRef} className="px-0 py-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-medium text-foreground mb-1">Sin notificaciones aún</h2>
            <p className="text-sm text-muted-foreground">
              Cuando alguien te siga o interactúe con tus eventos, lo verás aquí
            </p>
          </m.div>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((v) => {
              const notification = items[v.index];
              return (
                <AutoReadRow
                  key={notification.id}
                  notification={notification}
                  index={v.index}
                  onVisible={handleVisible}
                  measureRef={virtualizer.measureElement}
                  translateY={v.start - scrollMargin}
                >
                  {renderNotification(notification, v.index)}
                </AutoReadRow>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
export default Notifications;