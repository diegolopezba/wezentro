import { useNavigate } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { isVideoUrl } from "@/lib/mediaUtils";
import { useImpressionTracker } from "@/hooks/useImpressionTracker";

interface EventInviteCardProps {
  event: {
    id: string;
    title: string | null;
    image_url: string | null;
    start_datetime: string;
    location_name: string | null;
  };
}

const EventInviteCard = ({ event }: EventInviteCardProps) => {
  const navigate = useNavigate();
  const isVideo = isVideoUrl(event.image_url);
  const impressionRef = useImpressionTracker(event.id);

  const handleClick = () => {
    navigate(`/event/${event.id}`);
  };

  return (
    <div
      ref={impressionRef}
      onClick={handleClick}
      className="cursor-pointer rounded-xl overflow-hidden bg-card border border-border transition-colors max-w-[280px]" >
      {event.image_url && (
        <div className="aspect-[16/9] overflow-hidden">
          {isVideo ? (
            <video
              src={event.image_url}
              className="w-full h-full object-cover" autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={event.image_url}
              alt={event.title || "Event"}
              className="w-full h-full object-cover" />
          )}
        </div>
      )}
      <div className="p-3 space-y-2">
        {event.title && (
          <h4 className="font-semibold text-sm text-foreground line-clamp-2">
            {event.title}
          </h4>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{format(new Date(event.start_datetime), "EEE, MMM d • h:mm a")}</span>
        </div>
        {event.location_name && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{event.location_name}</span>
          </div>
        )}
        <div className="pt-1">
          <span className="text-xs text-primary font-medium">View Event →</span>
        </div>
      </div>
    </div>
  );
};

export default EventInviteCard;
