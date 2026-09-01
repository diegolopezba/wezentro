import { Repeat, MoreHorizontal, EyeOff } from "lucide-react";
import { useState, useRef, useEffect, memo, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useOpenEvent } from "@/hooks/useOpenEvent";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { RepostInfo } from "@/hooks/useFollowingEventsScored";
import { useTrackSponsoredClick } from "@/hooks/useSponsoredPosts";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { useAuth } from "@/contexts/AuthContext";
import { getOptimizedImageUrl, ImageSizes } from "@/lib/imageOptimization";
import { haptic } from "@/lib/haptics";
import { MediaCarousel, type CarouselMediaItem } from "@/components/events/MediaCarousel";
import { CardLikeButton } from "@/components/events/CardLikeButton";
import { useImpressionTracker } from "@/hooks/useImpressionTracker";
import { prefetchEventDetail } from "@/lib/prefetchEvents";
import type { ViewerFollowGraph } from "@/hooks/useViewerFollowGraph";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AttendeeAvatar {
  id: string;
  avatar_url: string | null;
}

export interface EventCardProps {
  id: string;
  title?: string;
  imageUrl: string;
  date: string;
  location: string;
  category: string;
  attendees?: number;
  attendeeAvatars?: AttendeeAvatar[];
  hasGuestlist?: boolean;
  index?: number;
  ownerAvatar?: string;
  creatorId?: string;
  repostInfo?: RepostInfo;
  isSponsored?: boolean;
  sponsoredPostId?: string;
  compact?: boolean;
  media?: CarouselMediaItem[];
  followGraph?: ViewerFollowGraph;
  /** Non-null when the publication is a bookable experience. */
  experience_id?: string | null;
}

