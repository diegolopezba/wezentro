import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Loader2, Crown, Sparkles, X, UtensilsCrossed } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserTimeline } from "@/hooks/useUserTimeline";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserSubscription, getPlanDisplayName } from "@/hooks/useSubscription";
import { FollowersSheet } from "@/components/profile/FollowersSheet";
import { TimelineCard } from "@/components/events/TimelineCard";
import { EditMenuSheet } from "@/components/menu/EditMenuSheet";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

const Profile = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [followSheetType, setFollowSheetType] = useState<"followers" | "following" | null>(null);
  const [showProfileBanner, setShowProfileBanner] = useState(true);
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);

  const { data: userStats, isLoading: statsLoading } = useUserStats(user?.id);
  const { data: timeline, isLoading: timelineLoading } = useUserTimeline(user?.id);
  const { data: subscription } = useUserSubscription();

  const currentPlan = subscription?.plan_type || "free";
  const isPremium = currentPlan !== "free";
  const isFoodBusiness = currentPlan === "food_premium";

  // Check if profile is incomplete (missing birth_date or gender)
  const isProfileIncomplete = profile && (!profile.birth_date || !profile.gender);

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return count.toString();
  };

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
      <header className="sticky top-0 z-40 safe-top bg-background">
        <div className="flex items-center justify-between px-4 py-0">
          <h1 className="font-brand text-xl font-bold text-foreground">
            @{profile?.username || "cargando"}
          </h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Profile info */}
      <div className="px-4 py-[10px] bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4"
        >
          <div className="relative">
            <img
              src={profile?.avatar_url || DEFAULT_AVATAR}
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
              {profile?.full_name || profile?.username}
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
          {profile?.bio && <p className="text-sm text-foreground/80">{profile.bio}</p>}
          {profile?.city && <p className="text-xs text-muted-foreground mt-1">📍 {profile.city}</p>}
          
          {/* Edit Menu button for food subscribers */}
          {isFoodBusiness && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMenuSheetOpen(true)}
              className="mt-3 gap-2 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 hover:from-orange-500/20 hover:to-red-500/20"
            >
              <UtensilsCrossed className="w-4 h-4 text-orange-500" />
              Editar Menú
            </Button>
          )}
        </motion.div>

        {/* Complete Profile Banner - show when birth_date or gender is missing */}
        <AnimatePresence>
          {isProfileIncomplete && showProfileBanner && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.1 }}
              className="mt-4"
            >
              <div className="p-4 rounded-2xl border bg-gradient-to-r from-secondary to-secondary/50 border-border relative">
                <button
                  onClick={() => setShowProfileBanner(false)}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-background/50 flex items-center justify-center hover:bg-background transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-3 pr-6">
                  <div className="w-10 h-10 flex items-center justify-center bg-primary/20 rounded-full">
                    <Sparkles className="text-primary w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Completa tu perfil</h3>
                    <p className="text-xs text-muted-foreground">Agrega tu información personal</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/edit-profile")}
                    className="shrink-0"
                  >
                    Completar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subscription badge - only show for free users */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4"
          >
            <div className="p-4 rounded-2xl border bg-gradient-to-r from-amber-500/20 to-amber-500/20 border-amber-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 rounded-md">
                    <Crown className="text-white w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{getPlanDisplayName(currentPlan)}</h3>
                    <p className="text-xs text-muted-foreground">Suscribete para unirte a guestlists</p>
                  </div>
                </div>
                <Button variant="premium" size="sm" onClick={() => navigate("/settings/subscription")}>
                  Mejorar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Timeline Content */}
      <div className="py-4">
        <div className="masonry-grid">
          {timelineLoading ? (
            <div className="col-span-2 flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !timeline || timeline.length === 0 ? (
          <div className="col-span-2 w-full flex flex-col items-start py-16 px-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/create")} className="gap-2">
                Crear tu primera publicación
              </Button>
            </div>
          ) : (
            timeline.map((item, index) => renderTimelineCard(item, index))
          )}
        </div>
      </div>

      {/* Followers/Following Sheet */}
      {user && (
        <FollowersSheet
          userId={user.id}
          type={followSheetType || "followers"}
          open={!!followSheetType}
          onOpenChange={(open) => !open && setFollowSheetType(null)}
        />
      )}
      {/* Edit Menu Sheet for food subscribers */}
      {isFoodBusiness && (
        <EditMenuSheet
          open={menuSheetOpen}
          onOpenChange={setMenuSheetOpen}
        />
      )}
    </AppLayout>
  );
};

export default Profile;
