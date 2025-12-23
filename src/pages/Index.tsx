import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, Search, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EventFeed } from "@/components/events/EventFeed";
import { useEvents, useFollowingEvents } from "@/hooks/useEvents";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

const Index = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"for-you" | "following">("for-you");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: allEvents = [], isLoading: allEventsLoading } = useEvents();
  const { data: followingEvents = [], isLoading: followingLoading } = useFollowingEvents();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const events = activeTab === "for-you" ? allEvents : followingEvents;
  const isLoading = activeTab === "for-you" ? allEventsLoading : followingLoading;

  // Transform events to EventCard format and filter
  const transformedEvents = useMemo(() => 
    events
      .filter((event) => {
        const matchesSearch =
          event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (event.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        return searchQuery === "" || matchesSearch;
      })
      .map((event) => {
        const guestlistEntries = (event as any).guestlist_entries || [];
        const attendeeAvatars = guestlistEntries
          .map((entry: any) => entry.user)
          .filter(Boolean)
          .map((user: any) => ({ id: user.id, avatar_url: user.avatar_url }));
        
        return {
          id: event.id,
          title: event.title || undefined,
          imageUrl: event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
          date: format(new Date(event.start_datetime), "EEE, MMM d • h:mm a"),
          location: event.location_name || "Location TBA",
          category: event.category || "party",
          attendees: guestlistEntries.length,
          attendeeAvatars,
          hasGuestlist: event.has_guestlist || false,
          ownerAvatar: event.creator?.avatar_url || undefined,
          creatorId: event.creator_id,
        };
      }),
    [events, searchQuery]
  );

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background">
        <div className="flex items-center justify-between px-4 py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="font-brand text-2xl font-bold text-foreground">Zentro</h1>
          </motion.div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate("/notifications")}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
              )}
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

        {/* Tabs */}
        <div className="flex px-4 pb-3 gap-2">
          <button
            onClick={() => setActiveTab("for-you")}
            className={`relative px-3 py-1 text-sm font-medium rounded-full transition-all ${
              activeTab === "for-you"
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === "for-you" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 gradient-primary rounded-full"
                transition={{ type: "spring", duration: 0.5 }}
              />
            )}
            <span className="relative z-10">For You</span>
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`relative px-3 py-1 text-sm font-medium rounded-full transition-all ${
              activeTab === "following"
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === "following" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 gradient-primary rounded-full"
                transition={{ type: "spring", duration: 0.5 }}
              />
            )}
            <span className="relative z-10">Following</span>
          </button>
        </div>
      </header>

      {/* Event feed */}
      <EventFeed 
        events={transformedEvents} 
        isLoading={isLoading} 
        emptyStateType={activeTab}
      />
    </AppLayout>
  );
};

export default Index;