const EventCardComponent = ({
  id,
  title,
  imageUrl,
  attendees = 0,
  attendeeAvatars = [],
  index = 0,
  creatorId,
  repostInfo,
  isSponsored = false,
  sponsoredPostId,
  compact = false,
  media,
  followGraph,
  experience_id,
}: EventCardProps) => {
  const openEvent = useOpenEvent();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const trackClick = useTrackSponsoredClick();
  const clickedRef = useRef(false);
  const prefetchedRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const hasVideo = (media ?? []).some((m) => m.media_type === "video");
  const { ref: impressionRef, notifyPlay } = useImpressionTracker(id, {
    creatorId,
    mediaType: hasVideo ? "video" : "image",
    disabled: isSponsored,
  });

  useEffect(() => {
    clickedRef.current = false;
    prefetchedRef.current = false;
  }, [id]);

  const handlePointerDown = useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    prefetchEventDetail(queryClient, id);
  }, [queryClient, id]);

  const handleCardClick = () => {
    haptic("light");
    if (isSponsored && sponsoredPostId && !clickedRef.current) {
      clickedRef.current = true;
      trackClick.mutate(sponsoredPostId);
    }
    openEvent(id);
  };

  const handleNotInterested = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    if (user?.id) {
      trackPreferenceSignal(user.id, id, "not_interested");
    }
  };

  const sortedAttendees = useMemo(() => {
    if (attendees === 0 || !attendeeAvatars.length) return [];
    const followingIds = followGraph?.followingIds ?? new Set<string>();
    const scoreMap = followGraph?.scoreMap ?? {};
    
    return [...attendeeAvatars].sort((a, b) => {
      const aF = followingIds.has(a.id) ? 1 : 0;
      const bF = followingIds.has(b.id) ? 1 : 0;
      if (aF !== bF) return bF - aF;
      if (aF === 1) return (scoreMap[b.id] || 0) - (scoreMap[a.id] || 0);
      return 0;
    });
  }, [attendeeAvatars, attendees, followGraph]);

  if (dismissed) return null;

  const carouselItems: CarouselMediaItem[] =
    media && media.length > 0
      ? media
      : [{ media_url: imageUrl, media_type: undefined }];

  const repostAttribution =
    repostInfo?.repostedBy && repostInfo.repostedBy.length > 0
      ? repostInfo.repostedBy.length === 1
        ? `@${repostInfo.repostedBy[0].username}`
        : repostInfo.repostedBy.length === 2
        ? `@${repostInfo.repostedBy[0].username} y @${repostInfo.repostedBy[1].username}`
        : `@${repostInfo.repostedBy[0].username} y ${repostInfo.repostedBy.length - 1} más`
      : null;

  return (
    <div className="w-full" ref={impressionRef}>
      {isSponsored && (
        <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[10px] text-muted-foreground">
          <span>Patrocinado</span>
        </div>
      )}

      {!isSponsored && repostAttribution && (
        <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[10px] text-muted-foreground">
          <Repeat className="w-3 h-3" />
          <span className="truncate"> {repostAttribution}</span>
        </div>
      )}

      <div
        className={cn(
          "cursor-pointer",
          !compact && "feed-card-enter"
        )}
        style={
          compact
            ? undefined
            : ({ "--enter-delay": `${Math.min(index, 6) * 50}ms` } as React.CSSProperties)
        }
        onClick={handleCardClick}
        onPointerDown={handlePointerDown}
      >
        <div className="space-y-2 px-0">
          <div className="relative">
            <MediaCarousel
              items={carouselItems}
              compact={compact}
              onTap={handleCardClick}
              onFirstPlay={notifyPlay}
            />

            {carouselItems.length === 1 && !isSponsored && user && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10 bg-transparent [-webkit-tap-highlight-color:transparent]">
                    <MoreHorizontal className="w-3.5 h-3.5 text-white" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50">
                  <DropdownMenuItem
                    onClick={handleNotInterested}
                    className="gap-2 text-muted-foreground"
                  >
                    <EyeOff className="w-4 h-4" />
                    No me interesa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {experience_id && (
              <span className="absolute left-2 top-2 z-10 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm">
                Experiencia
              </span>
            )}

            <CardLikeButton eventId={id} />
          </div>

          {title && (
            <div className="space-y-1 px-1">
              <h3 className="font-brand text-foreground line-clamp-2 text-xs font-normal">{title}</h3>
            </div>
          )}

          {attendees > 0 && (() => {
            const MAX = 3;
            const shown = sortedAttendees.slice(0, MAX);
            const placeholderCount = Math.max(
              0,
              Math.min(MAX - shown.length, attendees - shown.length)
            );
            return (
              <div className="flex items-center gap-1.5 px-1">
                <div className="flex -space-x-2">
                  {shown.map((attendee) => (
                    <img
                      key={attendee.id}
                      src={attendee.avatar_url ? getOptimizedImageUrl(attendee.avatar_url, ImageSizes.avatarSm) : DEFAULT_AVATAR}
                      alt="Attendee"
                      loading="lazy"
                      decoding="async"
                      className="w-6 h-6 rounded-full border border-background object-cover"
                    />
                  ))}
                  {[...Array(placeholderCount)].map((_, i) => (
                    <img
                      key={`placeholder-${i}`}
                      src={DEFAULT_AVATAR}
                      alt="Attendee"
                      loading="lazy"
                      decoding="async"
                      className="w-6 h-6 rounded-full border border-background object-cover"
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-muted-foreground">{attendees}</span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export const EventCard = memo(EventCardComponent, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.title === next.title &&
    prev.imageUrl === next.imageUrl &&
    prev.date === next.date &&
    prev.location === next.location &&
    prev.category === next.category &&
    prev.attendees === next.attendees &&
    prev.hasGuestlist === next.hasGuestlist &&
    prev.creatorId === next.creatorId &&
    prev.isSponsored === next.isSponsored &&
    prev.sponsoredPostId === next.sponsoredPostId &&
    prev.compact === next.compact &&
    prev.index === next.index &&
    prev.followGraph === next.followGraph && // followGraph is usually stable due to react-query's structural sharing
    (prev.media?.length || 0) === (next.media?.length || 0) &&
    (prev.attendeeAvatars?.length || 0) === (next.attendeeAvatars?.length || 0) &&
    prev.repostInfo?.repostedBy?.length === next.repostInfo?.repostedBy?.length
  );
});
