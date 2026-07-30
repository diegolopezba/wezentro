import { m } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Info, MapPin, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isVideoUrl } from "@/lib/mediaUtils";
import { QRCodeSVG } from "qrcode.react";
import { TicketInfoSheet } from "@/components/events/TicketInfoSheet";
import mascotAsset from "@/assets/muñeco-negro.png.asset.json";


const YouAreGoing = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const [showQR, setShowQR] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Get the user's guestlist entry with payment status
  const { data: guestlistEntry } = useQuery({
    queryKey: ["guestlist-entry", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from("guestlist_entries")
        .select("qr_code_token, status, payment_status, is_special_guest")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Check if user can view QR (must be approved and payment confirmed if payment was required)
  const canViewQr = guestlistEntry?.status === "approved" && 
    (guestlistEntry?.payment_status === "none" || 
     guestlistEntry?.payment_status === "confirmed" || 
     !guestlistEntry?.payment_status);

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

        {/* Box 2 — ticket details */}
        <div className="rounded-3xl bg-[#F7F3E7] text-[#141414] px-6 py-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#141414]/60 truncate">
            {event.title}
          </p>
          {guestlistEntry?.is_special_guest && (
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-red">
              Invitado especial
            </p>
          )}
          <h1 className="mt-3 font-brand text-3xl font-bold leading-tight">
            {profile?.full_name || profile?.username || "Invitado"}
          </h1>
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
          {canViewQr ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img
                  src={mascotAsset.url}
                  alt="Zentro"
                  className="h-10 w-auto object-contain"
                />
                <span className="font-brand text-2xl font-bold tracking-tight text-[#141414]">
                  zentro
                </span>
              </div>
              <Button
                onClick={() => setShowQR(true)}
                size="lg"
                className="rounded-full font-semibold gap-2 bg-accent-red text-white active:scale-95"
              >
                <QrCode className="w-5 h-5" />
                Mostrar QR
              </Button>
            </div>
          ) : guestlistEntry?.payment_status === "pending" ? (
            <p className="text-sm text-[#141414]/70 text-center px-2 py-2">
              Tu pago está siendo verificado por el organizador. Una vez
              confirmado, podrás ver tu QR de entrada.
            </p>
          ) : guestlistEntry?.status === "pending" ? (
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

      </m.div>

      {/* Info bottom sheet */}
      <TicketInfoSheet open={showInfo} onOpenChange={setShowInfo} />

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="bg-background text-foreground max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">Tu QR de Entrada</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {guestlistEntry?.qr_code_token ? (
              <div className="bg-white p-5 rounded-2xl shadow-lg">
                <QRCodeSVG
                  value={guestlistEntry.qr_code_token}
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
