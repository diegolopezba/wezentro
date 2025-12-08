import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CategoryFilter } from "@/components/events/CategoryFilter";
import { EventFeed } from "@/components/events/EventFeed";
import { mockEvents } from "@/data/mockEvents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filteredEvents = mockEvents.filter((event) => {
    const matchesCategory = selectedCategory === "all" || event.category === selectedCategory;
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && (searchQuery === "" || matchesSearch);
  });

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <div className="flex items-center justify-between px-4 py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="font-brand text-2xl font-bold text-gradient">
              Zentro
            </h1>
            <p className="text-xs text-muted-foreground">Los Angeles, CA</p>
          </motion.div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </motion.div>
        )}

        {/* Category filter */}
        <CategoryFilter
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </header>

      {/* Welcome section for new users */}
      {selectedCategory === "all" && searchQuery === "" && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-6"
        >
          <div className="relative overflow-hidden rounded-3xl gradient-primary p-6 shadow-glow">
            <div className="relative z-10">
              <h2 className="font-brand text-xl font-bold text-primary-foreground mb-2">
                Tonight's Hot Picks 🔥
              </h2>
              <p className="text-primary-foreground/80 text-sm mb-4">
                Discover the best events happening near you
              </p>
              <Button variant="glass" size="sm">
                Explore Now
              </Button>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute right-12 top-4 w-16 h-16 rounded-full bg-white/10 blur-xl" />
          </div>
        </motion.section>
      )}

      {/* Section title */}
      <div className="px-4 py-2 flex items-center justify-between">
        <h2 className="font-brand text-lg font-semibold text-foreground">
          {selectedCategory === "all" ? "For You" : `${selectedCategory.replace("_", " ")} Events`}
        </h2>
        <span className="text-sm text-muted-foreground">
          {filteredEvents.length} events
        </span>
      </div>

      {/* Event feed */}
      <EventFeed events={filteredEvents} />
    </AppLayout>
  );
};

export default Index;
