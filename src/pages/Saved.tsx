import { motion } from "framer-motion";
import { ArrowLeft, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import { EventCard } from "@/components/events/EventCard";
import { Skeleton } from "@/components/ui/skeleton";

const Saved = () => {
  const navigate = useNavigate();
  const { data: savedEvents, isLoading } = useSavedEvents();

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">
            Saved Events
          </h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl" />
            ))}
          </div>
        ) : savedEvents && savedEvents.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {savedEvents.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EventCard
                  id={item.event.id}
                  title={item.event.title || "Untitled Event"}
                  date={item.event.start_datetime}
                  location={item.event.location_name || ""}
                  imageUrl={item.event.image_url || ""}
                  category={item.event.category || ""}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          // Empty state
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-brand text-lg font-semibold text-foreground mb-2">
              No saved events
            </h2>
            <p className="text-muted-foreground text-center text-sm max-w-xs">
              Save events you're interested in and they'll appear here
            </p>
            <Button
              variant="hero"
              className="mt-6"
              onClick={() => navigate("/")}
            >
              Explore Events
            </Button>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Saved;
