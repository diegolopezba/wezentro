import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EventFeed } from "@/components/events/EventFeed";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useForYouEvents } from "@/hooks/useForYouEvents";
import { useFollowingEventsScored } from "@/hooks/useFollowingEventsScored";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { useActiveSponsoredPosts, useTrackSponsoredImpression } from "@/hooks/useSponsoredPosts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SelectedEventProvider } from "@/contexts/SelectedEventContext";
import { EventDetailOverlay } from "@/components/events/EventDetailOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { promptAuth } = useAuthPrompt();
  const isGuest = !user;
  
  const [activeTab, setActiveTab] = useState<"for-you" | "following">("for-you");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
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
  
  // Handle notification bell click for guests
  const handleNotificationClick = () => {
    if (isGuest) {
      promptAuth({ action: "ver tus notificaciones" });
      return;
    }
    navigate("/notifications");
  };
  const events = activeTab === "for-you" ? forYouEvents : followingEvents;
  const isLoading = activeTab === "for-you" ? forYouLoading : followingLoading;

  // Pull-to-refresh handler
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
    
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      setHeaderVisible(false);
    } else if (currentScrollY < lastScrollY) {
      setHeaderVisible(true);
    }
    
    setLastScrollY(currentScrollY);
  };

  const container = scrollContainerRef.current;
  if (container) {
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }
}, [lastScrollY]);

  // Transform events to EventCard format and filter
  const transformedEvents = useMemo(() => {
    // Collect sponsored event IDs to exclude from organic results
    const sponsoredEventIds = new Set(sponsoredPosts.map(sp => sp.id));

    const organic = events.filter(event => {
      // Skip events that are already being shown as sponsored
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
        date: format(new Date(event.start_datetime), "EEE, d MMM • h:mm a", {
          locale: es
        }),
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

    // Inject sponsored posts only in "for-you" tab, every 7-9 posts
    if (activeTab === "for-you" && sponsoredPosts.length > 0 && searchQuery === "") {
      const sponsoredCards = sponsoredPosts.map(sp => {
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

      // Interleave: insert one sponsored card every 7-9 organic cards
      const result = [...organic];
      let sponsoredIndex = 0;
      const interval = 8; // every 8 posts
      for (let i = interval; i <= result.length && sponsoredIndex < sponsoredCards.length; i += interval + 1) {
        result.splice(i, 0, sponsoredCards[sponsoredIndex]);
        sponsoredIndex++;
      }
      return result;
    }

    return organic;
  }, [events, searchQuery, activeTab, sponsoredPosts]);
  return <SelectedEventProvider>
      <AppLayout ref={scrollContainerRef}>
        {/* Header */}
        {/* Fixed header with logo and notification */}
        <header className="sticky top-0 z-40 safe-top bg-background">
          <div className="flex items-center justify-between px-4 py-4">
            <motion.div initial={{
            opacity: 0,
            x: -20
          }} animate={{
            opacity: 1,
            x: 0
          }}>
              <h1 className="font-brand text-2xl text-foreground font-semibold">zentro</h1>
            </motion.div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative" onClick={handleNotificationClick}>
                <Bell className="w-5 h-5" />
                {!isGuest && unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />}
              </Button>
            </div>
          </div>

          {/* Search bar */}
          {showSearch && <motion.div initial={{
          opacity: 0,
          height: 0
        }} animate={{
          opacity: 1,
          height: "auto"
        }} exit={{
          opacity: 0,
          height: 0
        }} className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar eventos, lugares..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </motion.div>}

          {/* Tabs - hide on scroll down, show on scroll up */}
          <motion.div 
            animate={{ 
              height: headerVisible ? "auto" : 0,
              opacity: headerVisible ? 1 : 0,
              marginBottom: headerVisible ? 0 : 0
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30
            }}
            className="overflow-hidden"
          >
            <div 
              className="flex px-4 pb-3 gap-2"
              style={{
                pointerEvents: headerVisible ? "auto" : "none"
              }}
            >
              <button onClick={() => setActiveTab("for-you")} className={`relative px-3 py-1 text-sm font-medium rounded-full transition-all ${activeTab === "for-you" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {activeTab === "for-you" && <motion.div layoutId="activeTab" className="absolute inset-0 gradient-primary rounded-full" transition={{
                type: "spring",
                duration: 0.5
              }} />}
                <span className={`relative z-10 ${activeTab === "for-you" ? "text-primary" : ""}`}>Para Ti</span>
              </button>
              {/* Hide Following tab for guests - requires auth */}
              {!isGuest && (
                <button onClick={() => setActiveTab("following")} className={`relative px-3 py-1 text-sm font-medium rounded-full transition-all ${activeTab === "following" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {activeTab === "following" && <motion.div layoutId="activeTab" className="absolute inset-0 gradient-primary rounded-full" transition={{
                  type: "spring",
                  duration: 0.5
                }} />}
                  <span className={`relative z-10 ${activeTab === "following" ? "text-primary" : ""}`}>Siguiendo</span>
                </button>
              )}
            </div>
          </motion.div>
        </header>

        {/* Event feed with pull-to-refresh */}
        <PullToRefresh onRefresh={handleRefresh} className="flex-1">
          <LayoutGroup>
            <EventFeed events={transformedEvents} isLoading={isLoading} emptyStateType={activeTab} />
          </LayoutGroup>
        </PullToRefresh>
      </AppLayout>

      {/* Overlay for expansion transition */}
      <EventDetailOverlay />
    </SelectedEventProvider>;
};
export default Index;
