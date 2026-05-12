import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EventFeedSkeleton,
  ChatListSkeleton,
} from "@/components/skeletons";

/**
 * Route-aware Suspense fallback for the four core tabs.
 *
 * Renders the same chrome the destination page will render (AppLayout +
 * BottomNav) so first-time lazy navigation feels native — no black flash,
 * just the page shell with content-shaped skeletons.
 *
 * Inner skeleton blocks fade in after 150ms to avoid flashing on instant
 * chunk hits.
 */
export const RouteSkeleton = () => {
  const { pathname } = useLocation();
  const [showInner, setShowInner] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowInner(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <AppLayout>
      <div
        className="transition-opacity duration-150"
        style={{ opacity: showInner ? 1 : 0 }}
      >
        {pathname.startsWith("/discover") ? (
          <DiscoverSkeleton />
        ) : pathname.startsWith("/chats") ? (
          <ChatsSkeleton />
        ) : pathname.startsWith("/profile") ? (
          <ProfileShellSkeleton />
        ) : (
          <HomeSkeleton />
        )}
      </div>
    </AppLayout>
  );
};

const HomeSkeleton = () => (
  <div className="space-y-3">
    {/* Top logo / tabs bar */}
    <div className="flex items-center justify-between px-4 pt-4">
      <Skeleton className="h-7 w-24 rounded-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
    {/* Para Ti / Siguiendo pills */}
    <div className="flex gap-2 px-4">
      <Skeleton className="h-8 w-20 rounded-full" />
      <Skeleton className="h-8 w-24 rounded-full" />
    </div>
    <div className="px-2 pt-2">
      <EventFeedSkeleton count={6} />
    </div>
  </div>
);

const DiscoverSkeleton = () => (
  <div className="space-y-3">
    {/* Search pill */}
    <div className="px-4 pt-4">
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
    {/* Category chips */}
    <div className="flex gap-2 overflow-hidden px-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
      ))}
    </div>
    <div className="px-2 pt-2">
      <EventFeedSkeleton count={6} />
    </div>
  </div>
);

const ChatsSkeleton = () => (
  <div>
    {/* Header */}
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <Skeleton className="h-7 w-24 rounded-md" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    <ChatListSkeleton count={7} />
  </div>
);

const ProfileShellSkeleton = () => (
  <div className="space-y-6 p-4">
    {/* Header row */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    {/* Avatar + stats */}
    <div className="flex items-center gap-6">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="flex flex-1 justify-around">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 text-center">
            <Skeleton className="mx-auto h-5 w-10" />
            <Skeleton className="mx-auto h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
    {/* Name / bio */}
    <div className="space-y-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-3/4" />
    </div>
    {/* Action buttons */}
    <div className="flex gap-2">
      <Skeleton className="h-10 flex-1 rounded-full" />
      <Skeleton className="h-10 flex-1 rounded-full" />
    </div>
    {/* Grid */}
    <EventFeedSkeleton count={4} />
  </div>
);
