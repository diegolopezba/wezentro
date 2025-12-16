import { motion } from "framer-motion";
import { Calendar, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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
  ownerAvatar
}: EventCardProps) => {
  const navigate = useNavigate();
  const gradientClass = categoryColors[category] || categoryColors.default;

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
        {/* Image */}
        <div className={cn("relative rounded-2xl overflow-hidden", heightClass)}>
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          
          {/* Attendees overlay - top left */}
          {attendees > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {/* Owner avatar first */}
                {ownerAvatar && (
                  <img 
                    src={ownerAvatar} 
                    alt="Owner" 
                    className="w-5 h-5 rounded-full border-2 border-background object-cover"
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