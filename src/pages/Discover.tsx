import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, MapPin, X, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/events/EventCard";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { FilterSheet } from "@/components/map/FilterSheet";
import { CategoryFilterBar } from "@/components/map/CategoryFilterBar";
import MapView from "@/components/map/MapView";
import { useEvents } from "@/hooks/useEvents";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useNearbyEvents, formatDistance, FilterOptions } from "@/hooks/useNearbyEvents";
import { useSearchUsers } from "@/hooks/useSearchUsers";
import { useFoodLocations } from "@/hooks/useFoodLocations";
import { UserSearchResultCard } from "@/components/search/UserSearchResultCard";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type EventWithDistance = ReturnType<typeof useNearbyEvents>[number];
type SearchTab = "events" | "people";

const Discover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<EventWithDistance[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [isNearbyOpen, setIsNearbyOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTab, setSearchTab] = useState<SearchTab>("events");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    dateFilter: "all",
    categories: [],
    maxDistance: null,
    hasGuestlistOnly: false,
    friendsGoingOnly: false,
  });

  const hasAutoOpenedRef = useRef(false);

  const { data: events = [] } = useEvents();
  const { location: userLocation } = useUserLocation();
  const { data: searchedUsers = [], isLoading: isLoadingUsers } = useSearchUsers(searchQuery);
  const { data: foodLocations = [] } = useFoodLocations();

  // Determine if restaurant/cafe filter is active (shows food business markers)
  const showRestaurantMarkers = filters.categories.includes("restaurant");
  const showCafeMarkers = filters.categories.includes("cafe");
  const showFoodMarkers = showRestaurantMarkers || showCafeMarkers;
  
  // Map filter categories to event categories (cafe filter → coffee category)
  const mappedCategories = useMemo(() => {
    return filters.categories.map(cat => cat === "cafe" ? "coffee" : cat);
  }, [filters.categories]);
  
  // Filter food locations by business type
  const filteredFoodLocations = useMemo(() => {
    if (!showFoodMarkers) return [];
    return foodLocations.filter(loc => {
      if (showRestaurantMarkers && showCafeMarkers) return true; // Both selected, show all
      if (showRestaurantMarkers) return loc.business_type === "restaurant";
      if (showCafeMarkers) return loc.business_type === "cafe";
      return false;
    });
  }, [foodLocations, showRestaurantMarkers, showCafeMarkers, showFoodMarkers]);

  // Fetch user's following list for friends going filter
  const { data: followingIds = [] } = useQuery({
    queryKey: ["user-following-discover", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);

      if (error) throw error;
      return data.map((f) => f.following_id);
    },
    enabled: !!user?.id && filters.friendsGoingOnly,
  });

  // Fetch guestlist entries for friends going filter
  const { data: guestlistByEvent } = useQuery({
    queryKey: ["guestlist-entries-discover", events.map((e) => e.id).join(",")],
    queryFn: async () => {
      if (events.length === 0) return new Map<string, string[]>();

      const { data, error } = await supabase
        .from("guestlist_entries")
        .select("event_id, user_id")
        .in(
          "event_id",
          events.map((e) => e.id),
        );

      if (error) throw error;

      const map = new Map<string, string[]>();
      data.forEach((entry) => {
        const existing = map.get(entry.event_id) || [];
        existing.push(entry.user_id);
        map.set(entry.event_id, existing);
      });
      return map;
    },
    enabled: events.length > 0 && filters.friendsGoingOnly,
  });

  // Prepare friends data for filtering
  const friendsData = useMemo(() => {
    if (!filters.friendsGoingOnly || !guestlistByEvent) return null;
    return {
      followingIds,
      guestlistByEvent,
    };
  }, [filters.friendsGoingOnly, followingIds, guestlistByEvent]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle geolocation success - auto-open nearby drawer once
  const handleGeolocationSuccess = () => {
    if (!hasAutoOpenedRef.current && filteredEvents.length > 0) {
      hasAutoOpenedRef.current = true;
      setTimeout(() => {
        setIsNearbyOpen(true);
      }, 500);
    }
  };

  // Handle geolocation error
  const handleGeolocationError = (error: string) => {
    toast.error(error, {
      duration: 5000,
      action: {
        label: "Cómo activar",
        onClick: () => window.open("https://support.google.com/chrome/answer/142065", "_blank"),
      },
    });
  };

  // Combine search query with filters, using mapped categories for events
  const activeFilters = useMemo(
    () => ({
      ...filters,
      searchQuery,
      categories: mappedCategories,
    }),
    [filters, searchQuery, mappedCategories],
  );

  // Get filtered and sorted events with distance
  const filteredEvents = useNearbyEvents(events, userLocation, activeFilters, friendsData);

  // Track carousel slide changes
  useEffect(() => {
    if (!carouselApi) return;

    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  const handleMarkerClick = (events: EventWithDistance[]) => {
    // Map to events with distance info from filtered events
    const eventsWithDistance = events.map((e) => filteredEvents.find((fe) => fe.id === e.id) || e);
    setSelectedEvents(eventsWithDistance);
    setCurrentSlide(0);
    setIsNearbyOpen(false);
    setIsSearchFocused(false);
  };

  const handleCloseEventCard = () => {
    setSelectedEvents([]);
    setCurrentSlide(0);
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleToggleCategory = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  const handleUserClick = () => {
    setIsSearchFocused(false);
    setSearchQuery("");
  };

  // Filter events with coordinates for the map
  const eventsWithLocation = filteredEvents.filter((e) => e.latitude && e.longitude);

  // Count active filters (excluding search and categories which are now visible)
  const activeFilterCount =
    (filters.dateFilter !== "all" ? 1 : 0) +
    (filters.maxDistance !== null ? 1 : 0) +
    (filters.hasGuestlistOnly ? 1 : 0) +
    (filters.friendsGoingOnly ? 1 : 0);

  // Show search dropdown
  const showSearchDropdown = isSearchFocused && searchQuery.length >= 2;

  // Convert Event to EventCard props
  const eventToCardProps = (event: ReturnType<typeof useNearbyEvents>[number]) => ({
    id: event.id,
    title: event.title || "",
    imageUrl: event.image_url || "/placeholder.svg",
    date: format(new Date(event.start_datetime), "EEE, d MMM • HH:mm", { locale: es }),
    location: event.location_name || "Ubicación por confirmar",
    category: event.category || "Evento",
    attendees: 0,
    hasGuestlist: event.has_guestlist || false,
  });

  // Handle food marker click
  const handleFoodMarkerClick = (location: typeof foodLocations[0]) => {
    navigate(`/user/${location.id}`);
  };

  return (
    <AppLayout>
      {/* Full screen map container - use fixed height on mobile for PWA compatibility */}
      <div className="relative bg-secondary" style={{ height: 'calc(100dvh - 80px)', minHeight: '400px' }}>
        {/* Mapbox Map - pass original events for markers, filtered for visibility */}
        <MapView
          events={showFoodMarkers ? [] : filteredEvents}
          onMarkerClick={handleMarkerClick}
          selectedEventId={selectedEvents[currentSlide]?.id}
          onGeolocationSuccess={handleGeolocationSuccess}
          onGeolocationError={handleGeolocationError}
          foodLocations={filteredFoodLocations}
          showFoodMarkers={showFoodMarkers}
          onFoodMarkerClick={handleFoodMarkerClick}
        />

        {/* Floating search bar */}
        <div className="absolute top-0 left-0 right-0 z-40 safe-top py-4">
          <div className="flex gap-2 pt-[26px] pb-2 px-4" ref={searchContainerRef}>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                placeholder="Buscar eventos, personas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="pl-10 pr-10 bg-card/90 backdrop-blur-md border-border/50"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showSearchDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-md rounded-xl border border-border/50 shadow-elevated overflow-hidden max-h-[60vh] z-50"
                  >
                    {/* Tabs */}
                    <div className="flex border-b border-border/50">
                      <button
                        onClick={() => setSearchTab("events")}
                        className={cn(
                          "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                          searchTab === "events"
                            ? "text-primary border-b-2 border-primary bg-primary/5"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <MapPin className="w-4 h-4" />
                        Eventos ({filteredEvents.length})
                      </button>
                      <button
                        onClick={() => setSearchTab("people")}
                        className={cn(
                          "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                          searchTab === "people"
                            ? "text-primary border-b-2 border-primary bg-primary/5"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Users className="w-4 h-4" />
                        Personas ({searchedUsers.length})
                      </button>
                    </div>

                    {/* Results */}
                    <div className="overflow-y-auto max-h-[calc(60vh-48px)]">
                      {searchTab === "events" ? (
                        <div className="p-2">
                          {filteredEvents.length > 0 ? (
                            filteredEvents.slice(0, 10).map((event) => (
                              <button
                                key={event.id}
                                onClick={() => handleMarkerClick([event])}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
                              >
                                <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                                  <img
                                    src={event.image_url || "/placeholder.svg"}
                                    alt={event.title || "Evento"}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    {event.title || "Evento sin título"}
                                  </p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {event.location_name || "Ubicación por confirmar"}
                                  </p>
                                </div>
                                {event.distance !== null && (
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {formatDistance(event.distance)}
                                  </span>
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="py-8 text-center text-muted-foreground">No se encontraron eventos</div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2">
                          {isLoadingUsers ? (
                            <div className="py-8 text-center text-muted-foreground">Buscando...</div>
                          ) : searchedUsers.length > 0 ? (
                            searchedUsers.map((user) => (
                              <UserSearchResultCard key={user.id} user={user} onClick={handleUserClick} />
                            ))
                          ) : (
                            <div className="py-8 text-center text-muted-foreground">No se encontraron personas</div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="bg-card/90 backdrop-blur-md border-border/50 relative"
              onClick={() => setIsFilterOpen(true)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Category Filter Bar */}
          <div className="mt-1">
            <CategoryFilterBar
              selectedCategories={filters.categories}
              onToggleCategory={handleToggleCategory}
            />
          </div>
        </div>


        {/* Click outside to close */}
        {selectedEvents.length > 0 && <div className="absolute inset-0 z-30" onClick={handleCloseEventCard} />}

        {/* Selected event card(s) */}
        <AnimatePresence>
          {selectedEvents.length > 0 && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-20 left-4 right-4 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-card shadow-elevated"
                  onClick={handleCloseEventCard}
                >
                  <X className="w-4 h-4" />
                </Button>

                {/* Distance badge - shows current event's distance */}
                {selectedEvents[currentSlide]?.distance !== null && (
                  <div className="absolute -top-2 -left-2 z-10 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-elevated">
                    {formatDistance(selectedEvents[currentSlide].distance!)}
                  </div>
                )}

                {/* Single event or carousel */}
                {selectedEvents.length === 1 ? (
                  <EventCard {...eventToCardProps(selectedEvents[0])} />
                ) : (
                  <div className="space-y-3">
                    <Carousel className="w-full" setApi={setCarouselApi}>
                      <CarouselContent>
                        {selectedEvents.map((event) => (
                          <CarouselItem key={event.id}>
                            <EventCard {...eventToCardProps(event)} />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>

                    {/* Counter and pagination dots */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-foreground">
                        {currentSlide + 1} de {selectedEvents.length} eventos
                      </span>
                      <div className="flex justify-center items-center gap-1.5">
                        {selectedEvents.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => carouselApi?.scrollTo(index)}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all duration-200",
                              index === currentSlide
                                ? "bg-primary w-4"
                                : "bg-muted-foreground/40 hover:bg-muted-foreground/60",
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        {/* Filter Sheet */}
        <FilterSheet
          open={isFilterOpen}
          onOpenChange={setIsFilterOpen}
          filters={filters}
          onApplyFilters={handleApplyFilters}
        />
      </div>
    </AppLayout>
  );
};

export default Discover;
