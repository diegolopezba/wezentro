import { m } from "framer-motion";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Info, MapPin, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isVideoUrl } from "@/lib/mediaUtils";
import { QRCodeSVG } from "qrcode.react";
import { TicketInfoSheet } from "@/components/events/TicketInfoSheet";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import mascotAsset from "@/assets/muñeco-negro.png.asset.json";



const ENTRY_COLUMNS =
  "id, user_id, guest_name, checked_in_at, qr_code_token, status, payment_status, is_special_guest, special_guest_label, joined_at";

const YouAreGoing = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get("ticketId");
  const { user, profile } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // All the user's entries for this event: their own + extra tickets they
  // paid for that are still unclaimed (user_id null, purchased by them).
  const { data: entries } = useQuery({
    queryKey: ["guestlist-entries", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return [];
      const { data, error } = await supabase
        .from("guestlist_entries")
        .select(ENTRY_COLUMNS)
        .or(`user_id.eq.${user.id},and(user_id.is.null,purchased_by_user_id.eq.${user.id})`)
        .eq("event_id", id)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const safeEntries = entries ?? [];
  const total = safeEntries.length;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    startIndex: activeIndex,
    watchDrag: total > 1,
  });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Deep-link support: /going/:eventId?ticketId=... opens that specific ticket.
  useEffect(() => {
    if (!emblaApi || !ticketId || total === 0) return;
    const idx = safeEntries.findIndex((t) => t.id === ticketId);
    if (idx >= 0) emblaApi.scrollTo(idx, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, ticketId, total]);

  if (isLoading || !event) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="animate-pulse text-foreground">Cargando...</div>
      </div>
    );
  }

  const eventDate = new Date(event.start_datetime);
  const formattedDate = format(eventDate, "EEEE, d 'de' MMMM", { locale: es });
  const formattedTime = format(eventDate, "HH:mm", { locale: es });

  // First media item of the carousel, falling back to the legacy cover image.
  const media = ((event as any).media as
    | { media_url: string; media_type?: string | null; display_order?: number | null }[]
    | undefined) ?? [];
  const firstMedia = [...media].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  )[0];
  const mediaUrl = firstMedia?.media_url || event.image_url || "/placeholder.svg";
  const isVideo = firstMedia
    ? firstMedia.media_type === "video" || isVideoUrl(firstMedia.media_url)
    : isVideoUrl(event.image_url);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/"));

  const renderEntrySlide = (entry: (typeof safeEntries)[number], i: number) => {
    const entryIsUsed = !!entry.checked_in_at;
    const entryIsOwn = !!entry.user_id && entry.user_id === user?.id;
    const holderName = entryIsOwn
      ? profile?.full_name || profile?.username || "Invitado"
      : entry.guest_name || "";
    const entryCanViewQr =
      !entryIsUsed &&
      entry.status === "approved" &&
      (entry.payment_status === "none" ||
        entry.payment_status === "confirmed" ||
        !entry.payment_status);

    return (
      <div key={entry.id} className="relative flex-[0_0_100%] min-w-0 space-y-3">
        {/* Box 2 — ticket details */}
        <div className="rounded-3xl bg-[#F7F3E7] text-[#141414] px-6 py-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#141414]/60 truncate">
            {event.title}
          </p>
          {entry.is_special_guest && (
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#141414]">
              Invitado especial
              {entry.special_guest_label
                ? ` - ${entry.special_guest_label}`
                : ""}
            </p>
          )}
          {holderName && (
            <h1 className="mt-3 font-brand text-3xl font-medium leading-tight">
              {holderName}
            </h1>
          )}
          {total > 1 && (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#141414]/50">
              Entrada {i + 1} de {total}
            </p>
          )}

          <p className="mt-3 text-sm font-medium text-[#141414]/70 capitalize">
            {formattedDate} · {formattedTime}
          </p>
          {event.location_name && (
            <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-[#141414]/50">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{event.location_name}</span>
            </div>
          )}
        </div>

        {/* Box 3 — action */}
        <div className="rounded-3xl bg-[#F7F3E7] text-[#141414] px-4 py-3">
          {entryCanViewQr ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img
                  src={mascotAsset.url}
                  alt="Zentro"
                  className="h-10 w-auto object-contain"
                />
                <span className="font-brand text-2xl font-medium tracking-tight text-[#141414]">
                  zentro
                </span>
              </div>
              <Button
                onClick={() => setQrToken(entry.qr_code_token ?? null)}
                size="lg"
                className="rounded-full font-semibold gap-2 bg-[#141414] text-[#F7F3E7] active:scale-95"
              >
                <QrCode className="w-5 h-5" />
                Mostrar QR
              </Button>
            </div>
          ) : entryIsUsed ? (
            <p className="text-sm font-semibold text-[#141414]/70 text-center px-2 py-2">
              Ya fue usado
            </p>
          ) : entry.payment_status === "pending" ? (
            <p className="text-sm text-[#141414]/70 text-center px-2 py-2">
              Tu pago está siendo verificado por el organizador. Una vez
              confirmado, podrás ver tu QR de entrada.
            </p>
          ) : entry.status === "pending" ? (
            <p className="text-sm text-[#141414]/70 text-center px-2 py-2">
              Tu solicitud está pendiente de aprobación. Una vez aprobada,
              podrás ver tu QR de entrada.
            </p>
          ) : (
            <p className="text-sm text-[#141414]/70 text-center px-2 py-2">
              Tu entrada aún no está disponible.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto overscroll-contain"
    >
      <m.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="px-4 pb-8 pt-3 safe-top safe-bottom space-y-3 max-w-md mx-auto"
      >
        {/* Box 1 — event media with floating actions */}
        <div className="relative rounded-3xl overflow-hidden bg-secondary aspect-[4/5]">
          {isVideo ? (
            <video
              src={mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={mediaUrl}
              alt={event.title || "Evento"}
              className="w-full h-full object-cover"
            />
          )}

          {/* Floating top actions */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
            <Button
              onClick={goBack}
              variant="ghost"
              size="icon"
              aria-label="Volver"
              className="rounded-full bg-black/40 backdrop-blur-md text-white active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => setShowInfo(true)}
              variant="ghost"
              size="icon"
              aria-label="Información"
              className="rounded-full bg-black/40 backdrop-blur-md text-white active:scale-95"
            >
              <Info className="w-5 h-5" />
            </Button>
          </div>

        </div>

        {/* Boxes 2 & 3 — swipeable carousel when the user has multiple tickets */}
        {total > 0 ? (
          <>
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {safeEntries.map((entry, i) => renderEntrySlide(entry, i))}
              </div>
            </div>
            {total > 1 && (
              <div className="flex justify-center gap-1.5" role="tablist" aria-label="Entradas">
                {safeEntries.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === activeIndex}
                    aria-label={`Entrada ${i + 1}`}
                    onClick={() => emblaApi?.scrollTo(i)}
                    className={cn(
                      "rounded-full transition-all active:scale-90",
                      i === activeIndex
                        ? "w-2 h-2 bg-foreground"
                        : "w-1.5 h-1.5 bg-muted-foreground/40"
                    )}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Box 2 — event details (no entry yet) */}
            <div className="rounded-3xl bg-[#F7F3E7] text-[#141414] px-6 py-7 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#141414]/60 truncate">
                {event.title}
              </p>
              <p className="mt-3 text-sm font-medium text-[#141414]/70 capitalize">
                {formattedDate} · {formattedTime}
              </p>
              {event.location_name && (
                <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-[#141414]/50">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{event.location_name}</span>
                </div>
              )}
            </div>

            {/* Box 3 — action */}
            <div className="rounded-3xl bg-[#F7F3E7] text-[#141414] px-4 py-3">
              <p className="text-sm text-[#141414]/70 text-center px-2 py-2">
                Tu entrada aún no está disponible.
              </p>
            </div>
          </>
        )}



      </m.div>

      {/* Info bottom sheet */}
      <TicketInfoSheet open={showInfo} onOpenChange={setShowInfo} />

      {/* QR Code Dialog */}
      <Dialog open={!!qrToken} onOpenChange={(o) => !o && setQrToken(null)}>
        <DialogContent className="bg-background text-foreground max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">
              {total > 1 ? `Tu QR de Entrada · ${activeIndex + 1}/${total}` : "Tu QR de Entrada"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {qrToken ? (
              <div className="bg-white p-5 rounded-2xl shadow-lg">
                <QRCodeSVG
                  value={qrToken}
                  size={200}
                  level="H" includeMargin={false}
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Código QR no disponible</p>
            )}
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Muestra esto en la entrada
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </m.div>
  );
};

export default YouAreGoing;
