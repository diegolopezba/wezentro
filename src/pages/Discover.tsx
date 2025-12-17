import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, MapPin, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/events/EventCard";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import MapView from "@/components/map/MapView";
import { useEvents, Event } from "@/hooks/useEvents";
import { useUserLocation } from "@/hooks/useUserLocation";
import { format } from "date-fns";

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isNearbyOpen, setIsNearbyOpen] = useState(false);
  
  const { data: events = [] } = useEvents();
  const { location: userLocation } = useUserLocation();

  const handleMarkerClick = (event: Event) => {
    setSelectedEvent(event);
    setIsNearbyOpen(false);
  };

  const handleCloseEventCard = () => {
    setSelectedEvent(null);
  };

  // Filter events with coordinates for the map
  const eventsWithLocation = events.filter(e => e.latitude && e.longitude);

  // Convert Event to EventCard props
  const eventToCardProps = (event: Event) => ({
    id: event.id,
    title: event.title || "",
    imageUrl: event.image_url || "/placeholder.svg",
    date: format(new Date(event.start_datetime), "EEE, MMM d • h:mm a"),
    location: event.location_name || "Location TBA",
    category: event.category || "Event",
    attendees: 0, // Would need guestlist count
    hasGuestlist: event.has_guestlist || false,
  });

  return (
    <AppLayout>
      {/* Full screen map container */}
      <div className="relative h-[calc(100vh-80px)] bg-secondary">
        {/* Mapbox Map */}
        <MapView
          events={events}
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
                placeholder="Search events, venues, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/90 backdrop-blur-md border-border/50"
              />
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="bg-card/90 backdrop-blur-md border-border/50"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* No events with location message */}
        {eventsWithLocation.length === 0 && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="text-center bg-card/80 backdrop-blur-md rounded-2xl p-6 mx-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
                No Events on Map Yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Events with locations will appear here as pins
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
                Nearby Events ({events.length})
              </Button>
            </motion.div>
          </DrawerTrigger>
          <DrawerContent className="max-h-[70vh]">
            <div className="px-4 pb-8 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 pt-4 pb-4">
                {events.map((event) => (
                  <EventCard key={event.id} {...eventToCardProps(event)} />
                ))}
              </div>
              {events.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No events found nearby
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </AppLayout>
  );
};

export default Discover;