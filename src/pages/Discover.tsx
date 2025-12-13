import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, MapPin } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockEvents } from "@/data/mockEvents";
const Discover = () => {
  const [searchQuery, setSearchQuery] = useState("");
  return <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="px-4 py-4 opacity-100 bg-transparent">
          <h1 className="font-brand text-xl font-bold text-foreground mb-4">
            Discover
          </h1>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search events, venues, users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Button variant="secondary" size="icon">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Map placeholder - full screen */}
      <div className="relative h-[calc(100vh-180px)] bg-secondary">
        <div className="absolute inset-0 flex items-center justify-center">
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

        {/* Event markers preview */}
        {mockEvents.slice(0, 3).map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="absolute"
            style={{
              top: `${30 + index * 15}%`,
              left: `${20 + index * 25}%`
            }}
          >
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse-glow" />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className="px-2 py-1 rounded-lg bg-card text-xs font-medium shadow-elevated">
                  {event.title.slice(0, 15)}...
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

    </AppLayout>;
};
export default Discover;