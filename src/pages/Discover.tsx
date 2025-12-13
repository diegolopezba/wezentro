import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, MapPin, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockEvents } from "@/data/mockEvents";
import { EventCard } from "@/components/events/EventCard";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<typeof mockEvents[0] | null>(null);
  const [isNearbyOpen, setIsNearbyOpen] = useState(false);

  const handleMarkerClick = (event: typeof mockEvents[0]) => {
    setSelectedEvent(event);
  };

  const handleCloseEventCard = () => {
    setSelectedEvent(null);
  };

  return (
    <AppLayout>
      {/* Full screen map container */}
      <div className="relative h-[calc(100vh-80px)] bg-secondary">
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

        {/* Map content */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          onClick={handleCloseEventCard}
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
              Map View Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Explore events near you with our interactive map
            </p>
          </div>
        </div>

        {/* Event markers */}
        {mockEvents.slice(0, 3).map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="absolute cursor-pointer z-10"
            style={{
              top: `${30 + index * 15}%`,
              left: `${20 + index * 25}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleMarkerClick(event);
            }}
          >
            <div className="relative">
              <div className={`w-4 h-4 rounded-full bg-primary transition-transform ${selectedEvent?.id === event.id ? 'scale-150' : 'animate-pulse-glow'}`} />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className="px-2 py-1 rounded-lg bg-card text-xs font-medium shadow-elevated">
                  {event.title.slice(0, 15)}...
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Selected event card */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-4 left-4 right-4 z-50"
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
                <EventCard {...selectedEvent} />
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
                Nearby Events
              </Button>
            </motion.div>
          </DrawerTrigger>
          <DrawerContent className="max-h-[70vh]">
            <DrawerHeader>
              <DrawerTitle>Nearby Events</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {mockEvents.slice(0, 6).map((event) => (
                  <EventCard key={event.id} {...event} />
                ))}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </AppLayout>
  );
};

export default Discover;