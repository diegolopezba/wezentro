import { m } from "framer-motion";
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, formatCount } from "@/lib/utils";
import { useOpenEvent } from "@/hooks/useOpenEvent";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { getOptimizedImageUrl, ImageSizes } from "@/lib/imageOptimization";
import { MediaCarousel, type CarouselMediaItem } from "@/components/events/MediaCarousel";

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
  media?: CarouselMediaItem[];
  viewCount?: number;
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
  media,
  viewCount,
}: TimelineCardProps) => {
  const navigate = useNavigate();
  const openEvent = useOpenEvent();

  const handleCardClick = () => {
    openEvent(id);
  };

  const carouselItems: CarouselMediaItem[] =
    media && media.length > 0
      ? media
      : [{ media_url: imageUrl, media_type: undefined }];

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
      className="masonry-item cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="space-y-2 px-0">
        <MediaCarousel items={carouselItems} onTap={handleCardClick} />

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

        {/* Attendees row - below text (only for events, not posts) */}
        {!isPost && attendees > 0 && (
          <div className="flex items-center gap-1.5 px-1">
            <div className="flex -space-x-2">
              {ownerAvatar && (
                <img
                  src={getOptimizedImageUrl(ownerAvatar, ImageSizes.avatarSm)}
                  alt="Owner"
                  className={cn(
                    "w-6 h-6 rounded-full border border-background object-cover",
                    creatorId && "cursor-pointer z-10"
                  )}
                  onClick={(e) => {
                    if (creatorId) {
                      e.stopPropagation();
                      navigate(`/user/${creatorId}`);
                    }
                  }}
                />
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground">{attendees}</span>
          </div>
        )}
      </div>
    </m.div>
  );
};
