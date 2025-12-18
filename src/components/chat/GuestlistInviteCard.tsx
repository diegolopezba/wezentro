import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { isVideoUrl } from "@/lib/mediaUtils";

interface GuestlistInviteCardProps {
  event: {
    id: string;
    title: string | null;
    image_url: string | null;
    start_datetime: string;
    location_name: string | null;
    creator_id: string;
  };
  senderId: string | null;
}

const GuestlistInviteCard = ({ event, senderId }: GuestlistInviteCardProps) => {
  const navigate = useNavigate();
  const isVideo = isVideoUrl(event.image_url);
  const isFromOwner = senderId === event.creator_id;

  const handleClick = () => {
    navigate(`/event/${event.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer rounded-xl overflow-hidden bg-card border border-primary/30 hover:border-primary/50 transition-colors max-w-[280px]"
    >
      {event.image_url && (
        <div className="aspect-[16/9] overflow-hidden relative">
          {isVideo ? (
            <video
              src={event.image_url}
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={event.image_url}
              alt={event.title || "Event"}
              className="w-full h-full object-cover"
            />
          )}
          {/* Guestlist badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium">
            <Users className="w-3 h-3" />
            <span>Guestlist Invite</span>
          </div>
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
          <span className="text-xs text-primary font-medium">
            {isFromOwner ? "Join my guestlist →" : "Join the guestlist →"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GuestlistInviteCard;
