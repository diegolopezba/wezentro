import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { isVideoUrl } from "@/lib/mediaUtils";

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
}
const categoryColors: Record<string, string> = {
  club: "from-purple-500 to-pink-500",
  bar: "from-amber-500 to-orange-500",
  concert: "from-blue-500 to-cyan-500",
  festival: "from-green-500 to-emerald-500",
  house_party: "from-red-500 to-rose-500",
  default: "from-primary to-accent"
};
export const EventCard = ({
  id,
  title,
  imageUrl,
  date,
  location,
  category,
  attendees = 0,
  attendeeAvatars = [],
  hasGuestlist = false,
  index = 0,
  ownerAvatar,
  creatorId
}: EventCardProps) => {
  const navigate = useNavigate();
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
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    delay: index * 0.05,
    duration: 0.3
  }} whileHover={{
    scale: 1.02
  }} whileTap={{
    scale: 0.98
  }} className="masonry-item cursor-pointer" onClick={() => navigate(`/event/${id}`)}>
      <div className="space-y-2 px-0">
        {/* Media */}
        <div 
          className="relative rounded-2xl overflow-hidden bg-secondary"
          style={{ 
            width: '100%',
            aspectRatio: aspectRatio ? `${aspectRatio}` : '3/4',
            minHeight: '120px',
            maxHeight: '350px'
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
              src={imageUrl} 
              alt={title} 
              className="w-full h-full object-cover"
              onLoad={handleImageLoad}
            />
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
                {/* Owner avatar first */}
                {ownerAvatar && (
                  <img 
                    src={ownerAvatar} 
                    alt="Owner" 
                    className={cn(
                      "w-5 h-5 rounded-full border-2 border-background object-cover",
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
                {/* Attendee avatars (up to 3, excluding owner) */}
                {attendeeAvatars
                  .filter(a => a.id !== creatorId)
                  .slice(0, ownerAvatar ? 2 : 3)
                  .map((attendee, i) => (
                    attendee.avatar_url ? (
                      <img 
                        key={attendee.id}
                        src={attendee.avatar_url} 
                        alt="Attendee" 
                        className="w-5 h-5 rounded-full border-2 border-background object-cover"
                      />
                    ) : (
                      <div 
                        key={attendee.id} 
                        className="w-5 h-5 rounded-full bg-secondary border-2 border-background" 
                      />
                    )
                  ))}
                {/* Show placeholder circles if we don't have enough avatars */}
                {attendeeAvatars.filter(a => a.id !== creatorId).length < (ownerAvatar ? 2 : 3) && 
                  attendees > attendeeAvatars.filter(a => a.id !== creatorId).length &&
                  [...Array(Math.min(
                    (ownerAvatar ? 2 : 3) - attendeeAvatars.filter(a => a.id !== creatorId).length,
                    attendees - attendeeAvatars.filter(a => a.id !== creatorId).length
                  ))].map((_, i) => (
                    <div key={`placeholder-${i}`} className="w-5 h-5 rounded-full bg-secondary border-2 border-background" />
                  ))
                }
              </div>
              <span className="text-[10px] font-medium text-foreground">
                {attendees}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        {title && (
          <div className="space-y-1 px-1">
            <h3 className="font-brand font-semibold text-foreground line-clamp-2 text-xs">
              {title}
            </h3>
          </div>
        )}
      </div>
    </motion.div>;
};