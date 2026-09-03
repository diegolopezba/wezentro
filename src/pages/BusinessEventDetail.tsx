import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { EventDetailPanel } from "@/components/business/EventDetailPanel";

const BusinessEventDetail = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user, profile } = useAuth();
  useSwipeBack();

  const { data: event, isLoading } = useQuery({
    queryKey: ["business-event-owner-check", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, creator_id")
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isOwner = !!user && event?.creator_id === user.id;
  const isBusiness = profile?.is_business === true;

  if (!isLoading && (!event || !isOwner || !isBusiness)) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground mb-4">
          Solo cuentas business pueden gestionar sus eventos.
        </p>
        <Button variant="secondary" className="rounded-full" onClick={() => navigate("/tickets")}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="sticky top-0 z-30 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/tickets"))}
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-lg font-medium text-foreground truncate">Evento</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        {eventId && <EventDetailPanel eventId={eventId} />}
      </div>
    </div>
  );
};

export default BusinessEventDetail;
