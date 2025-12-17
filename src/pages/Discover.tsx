import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, MapPin, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/events/EventCard";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { FilterSheet } from "@/components/map/FilterSheet";
import MapView from "@/components/map/MapView";
import { useEvents } from "@/hooks/useEvents";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useNearbyEvents, formatDistance, FilterOptions } from "@/hooks/useNearbyEvents";
import { format } from "date-fns";

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<ReturnType<typeof useNearbyEvents>[number] | null>(null);
  const [isNearbyOpen, setIsNearbyOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    dateFilter: "all",
    categories: [],
    maxDistance: null,
    hasGuestlistOnly: false,
  });
  
  const { data: events = [] } = useEvents();
  const { location: userLocation } = useUserLocation();

  // Combine search query with filters
  const activeFilters = useMemo(() => ({
    ...filters,
    searchQuery,
  }), [filters, searchQuery]);

  // Get filtered and sorted events with distance
  const filteredEvents = useNearbyEvents(events, userLocation, activeFilters);

  const handleMarkerClick = (event: ReturnType<typeof useNearbyEvents>[number]) => {
    const eventWithDistance = filteredEvents.find(e => e.id === event.id);
    setSelectedEvent(eventWithDistance || null);
    setIsNearbyOpen(false);
  };

  const handleCloseEventCard = () => {
    setSelectedEvent(null);
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  // Filter events with coordinates for the map
  const eventsWithLocation = filteredEvents.filter(e => e.latitude && e.longitude);

  // Count active filters (excluding search)
  const activeFilterCount = 
    (filters.dateFilter !== "all" ? 1 : 0) +
    filters.categories.length +
    (filters.maxDistance !== null ? 1 : 0) +
    (filters.hasGuestlistOnly ? 1 : 0);

  // Convert Event to EventCard props
  const eventToCardProps = (event: ReturnType<typeof useNearbyEvents>[number]) => ({
    id: event.id,
    title: event.title || "",
    imageUrl: event.image_url || "/placeholder.svg",
    date: format(new Date(event.start_datetime), "EEE, MMM d • h:mm a"),
    location: event.location_name || "Location TBA",
    category: event.category || "Event",
    attendees: 0,
    hasGuestlist: event.has_guestlist || false,
  });

  return (
    <AppLayout>
      {/* Full screen map container */}
      <div className="relative h-[calc(100vh-80px)] bg-secondary">
        {/* Mapbox Map - pass original events for markers, filtered for visibility */}
        <MapView
          events={filteredEvents}
          onMarkerClick={handleMarkerClick}
          selectedEventId={selectedEvent?.id}
          userLocation={userLocation}
        />

        {/* Floating search bar */}
        <div className="absolute top-0 left-0 right-0 z-40 safe-top px-4 py-4">
          <div className="flex gap-2 py-[26px]">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-card/90 backdrop-blur-md border-border/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
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
        </div>

        {/* No events message */}
        {eventsWithLocation.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center bg-card/80 backdrop-blur-md rounded-2xl p-6 mx-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
                {searchQuery || activeFilterCount > 0 ? "No Events Match" : "No Events on Map Yet"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {searchQuery || activeFilterCount > 0 
                  ? "Try adjusting your search or filters"
                  : "Events with locations will appear here as pins"
                }
              </p>
            </div>
          </div>
        )}

        {/* Click outside to close */}
        {selectedEvent && (
          <div 
            className="absolute inset-0 z-30" 
            onClick={handleCloseEventCard}
          />
        )}

        {/* Selected event card */}
        <AnimatePresence>
          {selectedEvent && (
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
                {/* Distance badge */}
                {selectedEvent.distance !== null && (
                  <div className="absolute -top-2 -left-2 z-10 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-elevated">
                    {formatDistance(selectedEvent.distance)}
                  </div>
                )}
                <EventCard {...eventToCardProps(selectedEvent)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nearby Events Bottom Sheet */}
        <Drawer open={isNearbyOpen} onOpenChange={setIsNearbyOpen}>
          <DrawerTrigger asChild>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40"
            >
              <Button
                variant="secondary"
                className="bg-card/95 backdrop-blur-md shadow-elevated px-6"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Nearby Events ({filteredEvents.length})
              </Button>
            </motion.div>
          </DrawerTrigger>
          <DrawerContent className="max-h-[70vh]">
            <div className="px-4 pb-8 overflow-y-auto">
              <div className="py-4">
                <h3 className="font-brand text-lg font-semibold text-foreground mb-1">
                  Nearby Events
                </h3>
                <p className="text-sm text-muted-foreground">
                  {userLocation 
                    ? "Sorted by distance from you"
                    : "Enable location for distance sorting"
                  }
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pb-4">
                {filteredEvents.map((event, index) => (
                  <div key={event.id} className="relative">
                    {/* Distance badge */}
                    {event.distance !== null && (
                      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-background/80 backdrop-blur-sm text-foreground text-[10px] font-medium rounded-full">
                        {formatDistance(event.distance)}
                      </div>
                    )}
                    <EventCard {...eventToCardProps(event)} index={index} />
                  </div>
                ))}
              </div>
              {filteredEvents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery || activeFilterCount > 0
                    ? "No events match your filters"
                    : "No events found nearby"
                  }
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>

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
