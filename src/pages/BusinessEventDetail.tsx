import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useCreatorSalesByEvent } from "@/hooks/usePromoters";
import { useEventAreas } from "@/hooks/useVenueLayouts";
import { EventTiersPanel } from "@/components/business/EventTiersPanel";
import { EventLoungesPanel } from "@/components/business/EventLoungesPanel";
import { EventGuestsPanel } from "@/components/business/EventGuestsPanel";
import { EventPromotersPanel } from "@/components/business/EventPromotersPanel";
import { EventAreaBookingsSheet } from "@/components/business/EventAreaBookingsSheet";
import { formatBs } from "@/components/sales/salesUtils";
import { netOf } from "@/lib/platformFee";

const dateLabel = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-BO", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "Sin fecha";

const BusinessEventDetail = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user, profile } = useAuth();
  useSwipeBack();

  const [loungeSheet, setLoungeSheet] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ["business-event-detail", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, image_url, start_datetime, is_public, creator_id, max_guestlist_capacity")
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: sales } = useCreatorSalesByEvent();
  const { data: areas } = useEventAreas(eventId);
  const hasLounges = (areas || []).some((a) => !a.is_decor);

  const row = useMemo(
    () => (sales || []).find((s: any) => s.event_id === eventId) as any,
    [sales, eventId],
  );

  const { data: views } = useQuery({
    queryKey: ["business-event-views", eventId],
    enabled: !!eventId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_stats")
        .select("view_count")
        .eq("event_id", eventId!)
        .maybeSingle();
      return Number((data as any)?.view_count || 0);
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

  const sold = Number(row?.tickets_sold || 0);
  const capacity = Number(row?.capacity || event?.max_guestlist_capacity || 0);
  const revenue = Number(row?.revenue || 0);
  const conv = views && views > 0 ? (sold / views) * 100 : null;

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

      <div className="px-4 pt-4 space-y-4">
        {isLoading ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : (
          <section className="rounded-2xl bg-card border border-border p-3">
            <div className="flex items-start gap-3">
              {event?.image_url ? (
                <img src={event.image_url} alt={event.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-secondary flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{event?.title}</p>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      event?.is_public ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
                    }`}
                  >
                    {event?.is_public ? "Publicado" : "Pausado"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{dateLabel(event?.start_datetime ?? null)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <Stat label="Vendidas" value={`${sold}${capacity > 0 ? `/${capacity}` : ""}`} />
              <Stat label="Neto" value={formatBs(netOf(revenue))} sub={`Bruto ${formatBs(revenue)}`} />
              <Stat label="Conversión" value={conv !== null ? `${conv.toFixed(1).replace(".", ",")}%` : "—"} />
            </div>
          </section>
        )}

        <Tabs defaultValue="entradas">
          <TabsList className="w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="entradas" className="flex-1">Entradas</TabsTrigger>
            {hasLounges && <TabsTrigger value="lounges" className="flex-1">Lounges</TabsTrigger>}
            <TabsTrigger value="invitados" className="flex-1">Invitados</TabsTrigger>
            <TabsTrigger value="promotores" className="flex-1">Promotores</TabsTrigger>
          </TabsList>

          <TabsContent value="entradas" className="mt-4">
            {eventId && <EventTiersPanel eventId={eventId} />}
          </TabsContent>

          {hasLounges && (
            <TabsContent value="lounges" className="mt-4">
              {eventId && <EventLoungesPanel eventId={eventId} onManage={() => setLoungeSheet(true)} />}
            </TabsContent>
          )}

          <TabsContent value="invitados" className="mt-4">
            {eventId && <EventGuestsPanel eventId={eventId} />}
          </TabsContent>

          <TabsContent value="promotores" className="mt-4">
            {eventId && <EventPromotersPanel eventId={eventId} />}
          </TabsContent>
        </Tabs>
      </div>

      {eventId && loungeSheet && (
        <EventAreaBookingsSheet
          eventId={eventId}
          eventTitle={event?.title || ""}
          open={loungeSheet}
          onOpenChange={setLoungeSheet}
        />
      )}
    </div>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-xl bg-secondary/50 px-2.5 py-2">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="font-brand text-sm font-semibold text-foreground truncate">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
  </div>
);

export default BusinessEventDetail;
