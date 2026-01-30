import { motion } from "framer-motion";
import { Volume2, VolumeX, Repeat } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useContext, useCallback } from "react";
import { cn } from "@/lib/utils";
import { isVideoUrl } from "@/lib/mediaUtils";
import { useHasActiveSubscription } from "@/hooks/useGuestlist";
import { SelectedEventContext } from "@/contexts/SelectedEventContext";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { RepostInfo } from "@/hooks/useFollowingEventsScored";
import { useLongPress } from "@/hooks/useLongPress";
import { EventCardQuickActions } from "./EventCardQuickActions";
import { ShareEventModal } from "./ShareEventModal";

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
}

const categoryColors: Record<string, string> = {
  club: "from-purple-500 to-pink-500",
  bar: "from-amber-500 to-orange-500",
  concert: "from-blue-500 to-cyan-500",
  festival: "from-green-500 to-emerald-500",
  house_party: "from-red-500 to-rose-500",
  rooftop: "from-sky-500 to-blue-500",
  restaurant: "from-rose-500 to-pink-500",
  coffee: "from-amber-600 to-yellow-500",
  default: "from-primary to-accent",
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
}: EventCardProps) => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { data: hasSubscription } = useHasActiveSubscription();

  // Quick actions state
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [quickActionsPosition, setQuickActionsPosition] = useState({ x: 0, y: 0 });
  const [showShareModal, setShowShareModal] = useState(false);

  // Use expansion transition only on home page
  const isHomePage = routerLocation.pathname === "/";
  
  // Safe hook call - returns null if context is not available
  const selectedEventContext = useContext(SelectedEventContext);
  
  const handleCardClick = useCallback(() => {
    if (showQuickActions) return; // Don't navigate if quick actions are open
    
    if (isHomePage && selectedEventContext) {
      selectedEventContext.openEvent(id);
    } else {
      navigate(`/event/${id}`);
    }
  }, [id, isHomePage, selectedEventContext, navigate, showQuickActions]);

  const handleLongPress = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // Get position from the event
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX || 0;
      clientY = e.touches[0]?.clientY || e.changedTouches[0]?.clientY || 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    setQuickActionsPosition({ x: clientX, y: clientY });
    setShowQuickActions(true);
    
    // Trigger haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  const longPressHandlers = useLongPress({
    threshold: 400,
    onLongPress: handleLongPress,
    onPress: handleCardClick,
  });

  const gradientClass = categoryColors[category] || categoryColors.default;
  const isVideo = isVideoUrl(imageUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

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

  // Generate repost attribution text
  const repostAttribution =
    repostInfo?.repostedBy && repostInfo.repostedBy.length > 0
      ? repostInfo.repostedBy.length === 1
        ? `@${repostInfo.repostedBy[0].username}`
        : repostInfo.repostedBy.length === 2
          ? `@${repostInfo.repostedBy[0].username} y @${repostInfo.repostedBy[1].username}`
          : `@${repostInfo.repostedBy[0].username} y ${repostInfo.repostedBy.length - 1} más`
      : null;

  return (
    <>
      <div className="masonry-item">
        {/* Repost attribution */}
        {repostAttribution && (
          <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[10px] text-muted-foreground">
            <Repeat className="w-3 h-3" />
            <span className="truncate"> {repostAttribution}</span>
          </div>
        )}

        <motion.div
          layoutId={`event-card-${id}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: index * 0.05,
            duration: 0.3,
            layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="cursor-pointer select-none"
          {...longPressHandlers}
        >
          <div className="space-y-2 px-0">
            {/* Media */}
            <div
              className="relative rounded-2xl overflow-hidden bg-secondary"
              style={{
                width: "100%",
                aspectRatio: aspectRatio ? `${aspectRatio}` : "3/4",
                minHeight: "120px",
                maxHeight: "350px",
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
                <img src={imageUrl} alt={title} className="w-full h-full object-cover" onLoad={handleImageLoad} />
              )}

              {/* Sound toggle button - top right */}
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

              {/* Attendees overlay - top left */}
              {attendees > 0 && (
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    {hasSubscription ? (
                      <>
                        {/* Owner avatar first */}
                        {ownerAvatar && (
                          <img
                            src={ownerAvatar}
                            alt="Owner"
                            className={cn(
                              "w-6 h-6 rounded-full border-background object-cover border-0",
                              creatorId && "cursor-pointer hover:scale-110 transition-transform z-10",
                            )}
                            onClick={(e) => {
                              if (creatorId) {
                                e.stopPropagation();
                                navigate(`/user/${creatorId}`);
                              }
                            }}
                          />
                        )}
                        {/* Attendee avatars (up to 3, excluding owner) */}
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
                            ),
                          )}
                        {/* Show placeholder circles if we don't have enough avatars */}
                        {attendeeAvatars.filter((a) => a.id !== creatorId).length < (ownerAvatar ? 2 : 3) &&
                          attendees > attendeeAvatars.filter((a) => a.id !== creatorId).length &&
                          [
                            ...Array(
                              Math.min(
                                (ownerAvatar ? 2 : 3) - attendeeAvatars.filter((a) => a.id !== creatorId).length,
                                attendees - attendeeAvatars.filter((a) => a.id !== creatorId).length,
                              ),
                            ),
                          ].map((_, i) => (
                            <img
                              key={`placeholder-${i}`}
                              src={DEFAULT_AVATAR}
                              alt="Attendee"
                              className="w-6 h-6 rounded-full border-background object-cover border-0"
                            />
                          ))}
                      </>
                    ) : (
                      /* Non-premium: show blurred real avatars */
                      attendeeAvatars
                        .slice(0, 3)
                        .map((attendee) =>
                          attendee.avatar_url ? (
                            <img
                              key={attendee.id}
                              src={attendee.avatar_url}
                              alt="Attendee"
                              className="w-6 h-6 rounded-full border-2 border-background object-cover blur-[2px]"
                            />
                          ) : (
                            <img
                              key={attendee.id}
                              src={DEFAULT_AVATAR}
                              alt="Attendee"
                              className="w-6 h-6 rounded-full border-2 border-background object-cover blur-[2px]"
                            />
                          ),
                        )
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-foreground">{attendees}</span>
                </div>
              )}
            </div>

            {/* Content */}
            {title && (
              <div className="space-y-1 px-1">
                <h3 className="font-brand font-semibold text-foreground line-clamp-2 text-xs">{title}</h3>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions Overlay */}
      <EventCardQuickActions
        eventId={id}
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onShare={() => setShowShareModal(true)}
        position={quickActionsPosition}
      />

      {/* Share Modal */}
      <ShareEventModal
        eventId={id}
        open={showShareModal}
        onOpenChange={setShowShareModal}
      />
    </>
  );
};
