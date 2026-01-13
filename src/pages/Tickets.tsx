import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Ticket, Calendar } from "lucide-react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const Tickets = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch events the user is confirmed to attend (approved guestlist entries)
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["user-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("guestlist_entries")
        .select(`
          id,
          event_id,
          qr_code_token,
          joined_at,
          event:events(
            id,
            title,
            image_url,
            start_datetime,
            location_name,
            creator:profiles!events_creator_id_fkey(
              id,
              username,
              full_name
            )
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "approved")
        .order("joined_at", { ascending: false });

      if (error) throw error;
      
      // Filter out events that have already passed
      const now = new Date();
      return data?.filter((ticket: any) => {
        const eventDate = new Date(ticket.event?.start_datetime);
        return eventDate >= now;
      }) || [];
    },
    enabled: !!user,
  });

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">
            Tickets
          </h1>
        </div>
      </header>

      <div className="px-4 py-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="space-y-3">
            {tickets.map((ticket: any, index: number) => {
              const event = ticket.event;
              if (!event) return null;
              
              const eventDate = new Date(event.start_datetime);
              const formattedDate = format(eventDate, "EEE, MMM d · h:mm a");
              
              return (
                <motion.button
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/going/${event.id}`)}
                  className="w-full flex items-center gap-4 p-4 bg-secondary/30 hover:bg-secondary/50 rounded-2xl transition-colors"
                >
                  {/* Event Image */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-secondary">
                    {event.image_url ? (
                      <img 
                        src={event.image_url} 
                        alt={event.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Ticket className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-semibold text-foreground truncate">
                      {event.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {event.creator?.full_name || event.creator?.username}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/70">
                      <Calendar className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </motion.button>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No tickets yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              When you're confirmed for events, your tickets will appear here
            </p>
            <Button
              onClick={() => navigate("/")}
              className="mt-6 rounded-xl"
            >
              Discover Events
            </Button>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Tickets;
