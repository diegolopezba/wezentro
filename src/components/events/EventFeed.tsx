import { useEffect, useRef } from "react";
import { EventCard, EventCardProps } from "./EventCard";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { EventFeedSkeleton } from "@/components/skeletons";
import { useTrackSponsoredImpression } from "@/hooks/useSponsoredPosts";

interface EventFeedProps {
  events: EventCardProps[];
  isLoading?: boolean;
  emptyStateType?: "for-you" | "following";
}

export const EventFeed = ({ events, isLoading = false, emptyStateType = "for-you" }: EventFeedProps) => {
  const navigate = useNavigate();
  const trackImpression = useTrackSponsoredImpression();
  const trackedIds = useRef<Set<string>>(new Set());

  // Track impressions for sponsored posts when they appear in the feed
  useEffect(() => {
    const sponsoredEvents = events.filter(e => e.isSponsored && e.sponsoredPostId);
    sponsoredEvents.forEach(e => {
      if (e.sponsoredPostId && !trackedIds.current.has(e.sponsoredPostId)) {
        trackedIds.current.add(e.sponsoredPostId);
        trackImpression.mutate(e.sponsoredPostId);
      }
    });
  }, [events]);

  if (isLoading) {
    return <EventFeedSkeleton count={6} />;
  }

  if (events.length === 0) {
    if (emptyStateType === "following") {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
            Sin eventos de personas que sigues
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs mb-4">
            Sigue a creadores para ver sus eventos aquí. ¡Descubre nuevas personas en la pestaña Para Ti!
          </p>
          <Button variant="secondary" onClick={() => navigate("/discover")}>
            Descubrir Eventos
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <span className="text-3xl">🌙</span>
        </div>
        <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
          No se encontraron eventos
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          No hay eventos que coincidan con tu búsqueda ahora mismo. ¡Vuelve más tarde!
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
