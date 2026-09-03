import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { EventPromotersPanel } from "@/components/business/EventPromotersPanel";

const EventPromoterDashboard = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user, profile } = useAuth();
  useSwipeBack();

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event-meta", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, creator_id")
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isOwner = !!user && event?.creator_id === user.id;
  const isBusiness = profile?.is_business === true;

  if (!eventLoading && (!event || !isOwner || !isBusiness)) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground mb-4">
          Solo cuentas business pueden gestionar promotores de sus eventos.
        </p>
        <Button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))} variant="secondary" className="rounded-full">
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-brand text-lg font-medium text-foreground truncate">Promotores</h1>
            {event?.title && (
              <p className="text-xs text-muted-foreground truncate">{event.title}</p>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 py-5">
        {eventId && <EventPromotersPanel eventId={eventId} />}
      </div>
    </div>
  );
};

export default EventPromoterDashboard;
