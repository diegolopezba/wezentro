import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Loader2, Calendar } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserJoinedEvents } from "@/hooks/useEvents";
import { EventCard } from "@/components/events/EventCard";

const JoinedEvents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: joinedEvents, isLoading } = useUserJoinedEvents(user?.id);

  const renderEventCard = (event: any, index: number) => (
    <EventCard
      key={event.id}
      id={event.id}
      title={event.title || undefined}
      imageUrl={event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"}
      date={event.start_datetime ? format(new Date(event.start_datetime), "EEE, d MMM • HH:mm", { locale: es }) : ""}
      location={event.location_name || "Ubicación por confirmar"}
      category={event.category || "party"}
      attendees={event.guestlist_entries?.[0]?.count || 0}
      ownerAvatar={event.creator?.avatar_url}
      creatorId={event.creator_id}
      index={index}
    />
  );

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">
            Mis Eventos Asistidos
          </h1>
        </div>
      </header>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !joinedEvents || joinedEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-foreground mb-1">
                Sin eventos asistidos
              </h3>
              <p className="text-sm text-muted-foreground">
                Únete a eventos para verlos aquí
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>
              Explorar eventos
            </Button>
          </motion.div>
        ) : (
          <div className="masonry-grid">
            {joinedEvents.map((event, index) => renderEventCard(event, index))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default JoinedEvents;
