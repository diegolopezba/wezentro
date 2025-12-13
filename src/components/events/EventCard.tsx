import { motion } from "framer-motion";
import { Calendar, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
export interface EventCardProps {
  id: string;
  title: string;
  imageUrl: string;
  date: string;
  location: string;
  category: string;
  attendees?: number;
  hasGuestlist?: boolean;
  index?: number;
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
  index = 0
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
      <div className="relative rounded-2xl overflow-hidden bg-card shadow-card group">
        {/* Image */}
        <div className={cn("relative", heightClass)}>
          <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
        </div>

        {/* Content */}
        <div className="p-4 space-y-2 py-0 px-0 bg-[sidebar-primary-foreground] bg-background">
          <h3 className="font-brand font-semibold text-foreground line-clamp-2">
            {title}
          </h3>
          
          
          
          

          {attendees > 0 && <div className="flex items-center gap-2 pt-1">
              <div className="flex -space-x-2">
                {[...Array(Math.min(3, attendees))].map((_, i) => <div key={i} className="w-6 h-6 rounded-full bg-secondary border-2 border-card" />)}
              </div>
              {attendees > 3 && <span className="text-xs text-muted-foreground">
                  +{attendees - 3} going
                </span>}
            </div>}
        </div>
      </div>
    </motion.div>;
};