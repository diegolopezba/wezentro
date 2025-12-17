import { useState } from "react";
import { Search, Calendar, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUserCreatedEvents } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface EventPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEvent: (eventId: string) => void;
}

const EventPickerModal = ({ open, onOpenChange, onSelectEvent }: EventPickerModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { data: events, isLoading } = useUserCreatedEvents(user?.id);

  const filteredEvents = events?.filter((event) =>
    event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSelectEvent = (eventId: string) => {
    onSelectEvent(eventId);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Event Invitation</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading events...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No events found" : "You haven't created any events yet"}
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => handleSelectEvent(event.id)}
                className="flex gap-3 p-3 rounded-xl hover:bg-secondary cursor-pointer transition-colors"
              >
                {event.image_url && (
                  <img
                    src={event.image_url}
                    alt={event.title || "Event"}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground line-clamp-1">
                    {event.title || "Untitled Event"}
                  </h4>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(event.start_datetime), "MMM d, h:mm a")}</span>
                  </div>
                  {event.location_name && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{event.location_name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventPickerModal;
