import { Repeat, MoreHorizontal, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, memo } from "react";
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
import { useViewerFollowGraph } from "@/hooks/useViewerFollowGraph";
import { useImpressionTracker } from "@/hooks/useImpressionTracker";
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
  ownerAvatar?: string; // deprecated, no longer rendered
  creatorId?: string;
  repostInfo?: RepostInfo;
  isSponsored?: boolean;
  sponsoredPostId?: string;
  compact?: boolean;
  media?: CarouselMediaItem[];
}

const categoryColors: Record<string, string> = {
  party: "from-[hsl(var(--accent-red))] to-pink-500",
  bar: "from-amber-500 to-orange-500",
  concert: "from-blue-500 to-cyan-500",
  festival: "from-green-500 to-emerald-500",
  rooftop: "from-sky-500 to-blue-500",
  restaurant: "from-rose-500 to-pink-500",
  coffee: "from-amber-600 to-yellow-500",
  fitness: "from-green-600 to-lime-500",
  culture: "from-violet-500 to-indigo-500",
  default: "from-[hsl(var(--primary))] to-[hsl(var(--accent))]"
};

const EventCardComponent = ({
  id,
  title,
  imageUrl,
  date,
  location: locationName,
  category,
  attendees = 0,
  attendeeAvatars = [],
  hasGuestlist = false,
  index = 0,
  creatorId,
  repostInfo,
  isSponsored = false,
  sponsoredPostId,
  compact = false,
  media,
}: EventCardProps) => {
  const navigate = useNavigate();
  const openEvent = useOpenEvent();
  const { user } = useAuth();
  const trackClick = useTrackSponsoredClick();
  const clickedRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const { data: followGraph } = useViewerFollowGraph();
  const followingIds = followGraph?.followingIds ?? new Set<string>();
  const scoreMap = followGraph?.scoreMap ?? {};
  const impressionRef = useImpressionTracker(id);

  // Reset click-tracking when this card represents a different event
  useEffect(() => {
    clickedRef.current = false;
  }, [id]);

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
    <div ref={impressionRef} className="masonry-item">
      {/* Sponsored badge */}
      {isSponsored && (
        <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[10px] text-muted-foreground">
          <span>Patrocinado</span>
        </div>
      )}

      {/* Repost attribution */}
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
      >
        <div className="space-y-2 px-0">
          {/* Media carousel */}
          <div className="relative">
            <MediaCarousel
              items={carouselItems}
              compact={compact}
              onTap={handleCardClick}
            />

            {/* "Not interested" 3-dot menu — only for non-sponsored, logged-in users, single-image cards */}
            {carouselItems.length === 1 && !isSponsored && user && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="absolute top-2 right-2 w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors z-10 bg-transparent">
                    <MoreHorizontal className="w-3.5 h-3.5 text-white" />
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
          </div>

          {/* Title */}
          {title && (
            <div className="space-y-1 px-1">
              <h3 className="font-brand text-foreground line-clamp-2 text-xs font-normal">{title}</h3>
            </div>
          )}

          {/* Attendees row - below text */}
          {attendees > 0 && (() => {
            const MAX = 3;
            const sorted = [...attendeeAvatars].sort((a, b) => {
              const aF = followingIds.has(a.id) ? 1 : 0;
              const bF = followingIds.has(b.id) ? 1 : 0;
              if (aF !== bF) return bF - aF;
              if (aF === 1) return (scoreMap[b.id] || 0) - (scoreMap[a.id] || 0);
              return 0;
            });
            const shown = sorted.slice(0, MAX);
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

/**
 * React.memo with a shallow comparator on the props that actually drive rendering.
 * Prevents 200-card re-render storms when the parent updates unrelated state.
 */
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
    (prev.attendeeAvatars?.length || 0) === (next.attendeeAvatars?.length || 0) &&
    prev.repostInfo?.repostedBy?.length === next.repostInfo?.repostedBy?.length
  );
});
