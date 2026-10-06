import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal, Play, Pause, Pencil, Share2, Armchair } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/bottom-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCreatorSalesByEvent, useEventEntryBreakdown } from "@/hooks/usePromoters";
import { useEventAreas } from "@/hooks/useVenueLayouts";
import { useToggleEventVisibility } from "@/hooks/useEventMutations";
import { EventTiersPanel, entryTotals } from "@/components/business/EventTiersPanel";
import { GateSalesPanel } from "@/components/business/GateSalesPanel";
import { EventLoungesPanel } from "@/components/business/EventLoungesPanel";
import { EventGuestsPanel } from "@/components/business/EventGuestsPanel";
import { EventPromotersPanel } from "@/components/business/EventPromotersPanel";
import { EventAreaBookingsSheet } from "@/components/business/EventAreaBookingsSheet";
import { EditEventSheet } from "@/components/events/EditEventSheet";
import { SpecialInvitesPanel } from "@/components/events/SpecialInvitesPanel";
import { ScannerPanel } from "@/components/events/GuestlistManagementSheet";
import { useVenueLayouts } from "@/hooks/useVenueLayouts";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

import { getEventShareUrl } from "@/lib/shareLinks";
import { haptic } from "@/lib/haptics";
import { formatBs } from "@/components/sales/salesUtils";
import { netOf } from "@/lib/platformFee";

const dateLabel = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-BO", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "Sin fecha";

interface Props {
  eventId: string;
  /** Called when ownership/business access check fails. */
  onAccessDenied?: () => void;
  currentUserId?: string;
}

