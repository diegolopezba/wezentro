import { EventCard, EventCardProps } from "./EventCard";

interface EventFeedProps {
  events: EventCardProps[];
  isLoading?: boolean;
}

export const EventFeed = ({ events, isLoading = false }: EventFeedProps) => {
  if (isLoading) {
    return (
      <div className="masonry-grid">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="masonry-item rounded-2xl bg-card animate-pulse"
            style={{ height: `${200 + (i % 3) * 50}px` }}
          />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <span className="text-3xl">🌙</span>
        </div>
        <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
          No events found
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          There are no events matching your criteria right now. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="masonry-grid">
      {events.map((event, index) => (
        <EventCard key={event.id} {...event} index={index} />
      ))}
    </div>
  );
};
