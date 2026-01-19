import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Loader2, Crown, UtensilsCrossed } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile, useIsFollowing, useFollowUser, useUnfollowUser } from "@/hooks/useUserProfile";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserTimeline } from "@/hooks/useUserTimeline";
import { useCanMessageUser } from "@/hooks/useUserSettings";
import { useCreatePrivateChat } from "@/hooks/useChats";
import { useUserSubscriptionById } from "@/hooks/useSubscription";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { FollowersSheet } from "@/components/profile/FollowersSheet";
import { TimelineCard } from "@/components/events/TimelineCard";
import { MenuSheet } from "@/components/menu/MenuSheet";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [followSheetType, setFollowSheetType] = useState<"followers" | "following" | null>(null);
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);

  // Redirect to own profile if viewing self
  const isOwnProfile = currentUser?.id === id;

  const { data: userProfile, isLoading: profileLoading } = useUserProfile(id);
  const { data: userStats, isLoading: statsLoading } = useUserStats(id);
  const { data: isFollowing, isLoading: followStatusLoading } = useIsFollowing(id);
  const { data: timeline, isLoading: timelineLoading } = useUserTimeline(id);
  const { data: canMessageData, isLoading: canMessageLoading } = useCanMessageUser(id);
  const { data: userSubscription } = useUserSubscriptionById(id);

  const isPremium = userSubscription?.plan_type && userSubscription.plan_type !== "free";
  const isFoodBusiness = userSubscription?.plan_type === "food_premium";
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const createChatMutation = useCreatePrivateChat();

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return count.toString();
  };

  const handleFollowToggle = () => {
    if (!id) return;
    if (isFollowing) {
      unfollowMutation.mutate(id);
    } else {
      followMutation.mutate(id);
    }
  };

  const handleMessage = () => {
    if (!id) return;
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
      },
    });
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <h1 className="font-brand text-xl font-bold text-foreground mb-2">Usuario no encontrado</h1>
        <Button onClick={() => navigate(-1)}>Volver</Button>
      </div>
    );
  }

  const stats = [
    {
      label: "Eventos",
      value: statsLoading ? "..." : formatCount(userStats?.eventsCount || 0),
    },
    {
      label: "Seguidores",
      value: statsLoading ? "..." : formatCount(userStats?.followersCount || 0),
      onClick: () => setFollowSheetType("followers"),
    },
    {
      label: "Siguiendo",
      value: statsLoading ? "..." : formatCount(userStats?.followingCount || 0),
      onClick: () => setFollowSheetType("following"),
    },
  ];

  const isFollowPending = followMutation.isPending || unfollowMutation.isPending;

  const renderTimelineCard = (item: any, index: number) => (
    <TimelineCard
      key={item.id}
      id={item.id}
      title={item.title}
      imageUrl={item.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"}
      startDatetime={item.start_datetime}
      location={item.location_name}
      category={item.category}
      attendees={item.guestlist_entries?.[0]?.count || 0}
      isPost={item.is_post || false}
      createdAt={item.created_at}
      ownerAvatar={item.creator?.avatar_url}
      creatorId={item.creator_id}
      index={index}
    />
  );

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-3 px-4 py-0 bg-background">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">@{userProfile.username}</h1>
        </div>
      </header>

      {/* Profile info */}
      <div className="px-4 py-0 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4"
        >
          <div className="relative">
            <img
              src={userProfile.avatar_url || DEFAULT_AVATAR}
              alt="Perfil"
              className="w-24 h-24 rounded-full object-cover border-primary border-0 bg-secondary"
            />
            {isPremium && (
              <div className={`absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-background ${isFoodBusiness ? "bg-gradient-to-br from-orange-500 to-red-500" : "bg-gradient-to-br from-amber-400 to-amber-600"}`}>
                {isFoodBusiness ? (
                  <UtensilsCrossed className="w-4 h-4 text-white" />
                ) : (
                  <Crown className="w-4 h-4 text-white" />
                )}
              </div>
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">
              {userProfile.full_name || userProfile.username}
            </p>
            {/* Stats */}
            <div className="flex gap-6 mt-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`text-center ${
                    stat.onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
                  }`}
                  onClick={stat.onClick}
                >
                  <p className="font-brand text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4"
        >
          {userProfile.bio && <p className="text-sm text-foreground/80">{userProfile.bio}</p>}
          {userProfile.city && (
            <p className="text-xs text-muted-foreground mt-1">📍 {userProfile.city}</p>
          )}
        </motion.div>

        {/* Action buttons - only show for other users */}
        {!isOwnProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-3 mt-4"
          >
            <Button
              variant={isFollowing ? "secondary" : "hero"}
              className="flex-1"
              onClick={handleFollowToggle}
              disabled={followStatusLoading || isFollowPending}
            >
              {isFollowPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4 mr-2" />
                  Dejar de seguir
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Seguir
                </>
              )}
            </Button>
            
            {/* Menu button for food businesses */}
            {isFoodBusiness && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setMenuSheetOpen(true)}
                className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30 hover:from-orange-500/30 hover:to-red-500/30"
              >
                <UtensilsCrossed className="w-4 h-4 text-orange-500" />
              </Button>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleMessage}
                    disabled={canMessageLoading || createChatMutation.isPending || !canMessageData?.canMessage}
                  >
                    {createChatMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Mensaje
                      </>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              {!canMessageData?.canMessage && canMessageData?.reason && (
                <TooltipContent>
                  <p>{canMessageData.reason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </motion.div>
        )}
      </div>

      {/* Timeline Content */}
      <div className="py-4 mt-4">
        <div className="masonry-grid">
          {timelineLoading ? (
            <div className="col-span-2 flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !timeline || timeline.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">
              Sin publicaciones aún
            </div>
          ) : (
            timeline.map((item, index) => renderTimelineCard(item, index))
          )}
        </div>
      </div>

      {/* Followers/Following Sheet */}
      {id && (
        <FollowersSheet
          userId={id}
          type={followSheetType || "followers"}
          open={!!followSheetType}
          onOpenChange={(open) => !open && setFollowSheetType(null)}
        />
      )}
      {/* Menu Sheet for food businesses */}
      {id && isFoodBusiness && (
        <MenuSheet
          open={menuSheetOpen}
          onOpenChange={setMenuSheetOpen}
          userId={id}
          businessName={userProfile?.full_name || userProfile?.username}
        />
      )}
    </AppLayout>
  );
};

export default UserProfile;
