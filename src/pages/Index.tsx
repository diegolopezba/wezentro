import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EventFeed } from "@/components/events/EventFeed";
import { mockEvents } from "@/data/mockEvents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const Index = () => {
  const [activeTab, setActiveTab] = useState<"for-you" | "following">("for-you");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // For now, both tabs show the same events - this will be differentiated with real data
  const filteredEvents = mockEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || event.location.toLowerCase().includes(searchQuery.toLowerCase());
    return searchQuery === "" || matchesSearch;
  });
  return <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center justify-between px-4 py-4">
          <motion.div initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }}>
            <h1 className="font-brand text-2xl font-bold text-gradient">Zentro</h1>
            
          </motion.div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)}>
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
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
              <Input placeholder="Search events, venues..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          </motion.div>}

        {/* Tabs */}
        <div className="flex px-4 pb-3 gap-2">
          <button onClick={() => setActiveTab("for-you")} className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all ${activeTab === "for-you" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {activeTab === "for-you" && <motion.div layoutId="activeTab" className="absolute inset-0 gradient-primary rounded-full" transition={{
            type: "spring",
            duration: 0.5
          }} />}
            <span className="relative z-10">For You</span>
          </button>
          <button onClick={() => setActiveTab("following")} className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all ${activeTab === "following" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {activeTab === "following" && <motion.div layoutId="activeTab" className="absolute inset-0 gradient-primary rounded-full" transition={{
            type: "spring",
            duration: 0.5
          }} />}
            <span className="relative z-10">Following</span>
          </button>
        </div>
      </header>

      {/* Section title */}
      <div className="px-4 py-2 flex items-center justify-between">
        <h2 className="font-brand text-lg font-semibold text-foreground">
          {activeTab === "for-you" ? "For You" : "Following"}
        </h2>
        <span className="text-sm text-muted-foreground">
          {filteredEvents.length} events
        </span>
      </div>

      {/* Event feed */}
      <EventFeed events={filteredEvents} />
    </AppLayout>;
};
export default Index;