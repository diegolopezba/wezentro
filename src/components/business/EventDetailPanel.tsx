import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal, Play, Pause, Pencil, Share2, Armchair } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/bottom-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCreatorSalesByEvent } from "@/hooks/usePromoters";
import { useEventAreas } from "@/hooks/useVenueLayouts";
import { useToggleEventVisibility } from "@/hooks/useEventMutations";
import { EventTiersPanel } from "@/components/business/EventTiersPanel";
import { EventLoungesPanel } from "@/components/business/EventLoungesPanel";
import { EventGuestsPanel } from "@/components/business/EventGuestsPanel";
import { EventPromotersPanel } from "@/components/business/EventPromotersPanel";
import { EventAreaBookingsSheet } from "@/components/business/EventAreaBookingsSheet";
import { EditEventSheet } from "@/components/events/EditEventSheet";
import { GuestlistManagementSheet } from "@/components/events/GuestlistManagementSheet";
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
          <EventTiersPanel eventId={eventId} />
        </TabsContent>

        {hasLounges && (
          <TabsContent value="lounges" className="mt-4">
            <EventLoungesPanel eventId={eventId} onManage={() => setLoungeSheet(true)} />
          </TabsContent>
        )}

        <TabsContent value="invitados" className="mt-4">
          <EventGuestsPanel eventId={eventId} />
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
                onClick={() => { setActionsOpen(false); setEditOpen(true); }}
              />
              <ActionRow icon={Share2} label="Compartir / copiar link" onClick={handleShare} />
              <ActionRow
                icon={QrCode}
                label="Invitados y check-in"
                onClick={() => { setActionsOpen(false); setGuestsSheet(true); }}
              />
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
        <EditEventSheet event={event as any} open={editOpen} onOpenChange={setEditOpen} />
      )}

      {guestsSheet && (
        <GuestlistManagementSheet
          eventId={eventId}
          eventHasPaymentQr={!!event?.payment_qr_url}
          open={guestsSheet}
          onOpenChange={setGuestsSheet}
        />
      )}

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
