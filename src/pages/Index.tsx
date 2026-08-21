import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { m } from "framer-motion";
import { Bell, Search, SlidersHorizontal, HelpCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EventFeed } from "@/components/events/EventFeed";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useForYouEvents } from "@/hooks/useForYouEvents";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { useEvents } from "@/hooks/useEvents";
import { useNearbyEvents, FilterOptions } from "@/hooks/useNearbyEvents";
import { useFriendsGoingData } from "@/hooks/useFriendsGoingData";
import { useUserLocation } from "@/hooks/useUserLocation";
import { FilterSheet } from "@/components/map/FilterSheet";
import { CATEGORIES } from "@/lib/categories";
import { searchAndRank } from "@/lib/searchScoring";
import { useSearchUsers } from "@/hooks/useSearchUsers";
import { UserSearchResultCard } from "@/components/search/UserSearchResultCard";
import { cn } from "@/lib/utils";

import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { useOpenNotifications } from "@/hooks/useOpenOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FeatureIntroSheet, useFeatureIntro } from "@/components/business/FeatureIntroSheet";
import { HOME_FEED_INTRO } from "@/components/business/featureIntroSteps";

const Index = () => {
  const openNotifications = useOpenNotifications();
  const { user } = useAuth();
  const { promptAuth } = useAuthPrompt();
  const isGuest = !user;
  const intro = useFeatureIntro("home");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Debounce so scoring doesn't run on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const [showFilters, setShowFilters] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const headerVisibleRef = useRef(true);
  const lastScrollY = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    dateFilter: "all",
    categories: [],
    maxDistance: null,
    hasGuestlistOnly: false,
    friendsGoingOnly: false,
  });

  const sheetFilterCount =
    (filters.dateFilter !== "all" ? 1 : 0) +
    (filters.maxDistance !== null ? 1 : 0) +
    (filters.hasGuestlistOnly ? 1 : 0) +
    (filters.friendsGoingOnly ? 1 : 0);

  const isFiltering = filters.categories.length > 0 || sheetFilterCount > 0;
  const isSearching = debouncedQuery.length > 0;
  // Search and filters both run over the full catalog, not the For You window.
  const useCatalog = isFiltering || isSearching;

  const {
    data: forYouEvents = [],
    isLoading: forYouLoading,
    refetch: refetchForYou,
    fetchNextPage: fetchMoreForYou,
    hasNextPage: hasMoreForYou,
    isFetchingNextPage: isFetchingMoreForYou,
  } = useForYouEvents();

  // Explore-style catalog, only fetched when filters or a search are active.
  const {
    data: allEvents = [],
    isLoading: catalogLoading,
    refetch: refetchCatalog,
  } = useEvents(useCatalog);
  const { location: userLocation } = useUserLocation();
  const friendsData = useFriendsGoingData(
    allEvents.map((e: any) => e.id),
    isFiltering && filters.friendsGoingOnly,
  );
  const { data: searchedUsers = [] } = useSearchUsers(debouncedQuery);
  const activeFilters = useMemo(
    () => ({ ...filters, searchQuery: debouncedQuery }),
    [filters, debouncedQuery],
  );

  const filteredEvents = useNearbyEvents(
    useCatalog ? (allEvents as any) : [],
    userLocation,
    activeFilters,
    friendsData,
  );

  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const handleNotificationClick = () => {
    if (isGuest) {
      promptAuth({ action: "ver tus notificaciones" });
      return;
    }
    openNotifications();
  };

  const events = useCatalog ? filteredEvents : forYouEvents;
  const isLoading = useCatalog ? catalogLoading : forYouLoading;


  const handleRefresh = useCallback(async () => {
    if (useCatalog) {
      await refetchCatalog();
    } else {
      await refetchForYou();
    }
  }, [useCatalog, refetchCatalog, refetchForYou]);


  const toggleCategory = (categoryId: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((c) => c !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const resetToForYou = () => {
    setFilters({
      searchQuery: "",
      dateFilter: "all",
      categories: [],
      maxDistance: null,
      hasGuestlistOnly: false,
      friendsGoingOnly: false,
    });
  };

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const container = e.target as HTMLDivElement;
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const currentScrollY = container.scrollTop;
        const shouldShow = currentScrollY < lastScrollY.current || currentScrollY <= 50;
        if (shouldShow !== headerVisibleRef.current) {
          headerVisibleRef.current = shouldShow;
          setHeaderVisible(shouldShow);
        }
        lastScrollY.current = currentScrollY;
      });
    };
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        container.removeEventListener("scroll", handleScroll);
        if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
      };
    }
  }, []);

  // Cache transformed cards by id so prop identity is stable across re-renders.
  // Sponsored cards now arrive pre-merged from the server at fixed slots —
  // no client-side ad injection (Instagram/Pinterest pattern).
  const cardCacheRef = useRef<Map<string, any>>(new Map());

  const toCard = useCallback((event: any) => {
    const cached = cardCacheRef.current.get(event.id);
    const guestlistEntries = event.guestlist_entries || [];
    const attendeeTotal = event._attendee_count ?? guestlistEntries.length;
    const repostInfo = event.repostInfo;
    const isSponsored = !!event._isSponsored;

    if (
      cached &&
      cached._attendeeTotal === attendeeTotal &&
      cached._guestlistLen === guestlistEntries.length &&
      cached._repostStamp === (repostInfo?.mostRecentRepostAt ?? null)
    ) {
      return cached;
    }

    const attendeeAvatars = guestlistEntries
      .map((entry: any) => entry.user)
      .filter(Boolean)
      .map((u: any) => ({ id: u.id, avatar_url: u.avatar_url }));

    const card = {
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
      repostInfo,
      isSponsored,
      sponsoredPostId: event._sponsoredPostId ?? undefined,
      media: event.media || [],
      _attendeeTotal: attendeeTotal,
      _guestlistLen: guestlistEntries.length,
      _repostStamp: repostInfo?.mostRecentRepostAt ?? null,
    };
    cardCacheRef.current.set(event.id, card);
    return card;
  }, []);

  const transformedEvents = useMemo(() => {
    // In catalog mode the search query is already applied (and ranked) by useNearbyEvents.
    const source = useCatalog ? events : searchAndRank(events as any[], debouncedQuery);
    return source.map(toCard);
  }, [events, debouncedQuery, useCatalog, toCard]);



  return <AppLayout ref={scrollContainerRef}>
        <header className="sticky top-0 z-30 safe-top bg-background">
          <div className="flex items-center justify-between px-4 py-4">
            <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="font-brand text-2xl text-foreground font-semibold">zentro</h1>
            </m.div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative" onClick={handleNotificationClick}>
                <Bell className="w-5 h-5" />
                {!isGuest && unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-red" />}
              </Button>
              <Button variant="ghost" size="icon" className="relative" onClick={() => setShowFilters(true)}>
                <SlidersHorizontal className="w-5 h-5" />
                {sheetFilterCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center">
                    {sheetFilterCount}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowSearch(s => !s)}>
                <Search className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={intro.reopen} aria-label="¿Cómo funciona?">
                <HelpCircle className="w-5 h-5" />
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
            <div
              className="flex px-4 pb-3 gap-2 overflow-x-auto no-scrollbar"
              style={{ pointerEvents: headerVisible ? "auto" : "none" }}
            >
              <m.button
                whileTap={{ scale: 0.95 }}
                onClick={resetToForYou}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors duration-150",
                  !isFiltering
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                Para Ti
              </m.button>
              {CATEGORIES.map((category) => {
                const isSelected = filters.categories.includes(category.id);
                return (
                  <m.button
                    key={category.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors duration-150",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    <span>{category.emoji}</span>
                    <span className="font-medium">{category.label}</span>
                  </m.button>
                );
              })}
            </div>
          </m.div>
        </header>
        <PullToRefresh onRefresh={handleRefresh} className="flex-1">
          {isSearching && searchedUsers.length > 0 && (
            <div className="px-2 pt-2">
              <p className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Personas
              </p>
              {searchedUsers.slice(0, 3).map((u) => (
                <UserSearchResultCard key={u.id} user={u} />
              ))}
            </div>
          )}
          {isSearching && !isLoading && transformedEvents.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Sin resultados para "{debouncedQuery}"
              </p>
              {isFiltering && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Prueba quitando los filtros activos.
                </p>
              )}
            </div>
          ) : (
            <EventFeed
              events={transformedEvents}
              isLoading={isLoading}
              emptyStateType="for-you"
              onEndReached={useCatalog ? undefined : fetchMoreForYou}
              hasMore={useCatalog ? false : hasMoreForYou}
              isLoadingMore={useCatalog ? false : isFetchingMoreForYou}
            />
          )}
        </PullToRefresh>


        <FilterSheet
          open={showFilters}
          onOpenChange={setShowFilters}
          filters={filters}
          onApplyFilters={setFilters}
        />
        <FeatureIntroSheet open={intro.open} onOpenChange={intro.setOpen} steps={HOME_FEED_INTRO} />
      </AppLayout>;
};
export default Index;
