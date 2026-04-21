import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { trackProfileVisit } from "@/lib/analyticsTracking";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Loader2, UtensilsCrossed, Info, CalendarCheck } from "lucide-react";
import { ShareProfileMenu } from "@/components/profile/ShareProfileMenu";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { useUserProfile, useIsFollowing, useFollowUser, useUnfollowUser } from "@/hooks/useUserProfile";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserTimeline } from "@/hooks/useUserTimeline";
import { useCanMessageUser } from "@/hooks/useUserSettings";
import { useCreatePrivateChat } from "@/hooks/useChats";
import { haptic } from "@/lib/haptics";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { FollowersSheet } from "@/components/profile/FollowersSheet";
import { TimelineCard } from "@/components/events/TimelineCard";
import { MenuSheet } from "@/components/menu/MenuSheet";
import { BusinessInfoSheet } from "@/components/profile/BusinessInfoSheet";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { MentionText } from "@/components/ui/MentionText";
import { formatCount as formatCountUtil } from "@/lib/utils";

const UserProfile = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const {
    user: currentUser
  } = useAuth();
  const { promptAuth } = useAuthPrompt();
  const isGuest = !currentUser;
  const [followSheetType, setFollowSheetType] = useState<"followers" | "following" | null>(null);
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);
  const [businessInfoOpen, setBusinessInfoOpen] = useState(false);
  const [reservationSheetOpen, setReservationSheetOpen] = useState(false);

  // Redirect to own profile if viewing self
  const isOwnProfile = currentUser?.id === id;

  // Track profile visit
  useEffect(() => {
    if (id && currentUser?.id && !isOwnProfile) {
      trackProfileVisit(id, currentUser.id);
    }
  }, [id, currentUser?.id, isOwnProfile]);

  const {
    data: userProfile,
    isLoading: profileLoading
  } = useUserProfile(id);
  const {
    data: userStats,
    isLoading: statsLoading
  } = useUserStats(id);
  const {
    data: isFollowing,
    isLoading: followStatusLoading
  } = useIsFollowing(id);
  const {
    data: timeline,
    isLoading: timelineLoading
  } = useUserTimeline(id);
  const {
    data: canMessageData,
    isLoading: canMessageLoading
  } = useCanMessageUser(id);
  const isFoodBusiness = userProfile?.is_food_business === true;
  const isBusiness = userProfile?.is_business === true;
  const menuEnabled = (userProfile as any)?.menu_enabled !== false;
  const reservationsEnabled = (userProfile as any)?.reservations_enabled !== false;
  const businessType = (userProfile as any)?.business_type as string | null | undefined;
  const hasBusinessInfo = userProfile?.business_address || userProfile?.business_hours || userProfile?.business_phone;
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const createChatMutation = useCreatePrivateChat();
  const formatCount = (count: number) => formatCountUtil(count);
  const handleFollowToggle = () => {
    if (!id) return;

    // Prompt guests to sign up
    if (isGuest) {
      promptAuth({ action: "seguir a este usuario" });
      return;
    }

    haptic("medium");
    if (isFollowing) {
      unfollowMutation.mutate(id);
    } else {
      followMutation.mutate(id);
    }
  };
  const handleMessage = () => {
    if (!id) return;

    // Prompt guests to sign up
    if (isGuest) {
      promptAuth({ action: "enviar un mensaje" });
      return;
    }

    if (!canMessageData?.canMessage) {
      toast.error(canMessageData?.reason || "No se puede enviar mensaje a este usuario");
      return;
    }
    createChatMutation.mutate(id, {
      onSuccess: (chatId) => {
        navigate(`/chats/${chatId}`);
      },
      onError: () => {
        toast.error("Error al iniciar conversación");
      }
    });
  };
  if (profileLoading) {
    return <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  if (!userProfile) {
    return <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4">
        <h1 className="font-brand text-xl font-bold text-foreground mb-2">Usuario no encontrado</h1>
        <Button onClick={() => navigate(-1)}>Volver</Button>
      </div>;
  }
  const stats = [{
    label: "Eventos",
    value: statsLoading ? "..." : formatCount(userStats?.eventsCount || 0)
  }, {
    label: "Seguidores",
    value: statsLoading ? "..." : formatCount(userStats?.followersCount || 0),
    onClick: () => setFollowSheetType("followers")
  }, {
    label: "Siguiendo",
    value: statsLoading ? "..." : formatCount(userStats?.followingCount || 0),
    onClick: () => setFollowSheetType("following")
  }];
  const isFollowPending = followMutation.isPending || unfollowMutation.isPending;
  const renderTimelineCard = (item: any, index: number) => <TimelineCard key={item.id} id={item.id} title={item.title} imageUrl={item.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"} startDatetime={item.start_datetime} location={item.location_name} category={item.category} attendees={item.guestlist_entries?.[0]?.count || 0} isPost={item.is_post || false} createdAt={item.created_at} ownerAvatar={item.creator?.avatar_url} creatorId={item.creator_id} index={index} />;
  return <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background">
        <div className="flex items-center justify-between px-4 py-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-brand text-xl text-foreground font-semibold">{userProfile.username}</h1>
          </div>
          <div className="flex items-center gap-1">
            {hasBusinessInfo &&
          <Button variant="ghost" size="icon" onClick={() => setBusinessInfoOpen(true)}>
                <Info className="w-5 h-5" />
              </Button>
          }
            {id && <ShareProfileMenu userId={id} username={userProfile.username} />}
          </div>
        </div>
      </header>

      {/* Profile info */}
      <div className="px-4 py-0 bg-background">
        <m.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="flex items-start gap-4">
          <div className="relative">
            <img src={userProfile.avatar_url || DEFAULT_AVATAR} alt="Perfil" className="w-24 h-24 rounded-full object-cover border-primary border-0 bg-secondary" />
          </div>

          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">{userProfile.full_name || userProfile.username}</p>
            {/* Stats */}
            <div className="flex gap-6 mt-2">
              {stats.map((stat) => <div key={stat.label} className={`text-center ${stat.onClick ? "cursor-pointer transition-opacity" : ""}`} onClick={stat.onClick}>
                  <p className="font-brand text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>)}
            </div>
          </div>
        </m.div>

        {/* Bio */}
        <m.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.05
      }} className="mt-4">
          {/* Business type label */}
          {isBusiness && businessType &&
        <p className="text-xs font-medium text-primary mb-1 capitalize">{businessType}</p>
        }
          {userProfile.bio && <MentionText text={userProfile.bio} className="text-sm text-foreground/80" />}
          {userProfile.city && <p className="text-xs text-muted-foreground mt-1">📍 {userProfile.city}</p>}
        </m.div>

        {/* Action buttons - only show for other users */}
        {!isOwnProfile && <m.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.1
      }} className="flex gap-2 mt-4">
            <Button variant={isFollowing ? "secondary" : "hero"} className="flex-1 min-w-0" onClick={handleFollowToggle} disabled={followStatusLoading || isFollowPending}>
              {isFollowPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? "Siguiendo" : "Seguir"}
            </Button>

            {/* For food businesses: Message pill + Reserve pill + Menu icon */}
            {isBusiness && isFoodBusiness ?
        <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" className="flex-1 min-w-0" onClick={handleMessage} disabled={canMessageLoading || createChatMutation.isPending || !canMessageData?.canMessage}>
                      {createChatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mensaje"}
                    </Button>
                  </TooltipTrigger>
                  {!canMessageData?.canMessage && canMessageData?.reason && <TooltipContent><p>{canMessageData.reason}</p></TooltipContent>}
                </Tooltip>

                {reservationsEnabled &&
          <Button
            variant="secondary" className="flex-1 min-w-0" onClick={() => {
              if (isGuest) {
                promptAuth({ action: "hacer una reserva" });
                return;
              }
              setReservationSheetOpen(true);
            }}>
            
                    Reservar
                  </Button>
          }

                {menuEnabled &&
          <Button variant="secondary" size="icon" onClick={() => setMenuSheetOpen(true)} className="bg-destructive/15 border-destructive/30 shrink-0">
                    <UtensilsCrossed className="w-4 h-4 text-destructive" />
                  </Button>
          }
              </> :

        <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" className="flex-1 min-w-0" onClick={handleMessage} disabled={canMessageLoading || createChatMutation.isPending || !canMessageData?.canMessage}>
                    {createChatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mensaje"}
                  </Button>
                </TooltipTrigger>
                {!canMessageData?.canMessage && canMessageData?.reason && <TooltipContent>
                    <p>{canMessageData.reason}</p>
                  </TooltipContent>}
              </Tooltip>
        }
          </m.div>}
      </div>

      {/* Timeline Content */}
      <div className="py-4 mt-4">
        <div className="masonry-grid">
          {timelineLoading ? <div className="col-span-2 flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div> : !timeline || timeline.length === 0 ? <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">Sin publicaciones aún</div> : timeline.map((item, index) => renderTimelineCard(item, index))}
        </div>
      </div>

      {/* Followers/Following Sheet */}
      {id && <FollowersSheet userId={id} type={followSheetType || "followers"} open={!!followSheetType} onOpenChange={(open) => !open && setFollowSheetType(null)} />}
      {/* Menu Sheet for food businesses */}
      {id && isBusiness && isFoodBusiness && menuEnabled && <MenuSheet open={menuSheetOpen} onOpenChange={setMenuSheetOpen} userId={id} businessName={userProfile?.full_name || userProfile?.username} />}
      {/* Business Info Sheet */}
      {userProfile &&
    <BusinessInfoSheet
      open={businessInfoOpen}
      onOpenChange={setBusinessInfoOpen}
      businessName={userProfile.full_name || userProfile.username}
      address={userProfile.business_address}
      hours={userProfile.business_hours}
      phone={userProfile.business_phone} />

    }
      {/* Reservation Sheet for food businesses */}
      {id && isBusiness && isFoodBusiness && reservationsEnabled &&
    <ReservationSheet
      open={reservationSheetOpen}
      onOpenChange={setReservationSheetOpen}
      businessId={id}
      businessName={userProfile?.full_name || userProfile?.username || ""}
      businessHours={userProfile?.business_hours}
      reservationStartTime={(userProfile as any)?.reservation_start_time}
      reservationEndTime={(userProfile as any)?.reservation_end_time} />

    }
    </AppLayout>;
};
export default UserProfile;