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
          <Skeleton className="h-32 rounded-3xl" />
        ) : (
          <section className="rounded-3xl bg-card border border-border/60 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-brand text-xl font-semibold text-foreground leading-tight truncate">
                  {event?.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {dateLabel(event?.start_datetime ?? null)}
                </p>
              </div>
              <span
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                  event?.is_public ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                }`}
              >
                {event?.is_public ? "Publicado" : "Pausado"}
              </span>
            </div>

            <div className="flex items-start gap-6 mt-5">
              <Stat label="vendidos" value={`${sold}`} />
              <Stat label="ingreso neto" value={formatBs(netOf(revenue))} />
              <Stat label="conversión" value={conv !== null ? `${conv.toFixed(1).replace(".", ",")}%` : "—"} />
            </div>
          </section>
        )}

        <Tabs defaultValue="entradas">
          <TabsList className="w-full justify-start gap-1 h-auto bg-transparent p-0 overflow-x-auto scrollbar-hide">
            {[
              ["entradas", "Entradas"],
              ...(hasLounges ? [["lounges", "Lounges"]] : []),
              ["invitados", "Invitados"],
              ["promotores", "Promotores"],
            ].map(([v, label]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none"
              >
                {label}
              </TabsTrigger>
            ))}
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

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <p className="font-brand text-2xl font-semibold text-foreground leading-none truncate">{value}</p>
    <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
  </div>
);

export default BusinessEventDetail;