export const EventDetailPanel = ({ eventId }: Props) => {
  const navigate = useNavigate();
  const [loungeSheet, setLoungeSheet] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editScrollLounges, setEditScrollLounges] = useState(false);
  const [loungeInfoOpen, setLoungeInfoOpen] = useState(false);
  const { user } = useAuth();
  const { data: layouts } = useVenueLayouts(user?.id);
  const hasLayouts = (layouts || []).length > 0;
  const toggle = useToggleEventVisibility();

  const { data: event, isLoading } = useQuery({
    queryKey: ["business-event-detail", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: sales } = useCreatorSalesByEvent();
  const { data: entryBreakdown, isLoading: entriesLoading } = useEventEntryBreakdown(eventId);
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
        .eq("event_id", eventId)
        .maybeSingle();
      return Number((data as any)?.view_count || 0);
    },
  });

  const sold = Number(row?.tickets_sold || 0);
  const attendees = entryBreakdown ? entryTotals(entryBreakdown).total : null;
  const capacity = Number(row?.capacity || event?.max_guestlist_capacity || 0);
  const revenue = Number(row?.revenue || 0);
  const conv = views && views > 0 ? (sold / views) * 100 : null;

  const handleToggle = async () => {
    if (!event) return;
    haptic("medium");
    setActionsOpen(false);
    try {
      await toggle.mutateAsync({ eventId, isPublic: !event.is_public });
      toast.success(event.is_public ? "Evento pausado — ya no aparece en el feed" : "Evento reanudado");
    } catch {
      toast.error("No pudimos actualizar el evento");
    }
  };

  const handleShare = async () => {
    if (!event) return;
    const url = getEventShareUrl(eventId);
    try {
      if (navigator.share) await navigator.share({ title: event.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Enlace copiado");
      }
    } catch { /* cancelled */ }
    setActionsOpen(false);
  };

  return (
    <div className="space-y-4">
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
            <button
              onClick={() => { haptic("light"); setActionsOpen(true); }}
              aria-label="Acciones"
              className="w-9 h-9 -mr-1 rounded-full grid place-items-center active:bg-secondary transition-colors flex-shrink-0"
            >
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
             <Stat label="Total asistentes" value={attendees !== null ? `${attendees}${capacity > 0 ? `/${capacity}` : ""}` : entriesLoading ? "…" : "—"} />
            <Stat label="Neto" value={formatBs(netOf(revenue))} sub={`Bruto ${formatBs(revenue)}`} />
            <Stat label="Conversión" value={conv !== null ? `${conv.toFixed(1).replace(".", ",")}%` : "—"} />
          </div>
        </section>
      )}

      <Tabs defaultValue="entradas">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide">
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="puerta">Puerta</TabsTrigger>
          <TabsTrigger value="asistentes">Asistentes</TabsTrigger>
          <TabsTrigger value="invitaciones">Invitaciones</TabsTrigger>
          <TabsTrigger value="lounges">Lounges</TabsTrigger>
          <TabsTrigger value="promotores">Promotores</TabsTrigger>
        </TabsList>

        <TabsContent value="entradas" className="mt-4">
          <EventTiersPanel eventId={eventId} />
        </TabsContent>

        <TabsContent value="puerta" className="mt-4 space-y-4">
          <GateSalesPanel eventId={eventId} eventTitle={event?.title || "Evento"} />
          <ScannerPanel eventId={eventId} />
        </TabsContent>

        <TabsContent value="asistentes" className="mt-4">
          <EventGuestsPanel eventId={eventId} />
        </TabsContent>

        <TabsContent value="invitaciones" className="mt-4">
          <SpecialInvitesPanel eventId={eventId} />
        </TabsContent>

        <TabsContent value="lounges" className="mt-4">
          {hasLounges ? (
            <EventLoungesPanel eventId={eventId} onManage={() => setLoungeSheet(true)} />
          ) : (
            <div className="rounded-2xl bg-card border border-border p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary grid place-items-center mx-auto">
                <Armchair className="w-6 h-6 text-foreground" />
              </div>
              <p className="text-sm text-foreground font-medium">Este evento no tiene mesas ni lounges configurados.</p>
              {hasLayouts ? (
                <Button
                  className="rounded-full w-full"
                  onClick={() => { haptic("light"); setEditScrollLounges(true); setEditOpen(true); }}
                >
                  Editar evento para agregar mesas y lounges
                </Button>
              ) : (
                <Button className="rounded-full w-full" onClick={() => { haptic("light"); setLoungeInfoOpen(true); }}>
                  Activar mesas y lounges
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="promotores" className="mt-4">
          <EventPromotersPanel eventId={eventId} />
        </TabsContent>
      </Tabs>

      {/* Quick actions */}
      <Sheet open={actionsOpen} onOpenChange={setActionsOpen}>
        <SheetContent side="bottom" className="light-sheet rounded-t-3xl pb-6">
          <SheetTitle className="sr-only">Acciones del evento</SheetTitle>
          <SheetDescription className="sr-only">Gestioná este evento.</SheetDescription>
          <div className="pt-2">
            <p className="font-brand text-lg font-medium text-foreground truncate">{event?.title}</p>
            <p className="text-xs text-muted-foreground mb-4">{dateLabel(event?.start_datetime ?? null)}</p>
            <div className="space-y-1">
              <ActionRow
                icon={event?.is_public ? Pause : Play}
                label={event?.is_public ? "Pausar evento" : "Reanudar evento"}
                sub={event?.is_public ? "Deja de aparecer en el feed y la búsqueda" : "Vuelve a ser visible para todos"}
                onClick={handleToggle}
              />
              <ActionRow
                icon={Pencil}
                label="Editar evento"
                sub="Incluye el plano y las áreas de lounge"
                onClick={() => { setActionsOpen(false); setEditScrollLounges(false); setEditOpen(true); }}
              />
              <ActionRow icon={Share2} label="Compartir / copiar link" onClick={handleShare} />
              {hasLounges && (
                <ActionRow
                  icon={Armchair}
                  label="Reservas de lounge"
                  sub="Áreas vendidas, check-in y cancelaciones"
                  onClick={() => { setActionsOpen(false); setLoungeSheet(true); }}
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {editOpen && event && (
        <EditEventSheet event={event as any} open={editOpen} onOpenChange={setEditOpen} scrollToLounges={editScrollLounges} />
      )}

      <Sheet open={loungeInfoOpen} onOpenChange={setLoungeInfoOpen}>
        <SheetContent side="bottom" className="light-sheet rounded-t-3xl pb-6">
          <SheetTitle className="font-brand text-lg text-foreground">Mesas y lounges</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Vendé mesas y lounges exclusivos directamente desde tu evento.
          </SheetDescription>
          <ul className="mt-4 space-y-2 text-sm text-foreground">
            <li className="rounded-2xl bg-secondary/60 p-3">Dibujá el plano de tu lugar con sus zonas y mesas.</li>
            <li className="rounded-2xl bg-secondary/60 p-3">Poné precio y capacidad a cada lounge; se reservan de forma exclusiva.</li>
            <li className="rounded-2xl bg-secondary/60 p-3">Cada reserva puede incluir entradas que se suman a tus asistentes.</li>
          </ul>
          <Button
            className="rounded-full w-full mt-5"
            onClick={() => { setLoungeInfoOpen(false); navigate("/settings/business/layouts"); }}
          >
            Vender mesas y lounges
          </Button>
        </SheetContent>
      </Sheet>

      {loungeSheet && (
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
