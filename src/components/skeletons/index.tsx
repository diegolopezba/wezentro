import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for event cards in the feed.
 * Provides visual feedback during data loading.
 */
export const EventCardSkeleton = () => {
  return (
    <div className="masonry-item rounded-xl overflow-hidden bg-card">
      <Skeleton className="w-full aspect-[3/4]" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
};

/**
 * Skeleton loader for the event feed grid.
 */
export const EventFeedSkeleton = ({ count = 6 }: { count?: number }) => {
  return (
    <div className="masonry-grid">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * Skeleton loader for profile pages.
 */
export const ProfileSkeleton = () => {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
      <EventFeedSkeleton count={4} />
    </div>
  );
};

/**
 * Skeleton loader for chat list items.
 */
export const ChatListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
};
