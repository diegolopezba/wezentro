import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MoreHorizontal, Users, Play, Pause, Pencil, Share2, BarChart3, QrCode, CalendarPlus, Armchair,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/bottom-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessUpcomingEvents, type Event } from "@/hooks/useEvents";
import { useCreatorSalesByEvent } from "@/hooks/usePromoters";
import { useToggleEventVisibility } from "@/hooks/useEventMutations";
import {
  useEventAreaSalesSummary,
  useAreaSalesSummaryRealtime,
} from "@/hooks/useVenueLayouts";
import { EditEventSheet } from "@/components/events/EditEventSheet";
import { GuestlistManagementSheet } from "@/components/events/GuestlistManagementSheet";
import { EventAreaBookingsSheet } from "./EventAreaBookingsSheet";
import { getEventShareUrl } from "@/lib/shareLinks";
import { haptic } from "@/lib/haptics";
import { netOf } from "@/lib/platformFee";
import { formatBs } from "@/components/sales/salesUtils";

const dateLabel = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-BO", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "Sin fecha";

export const EventosGestionTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: events, isLoading } = useBusinessUpcomingEvents(user?.id);
  const { data: sales } = useCreatorSalesByEvent();
  const toggle = useToggleEventVisibility();

  const [actionsFor, setActionsFor] = useState<Event | null>(null);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [guestlistFor, setGuestlistFor] = useState<Event | null>(null);
  const [loungeFor, setLoungeFor] = useState<Event | null>(null);

  const salesById = useMemo(() => {
    const map: Record<string, any> = {};
    (sales || []).forEach((s: any) => { map[s.event_id] = s; });
    return map;
  }, [sales]);

  const eventIds = (events || []).map((e) => e.id);
  const { data: areaSummary } = useEventAreaSalesSummary(eventIds);
  useAreaSalesSummaryRealtime(eventIds.length > 0);

  const { data: viewsByEvent } = useQuery({
    queryKey: ["gestion-events-views", eventIds],
    enabled: eventIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_stats")
        .select("event_id, view_count")
        .in("event_id", eventIds);
      const map: Record<string, number> = {};
      (data || []).forEach((s: any) => { map[s.event_id] = Number(s.view_count || 0); });
      return map;
    },
  });

  const handleToggle = async (e: Event) => {
    haptic("medium");
    setActionsFor(null);
    try {
      await toggle.mutateAsync({ eventId: e.id, isPublic: !e.is_public });
      toast.success(e.is_public ? "Evento pausado — ya no aparece en el feed" : "Evento reanudado");
    } catch {
      toast.error("No pudimos actualizar el evento");
    }
  };

  const handleShare = async (e: Event) => {
    const url = getEventShareUrl(e.id);
    try {
      if (navigator.share) await navigator.share({ title: e.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Enlace copiado");
      }
    } catch { /* cancelled */ }
    setActionsFor(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }

  if (!events?.length) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">No tenés eventos próximos.</p>
        <button
          onClick={() => navigate("/create")}
          className="mt-4 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-foreground text-background text-sm font-medium active:scale-[0.98] transition-transform"
        >
          <CalendarPlus className="w-4 h-4" /> Crear evento
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-brand text-sm font-semibold text-foreground">Próximos eventos</h2>

      <div className="space-y-2">
        {events.map((e) => {
          const s = salesById[e.id];
          const sold = Number(s?.tickets_sold || 0);
          const capacity = Number(s?.capacity || e.max_guestlist_capacity || 0);
          const revenue = Number(s?.revenue || 0);
          const views = viewsByEvent?.[e.id] || 0;
          const conv = views > 0 ? (sold / views) * 100 : null;
          const pct = capacity > 0 ? Math.min(100, (sold / capacity) * 100) : 0;

          return (
            <div key={e.id} className="rounded-2xl bg-card border border-border p-3">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => navigate(`/business/event/${e.id}/promoters`)}
                  className="flex-shrink-0 active:scale-[0.98] transition-transform"
                  aria-label={`Ver ${e.title}`}
                >
                  {e.image_url ? (
                    <img src={e.image_url} alt={e.title} loading="lazy" className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-secondary" />
                  )}
                </button>

                <button
                  onClick={() => navigate(`/business/event/${e.id}/promoters`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{e.title}</p>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        e.is_public
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-amber-500/15 text-amber-600"
                      }`}
                    >
                      {e.is_public ? "Publicado" : "Pausado"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{dateLabel(e.start_datetime)}</p>
                  <p className="font-brand text-sm font-medium text-foreground mt-0.5">{formatBs(netOf(revenue))}</p>
                  <p className="text-[11px] text-muted-foreground">Bruto {formatBs(revenue)}</p>
                </button>

                <button
                  onClick={() => { haptic("light"); setActionsFor(e); }}
                  aria-label="Acciones"
                  className="w-9 h-9 -mr-1 rounded-full grid place-items-center active:bg-secondary transition-colors flex-shrink-0"
                >
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" /> {sold}{capacity > 0 ? `/${capacity}` : ""} vendidos
                </span>
                {s?.checked_in > 0 && <span>{s.checked_in} check-in</span>}
                {conv !== null && <span>{conv.toFixed(1).replace(".", ",")}% conv.</span>}
                {s?.attributed_tickets > 0 && <span>{s.attributed_tickets} vía promotores</span>}
              </div>

              {capacity > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick actions sheet */}
      <Sheet open={!!actionsFor} onOpenChange={(o) => !o && setActionsFor(null)}>
        <SheetContent side="bottom" className="light-sheet rounded-t-3xl pb-6">
          <SheetTitle className="sr-only">Acciones del evento</SheetTitle>
          <SheetDescription className="sr-only">Gestioná este evento.</SheetDescription>
          {actionsFor && (
            <div className="pt-2">
              <p className="font-brand text-lg font-medium text-foreground truncate">{actionsFor.title}</p>
              <p className="text-xs text-muted-foreground mb-4">{dateLabel(actionsFor.start_datetime)}</p>

              <div className="space-y-1">
                <ActionRow
                  icon={actionsFor.is_public ? Pause : Play}
                  label={actionsFor.is_public ? "Pausar evento" : "Reanudar evento"}
                  sub={actionsFor.is_public ? "Deja de aparecer en el feed y la búsqueda" : "Vuelve a ser visible para todos"}
                  onClick={() => handleToggle(actionsFor)}
                />
                <ActionRow
                  icon={Pencil}
                  label="Editar evento"
                  sub="Incluye el plano y las áreas de lounge"
                  onClick={() => { setEditEvent(actionsFor); setActionsFor(null); }}
                />
                <ActionRow
                  icon={Share2}
                  label="Compartir / copiar link"
                  onClick={() => handleShare(actionsFor)}
                />
                <ActionRow
                  icon={BarChart3}
                  label="Ver promotores"
                  onClick={() => { const id = actionsFor.id; setActionsFor(null); navigate(`/business/event/${id}/promoters`); }}
                />
                <ActionRow
                  icon={QrCode}
                  label="Invitados y check-in"
                  onClick={() => { setGuestlistFor(actionsFor); setActionsFor(null); }}
                />
                <ActionRow
                  icon={Armchair}
                  label="Reservas de lounge"
                  sub="Áreas vendidas, check-in y cancelaciones"
                  onClick={() => { setLoungeFor(actionsFor); setActionsFor(null); }}
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {editEvent && (
        <EditEventSheet
          event={editEvent as any}
          open={!!editEvent}
          onOpenChange={(o) => !o && setEditEvent(null)}
        />
      )}

      {guestlistFor && (
        <GuestlistManagementSheet
          eventId={guestlistFor.id}
          eventHasPaymentQr={!!guestlistFor.payment_qr_url}
          open={!!guestlistFor}
          onOpenChange={(o) => !o && setGuestlistFor(null)}
        />
      )}

      {loungeFor && (
        <EventAreaBookingsSheet
          eventId={loungeFor.id}
          eventTitle={loungeFor.title}
          open={!!loungeFor}
          onOpenChange={(o) => !o && setLoungeFor(null)}
        />
      )}
    </div>
  );
};

const ActionRow = ({
  icon: Icon, label, sub, onClick,
}: { icon: any; label: string; sub?: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left active:bg-secondary transition-colors"
  >
    <Icon className="w-5 h-5 text-foreground flex-shrink-0" />
    <span className="min-w-0">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {sub && <span className="block text-[11px] text-muted-foreground">{sub}</span>}
    </span>
  </button>
);
