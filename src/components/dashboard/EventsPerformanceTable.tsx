import { m } from "framer-motion";
import { format } from "date-fns";
import { Eye, Heart, Users, UserCheck, CheckCircle2, MousePointer2 } from "lucide-react";
import { EventPerformance } from "@/hooks/useBusinessAnalytics";

interface EventsPerformanceTableProps {
  events: EventPerformance[];
  isLoading?: boolean;
}

export const EventsPerformanceTable = ({
  events,
  isLoading,
}: EventsPerformanceTableProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-secondary/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No events yet</p>
        <p className="text-sm">Create your first event to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.slice(0, 5).map((event, index) => {
        const conversionRate =
          event.guestlist_requests > 0
            ? Math.round((event.checked_in / event.guestlist_requests) * 100)
            : 0;

        return (
          <m.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 transition-colors" >
            {/* Event image */}
            <img
              src={
                event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=100&q=80" }
              alt={event.title}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />

            {/* Event info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground text-sm truncate">
                {event.title}
              </h4>
              <p className="text-xs text-muted-foreground">
                {format(new Date(event.start_datetime), "MMM d, yyyy")}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Eye className="w-3.5 h-3.5" />
                <span>{event.views_count}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Heart className="w-3.5 h-3.5" />
                <span>{event.likes_count}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{event.guestlist_requests}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{event.approved_guests}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{event.checked_in}</span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  conversionRate >= 50
                    ? "bg-green-500/20 text-green-400" : conversionRate >= 25
                    ? "bg-yellow-500/20 text-yellow-400" : "bg-muted text-muted-foreground" }`}
              >
                {conversionRate}%
              </div>
            </div>
          </m.div>
        );
      })}
    </div>
  );
};
