import { motion } from "framer-motion";
import { Volume2, VolumeX, Repeat, MoreHorizontal, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useContext } from "react";
import { cn } from "@/lib/utils";
import { isVideoUrl } from "@/lib/mediaUtils";
import { SelectedEventContext } from "@/contexts/SelectedEventContext";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { RepostInfo } from "@/hooks/useFollowingEventsScored";
import { useTrackSponsoredClick } from "@/hooks/useSponsoredPosts";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { useAuth } from "@/contexts/AuthContext";
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

export const EventCard = ({
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
  ownerAvatar,
  creatorId,
  repostInfo,
  isSponsored = false,
  sponsoredPostId
}: EventCardProps) => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { user } = useAuth();
  const trackClick = useTrackSponsoredClick();
  const [dismissed, setDismissed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const isHomePage = routerLocation.pathname === "/";
  const selectedEventContext = useContext(SelectedEventContext);

  const handleCardClick = () => {
    if (isSponsored && sponsoredPostId) {
      trackClick.mutate(sponsoredPostId);
    }
    if (isHomePage && selectedEventContext) {
      selectedEventContext.openEvent(id);
    } else {
      navigate(`/event/${id}`);
    }
  };

  const handleNotInterested = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    if (user?.id) {
      trackPreferenceSignal(user.id, id, "not_interested");
    }
  };

  if (dismissed) return null;

  const isVideo = isVideoUrl(imageUrl);

  const optimizedImageUrl = !isVideo && imageUrl && imageUrl.includes('/storage/v1/object/public/')
    ? `${imageUrl}?width=400&quality=75&resize=cover`
    : imageUrl;

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  };

  const handleVideoMetadata = () => {
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current;
      if (videoWidth && videoHeight) {
        setAspectRatio(videoWidth / videoHeight);
      }
    }
  };

  const repostAttribution =
    repostInfo?.repostedBy && repostInfo.repostedBy.length > 0
      ? repostInfo.repostedBy.length === 1
        ? `@${repostInfo.repostedBy[0].username}`
        : repostInfo.repostedBy.length === 2
        ? `@${repostInfo.repostedBy[0].username} y @${repostInfo.repostedBy[1].username}`
        : `@${repostInfo.repostedBy[0].username} y ${repostInfo.repostedBy.length - 1} más`
      : null;

  return (
    <div className="masonry-item">
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: Math.min(index, 6) * 0.05,
          duration: 0.3,
        }}
        whileTap={{ scale: 0.98 }}
        className="cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="space-y-2 px-0">
          {/* Media */}
          <div
            className="relative rounded-2xl overflow-hidden bg-secondary"
            style={{
              width: "100%",
              aspectRatio: aspectRatio ? `${aspectRatio}` : "3/4",
              minHeight: "120px",
              maxHeight: "350px"
            }}
          >
            {isVideo ? (
              <video
                ref={videoRef}
                src={imageUrl}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                onLoadedMetadata={handleVideoMetadata}
              />
            ) : (
              <img
                src={optimizedImageUrl}
                alt={title}
                className="w-full h-full object-cover"
                onLoad={handleImageLoad}
                loading="lazy"
              />
            )}

            {/* Sound toggle button */}
            {isVideo && (
              <button
                onClick={toggleMute}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors z-10"
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            )}

            {/* "Not interested" 3-dot menu — top right (only for non-sponsored, logged-in users) */}
            {!isVideo && !isSponsored && user && (
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

            {/* Attendees overlay - top left */}
            {attendees > 0 && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {ownerAvatar && (
                    <img
                      src={ownerAvatar}
                      alt="Owner"
                      className={cn(
                        "w-6 h-6 rounded-full border-background object-cover border-0",
                        creatorId && "cursor-pointer hover:scale-110 transition-transform z-10"
                      )}
                      onClick={(e) => {
                        if (creatorId) {
                          e.stopPropagation();
                          navigate(`/user/${creatorId}`);
                        }
                      }}
                    />
                  )}
                  {attendeeAvatars
                    .filter((a) => a.id !== creatorId)
                    .slice(0, ownerAvatar ? 2 : 3)
                    .map((attendee) =>
                      attendee.avatar_url ? (
                        <img
                          key={attendee.id}
                          src={attendee.avatar_url}
                          alt="Attendee"
                          className="w-6 h-6 rounded-full border-background object-cover border-0"
                        />
                      ) : (
                        <img
                          key={attendee.id}
                          src={DEFAULT_AVATAR}
                          alt="Attendee"
                          className="w-6 h-6 rounded-full border-background object-cover border-0"
                        />
                      )
                    )}
                  {attendeeAvatars.filter((a) => a.id !== creatorId).length < (ownerAvatar ? 2 : 3) &&
                    attendees > attendeeAvatars.filter((a) => a.id !== creatorId).length &&
                    [...Array(
                      Math.min(
                        (ownerAvatar ? 2 : 3) - attendeeAvatars.filter((a) => a.id !== creatorId).length,
                        attendees - attendeeAvatars.filter((a) => a.id !== creatorId).length
                      )
                    )].map((_, i) => (
                      <img
                        key={`placeholder-${i}`}
                        src={DEFAULT_AVATAR}
                        alt="Attendee"
                        className="w-6 h-6 rounded-full border-background object-cover border-0"
                      />
                    ))}
                </div>
                <span className="text-[10px] font-medium text-foreground">{attendees}</span>
              </div>
            )}
          </div>

          {/* Title */}
          {title && (
            <div className="space-y-1 px-1">
              <h3 className="font-brand font-semibold text-foreground line-clamp-2 text-xs">{title}</h3>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
