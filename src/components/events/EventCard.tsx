import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { isVideoUrl, formatDuration } from "@/lib/mediaUtils";

export interface EventCardProps {
  id: string;
  title?: string;
  imageUrl: string;
  date: string;
  location: string;
  category: string;
  attendees?: number;
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [isVideo]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Generate random height for masonry effect
  const heights = ["h-48", "h-56", "h-64", "h-72"];
  const heightClass = heights[index % heights.length];
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
        <div className={cn("relative rounded-2xl overflow-hidden", heightClass)}>
          {isVideo ? (
            <video 
              ref={videoRef}
              src={imageUrl} 
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
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

          {/* Timer counter - bottom right */}
          {isVideo && duration > 0 && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
              <span className="text-[10px] font-medium text-white">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>
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
                {/* Other attendees */}
                {[...Array(Math.min(ownerAvatar ? 2 : 3, attendees))].map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-secondary border-2 border-background" />
                ))}
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