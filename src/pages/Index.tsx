import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EventFeed } from "@/components/events/EventFeed";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useForYouEvents } from "@/hooks/useForYouEvents";
import { useFollowingEventsScored } from "@/hooks/useFollowingEventsScored";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { useActiveSponsoredPosts, useTrackSponsoredImpression, SponsoredEventForFeed } from "@/hooks/useSponsoredPosts";
import { useLocationContext } from "@/contexts/LocationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SelectedEventProvider } from "@/contexts/SelectedEventContext";
import { EventDetailOverlay } from "@/components/events/EventDetailOverlay";
import { haversine } from "@/lib/feedScoring";
import { useQuery } from "@tanstack/react-query";

// ───────── Sponsored Post Targeting Filter ─────────

const filterSponsoredByTargeting = (
  posts: SponsoredEventForFeed[],
  userLat: number | null,
  userLon: number | null,
  userBirthDate: string | null,
  userGender: string | null,
  userInterests: string[] | null
): SponsoredEventForFeed[] => {
  return posts.filter((sp) => {
    // Category match
    if (sp.target_categories && sp.target_categories.length > 0) {
      const userCats = (userInterests || []).map((c) => c.toLowerCase());
      const hasCategoryMatch = sp.target_categories.some((tc) =>
        userCats.includes(tc.toLowerCase())
      );
      if (!hasCategoryMatch) return false;
    }

    // Radius match
    if (sp.target_radius_km != null && sp.target_radius_km > 0) {
      if (!userLat || !userLon || !sp.latitude || !sp.longitude) return false;
      const dist = haversine(userLat, userLon, sp.latitude, sp.longitude);
      if (dist > sp.target_radius_km) return false;
    }

    // Gender match
    if (sp.target_gender && sp.target_gender !== "all") {
      if (!userGender || userGender.toLowerCase() !== sp.target_gender.toLowerCase()) return false;
    }

    // Age match
    if (sp.target_age_min != null || sp.target_age_max != null) {
      if (!userBirthDate) return false;
      const age = Math.floor(
        (Date.now() - new Date(userBirthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      if (sp.target_age_min != null && age < sp.target_age_min) return false;
      if (sp.target_age_max != null && age > sp.target_age_max) return false;
    }

    return true;
  });
};

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { promptAuth } = useAuthPrompt();
  const { location } = useLocationContext();
  const isGuest = !user;
  
  const [activeTab, setActiveTab] = useState<"for-you" | "following">("for-you");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    data: forYouEvents = [],
    isLoading: forYouLoading,
    refetch: refetchForYou
  } = useForYouEvents();
  const {
    data: followingEvents = [],
    isLoading: followingLoading,
    refetch: refetchFollowing
  } = useFollowingEventsScored();
  const {
    data: unreadCount = 0
  } = useUnreadNotificationsCount();
  
  const { data: sponsoredPosts = [] } = useActiveSponsoredPosts();
  const trackImpression = useTrackSponsoredImpression();

  // Fetch user demographics for sponsored post targeting
  const { data: userDemographics } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) return null;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("profiles")
        .select("birth_date, gender, interests")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });
  
  const handleNotificationClick = () => {
    if (isGuest) {
      promptAuth({ action: "ver tus notificaciones" });
      return;
    }
    navigate("/notifications");
  };
  const events = activeTab === "for-you" ? forYouEvents : followingEvents;
  const isLoading = activeTab === "for-you" ? forYouLoading : followingLoading;

  const handleRefresh = useCallback(async () => {
    if (activeTab === "for-you") {
      await refetchForYou();
    } else {
      await refetchFollowing();
    }
  }, [activeTab, refetchForYou, refetchFollowing]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const container = e.target as HTMLDivElement;
      const currentScrollY = container.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setHeaderVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [lastScrollY]);

  // Filter sponsored posts by targeting criteria
  const filteredSponsored = useMemo(() => {
    return filterSponsoredByTargeting(
      sponsoredPosts,
      location?.lat || null,
      location?.lng || null,
      userDemographics?.birth_date || null,
      userDemographics?.gender || null,
      userDemographics?.interests || null
    );
  }, [sponsoredPosts, location, userDemographics]);

  const transformedEvents = useMemo(() => {
    const sponsoredEventIds = new Set(filteredSponsored.map(sp => sp.id));

    const organic = events.filter(event => {
      if (activeTab === "for-you" && sponsoredEventIds.has(event.id)) return false;
      const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase()) || (event.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return searchQuery === "" || matchesSearch;
    }).map(event => {
      const guestlistEntries = (event as any).guestlist_entries || [];
      const attendeeAvatars = guestlistEntries.map((entry: any) => entry.user).filter(Boolean).map((user: any) => ({
        id: user.id,
        avatar_url: user.avatar_url
      }));
      return {
        id: event.id,
        title: event.title || undefined,
        imageUrl: event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
        date: event.start_datetime ? format(new Date(event.start_datetime), "EEE, d MMM • h:mm a", { locale: es }) : "",
        location: event.location_name || "Ubicación por confirmar",
        category: event.category || "party",
        attendees: guestlistEntries.length,
        attendeeAvatars,
        hasGuestlist: event.has_guestlist || false,
        ownerAvatar: event.creator?.avatar_url || undefined,
        creatorId: event.creator_id,
        repostInfo: (event as any).repostInfo,
        isSponsored: false,
      };
    });

    if (filteredSponsored.length > 0 && searchQuery === "") {
      const sponsoredCards = filteredSponsored.map(sp => {
        const guestlistEntries = sp.guestlist_entries || [];
        const attendeeAvatars = guestlistEntries.map((entry: any) => entry.user).filter(Boolean).map((user: any) => ({
          id: user.id,
          avatar_url: user.avatar_url,
        }));
        return {
          id: sp.id,
          title: sp.title || undefined,
          imageUrl: sp.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
          date: sp.start_datetime ? format(new Date(sp.start_datetime), "EEE, d MMM • h:mm a", { locale: es }) : "",
          location: sp.location_name || "Ubicación por confirmar",
          category: sp.category || "party",
          attendees: guestlistEntries.length,
          attendeeAvatars,
          hasGuestlist: sp.has_guestlist || false,
          ownerAvatar: sp.creator?.avatar_url || undefined,
          creatorId: sp.creator_id,
          isSponsored: true,
          sponsoredPostId: sp.sponsoredPostId,
          repostInfo: undefined,
        };
      });

      const result = [...organic];
      // First sponsored at index 1 (second card = top of right column in masonry)
      // Then every 9 positions after (8 organic + 1 sponsored slot)
      let insertAt = 1;
      const interval = 9;
      for (let s = 0; s < sponsoredCards.length; s++) {
        if (insertAt <= result.length) {
          result.splice(insertAt, 0, sponsoredCards[s]);
          insertAt += interval;
        }
      }
      return result;
    }

    return organic;
  }, [events, searchQuery, activeTab, filteredSponsored]);

  return <SelectedEventProvider>
      <AppLayout ref={scrollContainerRef}>
        <header className="sticky top-0 z-40 safe-top bg-background">
          <div className="flex items-center justify-between px-4 py-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="font-brand text-2xl text-foreground font-semibold">zentro</h1>
            </motion.div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative" onClick={handleNotificationClick}>
                <Bell className="w-5 h-5" />
                {!isGuest && unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowSearch(s => !s)}>
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>
          {showSearch && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar eventos, lugares..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </motion.div>}
          <motion.div 
            animate={{ height: headerVisible ? "auto" : 0, opacity: headerVisible ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="flex px-4 pb-3 gap-2" style={{ pointerEvents: headerVisible ? "auto" : "none" }}>
              <button onClick={() => setActiveTab("for-you")} className={`relative px-3 py-1 text-sm font-medium rounded-full transition-all ${activeTab === "for-you" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {activeTab === "for-you" && <motion.div layoutId="activeTab" className="absolute inset-0 gradient-primary rounded-full" transition={{ type: "spring", duration: 0.5 }} />}
                <span className={`relative z-10 ${activeTab === "for-you" ? "text-primary" : ""}`}>Para Ti</span>
              </button>
              {!isGuest && (
                <button onClick={() => setActiveTab("following")} className={`relative px-3 py-1 text-sm font-medium rounded-full transition-all ${activeTab === "following" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {activeTab === "following" && <motion.div layoutId="activeTab" className="absolute inset-0 gradient-primary rounded-full" transition={{ type: "spring", duration: 0.5 }} />}
                  <span className={`relative z-10 ${activeTab === "following" ? "text-primary" : ""}`}>Siguiendo</span>
                </button>
              )}
            </div>
          </motion.div>
        </header>
        <PullToRefresh onRefresh={handleRefresh} className="flex-1">
          <EventFeed events={transformedEvents} isLoading={isLoading} emptyStateType={activeTab} />
        </PullToRefresh>
      </AppLayout>
      <EventDetailOverlay />
    </SelectedEventProvider>;
};
export default Index;
