import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EventFeed } from "@/components/events/EventFeed";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useForYouEvents } from "@/hooks/useForYouEvents";
import { useFollowingEventsScored } from "@/hooks/useFollowingEventsScored";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { useActiveSponsoredPosts, useTrackSponsoredImpression } from "@/hooks/useSponsoredPosts";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { promptAuth } = useAuthPrompt();
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
    refetch: refetchForYou,
    fetchNextPage: fetchMoreForYou,
    hasNextPage: hasMoreForYou,
    isFetchingNextPage: isFetchingMoreForYou,
  } = useForYouEvents();
  const {
    data: followingEvents = [],
    isLoading: followingLoading,
    refetch: refetchFollowing
  } = useFollowingEventsScored();
  const {
    data: unreadCount = 0
  } = useUnreadNotificationsCount();

  // Server-side targeted + ranked sponsored posts
  const { data: sponsoredPosts = [] } = useActiveSponsoredPosts();
  const trackImpression = useTrackSponsoredImpression();

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

  const transformedEvents = useMemo(() => {
    const sponsoredEventIds = new Set(sponsoredPosts.map(sp => sp.id));

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
      // Prefer the server-side total from the optimized RPC; fall back to entries length.
      const attendeeTotal = (event as any)._attendee_count ?? guestlistEntries.length;
      return {
        id: event.id,
        title: event.title || undefined,
        imageUrl: event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
        date: event.start_datetime ? format(new Date(event.start_datetime), "EEE, d MMM • h:mm a", { locale: es }) : "",
        location: event.location_name || "Ubicación por confirmar",
        category: event.category || "party",
        attendees: attendeeTotal,
        attendeeAvatars,
        hasGuestlist: event.has_guestlist || false,
        ownerAvatar: event.creator?.avatar_url || undefined,
        creatorId: event.creator_id,
        repostInfo: (event as any).repostInfo,
        isSponsored: false,
        media: (event as any).media || [],
      };
    });

    if (sponsoredPosts.length > 0 && searchQuery === "") {
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
          media: [],
        };
      });

      const result = [...organic];
      // First sponsored at index 1, then every 9 positions (8 organic + 1 sponsored slot)
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
  }, [events, searchQuery, activeTab, sponsoredPosts]);

  return <AppLayout ref={scrollContainerRef}>
        <header className="sticky top-0 z-40 safe-top bg-background">
          <div className="flex items-center justify-between px-4 py-4">
            <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="font-brand text-2xl text-foreground font-semibold">zentro</h1>
            </m.div>
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
          {showSearch && <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar eventos, lugares..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </m.div>}
          <m.div
            animate={{ height: headerVisible ? "auto" : 0, opacity: headerVisible ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="flex px-4 pb-3 gap-2" style={{ pointerEvents: headerVisible ? "auto" : "none" }}>
              <button onClick={() => setActiveTab("for-you")} className={`relative px-3 py-1 text-sm font-medium rounded-full transition-colors duration-150 ${activeTab === "for-you" ? "text-primary" : "text-muted-foreground active:text-foreground"}`}>
                {activeTab === "for-you" && <m.div initial={false} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 gradient-primary rounded-full" />}
                <span className="relative z-10">Para Ti</span>
              </button>
              {!isGuest && (
                <button onClick={() => setActiveTab("following")} className={`relative px-3 py-1 text-sm font-medium rounded-full transition-colors duration-150 ${activeTab === "following" ? "text-primary" : "text-muted-foreground active:text-foreground"}`}>
                  {activeTab === "following" && <m.div initial={false} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 gradient-primary rounded-full" />}
                  <span className="relative z-10">Siguiendo</span>
                </button>
              )}
            </div>
          </m.div>
        </header>
        <PullToRefresh onRefresh={handleRefresh} className="flex-1">
          <EventFeed events={transformedEvents} isLoading={isLoading} emptyStateType={activeTab} />
        </PullToRefresh>
      </AppLayout>;
};
export default Index;
