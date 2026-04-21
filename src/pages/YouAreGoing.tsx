import { m } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isVideoUrl } from "@/lib/mediaUtils";
import { QRCodeSVG } from "qrcode.react";

const YouAreGoing = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const [showQR, setShowQR] = useState(false);

  // Get the user's guestlist entry with payment status
  const { data: guestlistEntry } = useQuery({
    queryKey: ["guestlist-entry", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from("guestlist_entries")
        .select("qr_code_token, status, payment_status")
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
  const isVideo = isVideoUrl(event.image_url);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50" >
      {/* Background Media */}
      <div className="absolute inset-0">
        {isVideo ? (
          <video
            src={event.image_url || ""}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover" />
        ) : (
          <img
            src={event.image_url || "/placeholder.svg"}
            alt={event.title || "Event"}
            className="w-full h-full object-cover" />
        )}
      </div>

      {/* Close button - Top right */}
      <div className="absolute top-0 right-0 safe-top z-20 p-4">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost" size="icon" className="bg-black/30 backdrop-blur-sm text-white rounded-full" >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Gradient overlay - same as EventDetail */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />

      {/* Content - Bottom Aligned */}
      <div className="relative h-full flex flex-col justify-end">
        <m.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="px-6 pt-8 pb-6 safe-bottom" >

          <div className="text-center space-y-4">
            {/* Guestlist badge - shown when user was invited (no ticket purchase) */}
            {guestlistEntry && (guestlistEntry.payment_status === "none" || !guestlistEntry.payment_status) && (
              <p className="text-sm text-white/70 font-medium tracking-wide uppercase">En Guestlist</p>
            )}
            {/* User's Name - Big and prominent */}
            <h1 className="text-4xl font-bold font-brand text-white">
              {profile?.full_name || profile?.username || "Invitado"}
            </h1>

            {/* Location */}
            {event.location_name && (
              <div className="flex items-center justify-center gap-2 text-white/80">
                <MapPin className="w-4 h-4" />
                <p className="text-sm">{event.location_name}</p>
              </div>
            )}

            {/* Date/Time */}
            <div className="flex items-center justify-center gap-2 text-white/80">
              <Calendar className="w-4 h-4" />
              <p className="text-sm">
                {formattedDate} · {formattedTime}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              {canViewQr ? (
                <Button
                  onClick={() => setShowQR(true)}
                  className="w-full bg-white text-black rounded-xl font-semibold" size="lg" >
                  Mostrar QR de Entrada
                </Button>
              ) : guestlistEntry?.payment_status === "pending" ? (
                <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                  <p className="text-white/80 text-sm text-center">
                    Tu pago está siendo verificado por el organizador. 
                    Una vez confirmado, podrás ver tu QR de entrada.
                  </p>
                </div>
              ) : guestlistEntry?.status === "pending" ? (
                <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                  <p className="text-white/80 text-sm text-center">
                    Tu solicitud está pendiente de aprobación. 
                    Una vez aprobada, podrás ver tu QR de entrada.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </m.div>
      </div>

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
