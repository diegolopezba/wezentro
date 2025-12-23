import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Settings, Image, Star, Heart, Loader2, Crown, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserCreatedEvents, useUserJoinedEvents } from "@/hooks/useEvents";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserSubscription, getPlanDisplayName } from "@/hooks/useSubscription";
import { FollowersSheet } from "@/components/profile/FollowersSheet";
import { EventCard } from "@/components/events/EventCard";
interface ProfilePhoto {
  id: string;
  photo_url: string;
  display_order: number;
}
const Profile = () => {
  const navigate = useNavigate();
  const {
    profile,
    user
  } = useAuth();
  const [activeTab, setActiveTab] = useState<"photos" | "created" | "joined">("photos");
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [followSheetType, setFollowSheetType] = useState<"followers" | "following" | null>(null);
  const {
    data: userStats,
    isLoading: statsLoading
  } = useUserStats(user?.id);
  const {
    data: createdEvents,
    isLoading: createdLoading
  } = useUserCreatedEvents(user?.id);
  const {
    data: joinedEvents,
    isLoading: joinedLoading
  } = useUserJoinedEvents(user?.id);
  const {
    data: subscription
  } = useUserSubscription();
  const currentPlan = subscription?.plan_type || "free";
  const isPremium = currentPlan !== "free";
  const isBusiness = currentPlan === "business_premium";
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return count.toString();
  };
  const stats = [{
    label: "Events",
    value: statsLoading ? "..." : formatCount(userStats?.eventsCount || 0)
  }, {
    label: "Followers",
    value: statsLoading ? "..." : formatCount(userStats?.followersCount || 0),
    onClick: () => setFollowSheetType("followers")
  }, {
    label: "Following",
    value: statsLoading ? "..." : formatCount(userStats?.followingCount || 0),
    onClick: () => setFollowSheetType("following")
  }];
  const tabs = [{
    id: "photos",
    label: "Photos",
    icon: Image
  }, {
    id: "created",
    label: "Created",
    icon: Star
  }, {
    id: "joined",
    label: "Joined",
    icon: Heart
  }];
  useEffect(() => {
    if (user) {
      fetchPhotos();
    }
  }, [user]);
  const fetchPhotos = async () => {
    if (!user) return;
    const {
      data,
      error
    } = await supabase.from("profile_photos").select("*").eq("user_id", user.id).order("display_order", {
      ascending: true
    });
    if (!error && data) {
      setPhotos(data);
    }
  };
  const renderEventCard = (event: any, index: number) => <EventCard key={event.id} id={event.id} title={event.title || undefined} imageUrl={event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"} date={format(new Date(event.start_datetime), "EEE, MMM d • h:mm a")} location={event.location_name || "Location TBA"} category={event.category || "party"} attendees={event.guestlist_entries?.[0]?.count || 0} ownerAvatar={event.creator?.avatar_url} creatorId={event.creator_id} index={index} />;
  const renderEmptyState = (message: string) => <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">
      {message}
    </div>;
  const renderLoading = () => <div className="col-span-2 flex justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>;
  return <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center justify-between px-4 py-0 bg-background">
          <h1 className="font-brand text-xl font-bold text-foreground">
            @{profile?.username || "loading"}
          </h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Profile info */}
      <div className="px-4 py-[10px] bg-background">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="flex items-start gap-4">
          <div className="relative">
            <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`} alt="Profile" className="w-24 h-24 rounded-full object-cover border-primary border-0 bg-secondary" />
            {isPremium && <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg border-2 border-background">
                <Crown className="w-4 h-4 text-white" />
              </div>}
          </div>

          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">
              {profile?.full_name || profile?.username}
            </p>
            {/* Stats */}
            <div className="flex gap-6 mt-2">
              {stats.map(stat => <div key={stat.label} className={`text-center ${stat.onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} onClick={stat.onClick}>
                  <p className="font-brand text-lg font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>)}
            </div>
          </div>
        </motion.div>

        {/* Bio */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.05
      }} className="mt-4">
          <p className="text-sm text-foreground/80">
            {profile?.bio || "No bio yet"}
          </p>
          {profile?.city && <p className="text-xs text-muted-foreground mt-1">📍 {profile.city}</p>}
        </motion.div>

        {/* Subscription badge - only show for free users */}
        {!isPremium && <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.15
      }} className="mt-4">
            <div className="p-4 rounded-2xl border bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {getPlanDisplayName(currentPlan)}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Upgrade to join guestlists
                    </p>
                  </div>
                </div>
                <Button variant="premium" size="sm" onClick={() => navigate("/settings/subscription")}>
                  Upgrade
                </Button>
              </div>
            </div>
          </motion.div>}
      </div>

      {/* Tabs */}
      <div className="sticky top-[72px] z-30">
        <div className="flex border-b border-border bg-background">
          {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors relative ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                {isActive && <motion.div layoutId="profileTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>;
        })}
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="py-4">
        {activeTab === "photos" && <div className="masonry-grid">
            {photos.length === 0 ? renderEmptyState("No photos yet. Add some from your profile settings!") : photos.map((photo, index) => <motion.div key={photo.id} initial={{
          opacity: 0,
          scale: 0.9
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          delay: index * 0.05
        }} className="masonry-item">
                  <div className="rounded-2xl overflow-hidden">
                    <img src={photo.photo_url} alt={`Photo ${index + 1}`} className="w-full h-auto object-cover" />
                  </div>
                </motion.div>)}
          </div>}

        {activeTab === "created" && <div className="masonry-grid">
            {createdLoading ? renderLoading() : !createdEvents || createdEvents.length === 0 ? renderEmptyState("No events created yet") : createdEvents.map((event, index) => renderEventCard(event, index))}
          </div>}

        {activeTab === "joined" && <div className="masonry-grid">
            {joinedLoading ? renderLoading() : !joinedEvents || joinedEvents.length === 0 ? renderEmptyState("No events joined yet") : joinedEvents.map((event, index) => renderEventCard(event, index))}
          </div>}
      </div>

      {/* Followers/Following Sheet */}
      {user && <FollowersSheet userId={user.id} type={followSheetType || "followers"} open={!!followSheetType} onOpenChange={open => !open && setFollowSheetType(null)} />}
    </AppLayout>;
};
export default Profile;