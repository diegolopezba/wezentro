import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Image, Star, Heart, Loader2, Crown } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile, useIsFollowing, useFollowUser, useUnfollowUser } from "@/hooks/useUserProfile";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserCreatedEvents, useUserJoinedEvents } from "@/hooks/useEvents";
import { useCanMessageUser } from "@/hooks/useUserSettings";
import { useCreatePrivateChat } from "@/hooks/useChats";
import { useUserSubscriptionById } from "@/hooks/useSubscription";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { FollowersSheet } from "@/components/profile/FollowersSheet";
import { EventCard } from "@/components/events/EventCard";

interface ProfilePhoto {
  id: string;
  photo_url: string;
  display_order: number;
}

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"photos" | "created" | "joined">("photos");
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [followSheetType, setFollowSheetType] = useState<"followers" | "following" | null>(null);

  // Redirect to own profile if viewing self
  const isOwnProfile = currentUser?.id === id;

  const { data: userProfile, isLoading: profileLoading } = useUserProfile(id);
  const { data: userStats, isLoading: statsLoading } = useUserStats(id);
  const { data: isFollowing, isLoading: followStatusLoading } = useIsFollowing(id);
  const { data: createdEvents, isLoading: createdLoading } = useUserCreatedEvents(id);
  const { data: joinedEvents, isLoading: joinedLoading } = useUserJoinedEvents(id);
  const { data: canMessageData, isLoading: canMessageLoading } = useCanMessageUser(id);
  const { data: userSubscription } = useUserSubscriptionById(id);
  
  const isPremium = userSubscription?.plan_type && userSubscription.plan_type !== "free";
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const createChatMutation = useCreatePrivateChat();

  useEffect(() => {
    if (id) {
      fetchPhotos();
    }
  }, [id]);

  const fetchPhotos = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("profile_photos")
      .select("*")
      .eq("user_id", id)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setPhotos(data);
    }
  };

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
      toast.error(canMessageData?.reason || "Cannot message this user");
      return;
    }
    createChatMutation.mutate(id, {
      onSuccess: (chatId) => {
        navigate(`/chats/${chatId}`);
      },
      onError: () => {
        toast.error("Failed to start conversation");
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
        <h1 className="font-brand text-xl font-bold text-foreground mb-2">User not found</h1>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const stats = [
    { label: "Events", value: statsLoading ? "..." : formatCount(userStats?.eventsCount || 0) },
    { label: "Followers", value: statsLoading ? "..." : formatCount(userStats?.followersCount || 0), onClick: () => setFollowSheetType("followers") },
    { label: "Following", value: statsLoading ? "..." : formatCount(userStats?.followingCount || 0), onClick: () => setFollowSheetType("following") },
  ];

  const tabs = [
    { id: "photos", label: "Photos", icon: Image },
    { id: "created", label: "Created", icon: Star },
    { id: "joined", label: "Joined", icon: Heart }
  ];

  const isFollowPending = followMutation.isPending || unfollowMutation.isPending;

  const renderEventCard = (event: any, index: number) => (
    <EventCard
      key={event.id}
      id={event.id}
      title={event.title || undefined}
      imageUrl={event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"}
      date={format(new Date(event.start_datetime), "EEE, MMM d • h:mm a")}
      location={event.location_name || "Location TBA"}
      category={event.category || "party"}
      attendees={event.guestlist_entries?.[0]?.count || 0}
      ownerAvatar={event.creator?.avatar_url}
      creatorId={event.creator_id}
      index={index}
    />
  );

  const renderEmptyState = (message: string) => (
    <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">
      {message}
    </div>
  );

  const renderLoading = () => (
    <div className="col-span-2 flex justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-3 px-4 py-0 bg-background">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">
            @{userProfile.username}
          </h1>
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
              src={userProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.username}`}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-primary border-0 bg-secondary"
            />
            {isPremium && (
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg border-2 border-background">
                <Crown className="w-4 h-4 text-white" />
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
                  className={`text-center ${stat.onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={stat.onClick}
                >
                  <p className="font-brand text-lg font-bold text-foreground">
                    {stat.value}
                  </p>
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
          <p className="text-sm text-foreground/80">
            {userProfile.bio || "No bio yet"}
          </p>
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
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
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
                        Message
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

      {/* Tabs */}
      <div className="sticky top-[44px] z-30 mt-4">
        <div className="flex border-b border-border bg-background">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors relative ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="userProfileTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="py-4">
        {activeTab === "photos" && (
          <div className="masonry-grid">
            {photos.length === 0 ? (
              renderEmptyState("No photos yet")
            ) : (
              photos.map((photo, index) => (
                <motion.div 
                  key={photo.id} 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: index * 0.05 }} 
                  className="masonry-item"
                >
                  <div className="rounded-2xl overflow-hidden">
                    <img 
                      src={photo.photo_url} 
                      alt={`Photo ${index + 1}`} 
                      className="w-full h-auto object-cover" 
                    />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
        
        {activeTab === "created" && (
          <div className="masonry-grid">
            {createdLoading ? (
              renderLoading()
            ) : !createdEvents || createdEvents.length === 0 ? (
              renderEmptyState("No events created yet")
            ) : (
              createdEvents.map((event, index) => renderEventCard(event, index))
            )}
          </div>
        )}
        
        {activeTab === "joined" && (
          <div className="masonry-grid">
            {joinedLoading ? (
              renderLoading()
            ) : !joinedEvents || joinedEvents.length === 0 ? (
              renderEmptyState("No events joined yet")
            ) : (
              joinedEvents.map((event, index) => renderEventCard(event, index))
            )}
          </div>
        )}
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
    </AppLayout>
  );
};

export default UserProfile;
