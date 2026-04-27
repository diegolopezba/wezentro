import { m } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { isVideoUrl } from "@/lib/mediaUtils";
import { useOpenEvent } from "@/hooks/useOpenEvent";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { getOptimizedImageUrl, ImageSizes } from "@/lib/imageOptimization";

export interface TimelineCardProps {
  id: string;
  title?: string | null;
  imageUrl: string;
  startDatetime?: string | null;
  location?: string | null;
  category?: string | null;
  attendees?: number;
  isPost?: boolean;
  createdAt?: string | null;
  index?: number;
  ownerAvatar?: string;
  creatorId?: string;
}

export const TimelineCard = ({
  id,
  title,
  imageUrl,
  startDatetime,
  location: locationName,
  category,
  attendees = 0,
  isPost = false,
  createdAt,
  index = 0,
  ownerAvatar,
  creatorId,
}: TimelineCardProps) => {
  const navigate = useNavigate();
  const openEvent = useOpenEvent();

  const handleCardClick = () => {
    // Open event-modal-on-top (Pinterest pattern). For posts and events alike.
    openEvent(id);
  };

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

  // Format the date/time display
  const getDateDisplay = () => {
    if (isPost && createdAt) {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es });
    }
    if (startDatetime) {
      return format(new Date(startDatetime), "EEE, d MMM • HH:mm", { locale: es });
    }
    return null;
  };

  const dateDisplay = getDateDisplay();

  return (
    <m.div
      layoutId={`timeline-card-${id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index, 6) * 0.05,
        duration: 0.3,
        layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
      }}
      whileTap={{ scale: 0.98 }}
      className="masonry-item cursor-pointer" onClick={handleCardClick}
    >
      <div className="space-y-2 px-0">
        {/* Media */}
        <div
          className="relative rounded-xl overflow-hidden bg-secondary" style={{
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
              className="w-full h-full object-cover" autoPlay
              muted
              loop
              playsInline
              onLoadedMetadata={handleVideoMetadata}
            />
          ) : (
            <img
              src={getOptimizedImageUrl(imageUrl, ImageSizes.card)}
              alt={title || "Post"}
              className="w-full h-full object-cover" onLoad={handleImageLoad}
            />
          )}

          {/* Sound toggle button - top right */}
          {isVideo && (
            <button
              onClick={toggleMute}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-colors z-10" >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-white" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          )}

          {/* Attendees overlay - top left (only for events, not posts) */}
          {!isPost && attendees > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {ownerAvatar && (
                  <img
                    src={getOptimizedImageUrl(ownerAvatar, ImageSizes.avatarXs)}
                    alt="Owner" className={cn( "w-5 h-5 rounded-full border-background object-cover border-0",
                      creatorId && "cursor-pointer transition-transform z-10" )}
                    onClick={(e) => {
                      if (creatorId) {
                        e.stopPropagation();
                        navigate(`/user/${creatorId}`);
                      }
                    }}
                  />
                )}
              </div>
              <span className="text-[10px] font-medium text-foreground">{attendees}</span>
            </div>
          )}
        </div>

        {/* Content */}
        {(title || dateDisplay) && (
          <div className="space-y-0.5 px-1">
            {title && (
              <h3 className="font-brand text-foreground line-clamp-2 text-xs font-normal">
                {title}
              </h3>
            )}
            {dateDisplay && (
              <p className="text-[10px] text-muted-foreground">{dateDisplay}</p>
            )}
          </div>
        )}
      </div>
    </m.div>
  );
};
