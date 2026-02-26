import { useRelatedEvents } from "@/hooks/useRelatedEvents";
import { TimelineCard } from "@/components/events/TimelineCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface RelatedEventsFeedProps {
  eventId: string;
  category: string | null | undefined;
  creatorId: string | undefined;
}

const RelatedSkeleton = () => (
  <div className="masonry-grid">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="masonry-item space-y-2">
        <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: "3/4" }} />
        <Skeleton className="h-3 w-3/4 mx-1" />
      </div>
    ))}
  </div>
);

export const RelatedEventsFeed = ({ eventId, category, creatorId }: RelatedEventsFeedProps) => {
  const { data: events, isLoading } = useRelatedEvents(eventId, category, creatorId);

  if (!isLoading && (!events || events.length === 0)) return null;

  return (
    <div className="mt-8">
      <Separator className="mb-6" />
      <h2 className="font-brand text-lg font-semibold text-foreground mb-4 px-0">
        Más como esto
      </h2>
      {isLoading ? (
        <RelatedSkeleton />
      ) : (
        <div className="masonry-grid">
          {events!.map((event, index) => (
            <TimelineCard
              key={event.id}
              id={event.id}
              title={event.title}
              imageUrl={event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"}
              startDatetime={event.start_datetime}
              location={event.location_name}
              category={event.category}
              isPost={event.is_post || false}
              createdAt={event.created_at}
              index={index}
              ownerAvatar={event.creator?.avatar_url || undefined}
              creatorId={event.creator_id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
