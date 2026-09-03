import { useState } from "react";
import { m } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Armchair, Calendar, Map as MapIcon, Users } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { VenueGridCanvas } from "@/components/venue/VenueGridCanvas";
import { useAuth } from "@/contexts/AuthContext";
import {
  AREA_TYPE_LABELS,
  useEventAreas,
  useMyAreaBookings,
  type MyAreaBooking,
} from "@/hooks/useVenueLayouts";
import { useEventPurchaseQuestions } from "@/hooks/useEventPurchaseQuestions";

/** Buyer-facing lounge reservations: area detail, perks, arrival note and venue map. */
export const MyLoungeBookings = () => {
  const { user } = useAuth();
  const { data: bookings = [] } = useMyAreaBookings(user?.id);
  const [detail, setDetail] = useState<MyAreaBooking | null>(null);
  const [showMap, setShowMap] = useState(false);

  const { data: eventAreas = [] } = useEventAreas(showMap ? detail?.event.id : undefined);
  const { data: questions = [] } = useEventPurchaseQuestions(detail?.event.id);

  if (bookings.length === 0) return null;

  return (
    <div className="px-4 pt-2 pb-1 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">Lounges y áreas</h2>

      {bookings.map((b, i) => (
        <m.button
          key={b.id}
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 6) * 0.05 }}
          onClick={() => setDetail(b)}
          className="w-full text-left flex items-center gap-4 p-4 bg-secondary/30 rounded-2xl active:opacity-80"
        >
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-secondary">
            {b.event.image_url ? (
              <img src={b.event.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Armchair className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{b.event.title}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {b.area.name} · {AREA_TYPE_LABELS[b.area.area_type]}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground/70">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(b.event.start_datetime), "EEE, d MMM · HH:mm", { locale: es })}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {b.party_size}
              </span>
              {b.included_tickets > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-medium">
                  {b.included_tickets} entradas incl.
                </span>
              )}
            </div>
          </div>
        </m.button>
      ))}

      {/* Detalle de la reserva */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setShowMap(false); } }}>
        <SheetContent
          side="bottom"
          className="light-sheet rounded-t-3xl border-border bg-background max-h-[92dvh] overflow-y-auto pb-8"
        >
          <SheetTitle className="sr-only">Detalle de la reserva</SheetTitle>
          <SheetDescription className="sr-only">
            Información de tu lounge reservado.
          </SheetDescription>
          {detail && (
            <div className="px-1 pt-2 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tu lounge
                </p>
                <h2 className="font-brand text-xl font-medium text-foreground leading-tight">
                  {detail.area.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {detail.event.title} ·{" "}
                  {format(new Date(detail.event.start_datetime), "d MMM · HH:mm", { locale: es })}
                </p>
              </div>

              <div className="rounded-2xl border border-border p-4 space-y-2">
                <p className="text-sm text-foreground">
                  {AREA_TYPE_LABELS[detail.area.area_type]} · {detail.party_size}{" "}
                  {detail.party_size === 1 ? "persona" : "personas"}
                </p>
                {detail.included_tickets > 0 && (
                  <p className="text-sm font-semibold text-emerald-600">
                    Incluye {detail.included_tickets}{" "}
                    {detail.included_tickets === 1 ? "entrada" : "entradas"} al evento
                  </p>
                )}
                {detail.area.description && (
                  <p className="text-sm text-muted-foreground">{detail.area.description}</p>
                )}
                {(detail.area.perks ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(detail.area.perks ?? []).map((p) => (
                      <span
                        key={p}
                        className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {detail.area.arrival_note && (
                <div className="rounded-2xl bg-secondary/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Al llegar
                  </p>
                  <p className="text-sm text-foreground">{detail.area.arrival_note}</p>
                </div>
              )}

              {detail.answers && Object.keys(detail.answers).length > 0 && (
                <div className="rounded-2xl border border-border p-4 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tus respuestas
                  </p>
                  {Object.entries(detail.answers).map(([qid, value]) => (
                    <p key={qid} className="text-sm">
                      <span className="text-muted-foreground">
                        {questions.find((q) => q.id === qid)?.label ?? "Respuesta"}:{" "}
                      </span>
                      <span className="text-foreground font-medium">{value}</span>
                    </p>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full"
                onClick={() => setShowMap((v) => !v)}
              >
                <MapIcon className="w-4 h-4 mr-2" />
                {showMap ? "Ocultar plano" : "Ver mi lugar en el plano"}
              </Button>

              {showMap && eventAreas.length > 0 && (
                <VenueGridCanvas
                  areas={eventAreas}
                  selectedId={detail.area.id}
                  onSelect={() => {}}
                  renderLabel={(a) => (a.id === detail.area.id ? "Tu lugar" : a.name)}
                />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
