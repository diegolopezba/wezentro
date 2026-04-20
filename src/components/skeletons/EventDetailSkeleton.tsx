import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton shown while the event detail data is loading inside the overlay/page.
 * Mirrors the rough layout (hero image, title, attendee row, body) so the
 * transition from list → detail feels seamless instead of popping in.
 */
export const EventDetailSkeleton = () => {
  return (
    <div className="w-full">
      {/* Hero image */}
      <Skeleton className="w-full aspect-[3/4] max-h-[60vh] rounded-none" />

      <div className="px-4 pt-4 space-y-4">
        {/* Title */}
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />

        {/* Creator row */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>

        {/* Body lines */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-4/5" />
        </div>

        {/* CTA placeholder */}
        <Skeleton className="h-12 w-full rounded-full mt-4" />
      </div>
    </div>
  );
};
