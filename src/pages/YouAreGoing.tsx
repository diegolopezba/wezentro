import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { QrCode, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isVideoUrl } from "@/lib/mediaUtils";

const YouAreGoing = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const [showQR, setShowQR] = useState(false);

  // Get the user's QR code token from guestlist_entries
  const { data: guestlistEntry } = useQuery({
    queryKey: ["guestlist-entry", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from("guestlist_entries")
        .select("qr_code_token")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      {/* Background Media */}
      <div className="absolute inset-0">
        {isVideo ? (
          <video
            src={event.image_url || ""}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={event.image_url || "/placeholder.svg"}
            alt={event.title || "Event"}
            className="w-full h-full object-cover"
          />
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90" />
      </div>

      {/* Content - Bottom Aligned */}
      <div className="relative flex-1 flex flex-col justify-end">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-black/40 backdrop-blur-xl rounded-t-3xl px-6 pt-8 pb-6 safe-bottom"
        >
          {/* Gradient fade at top of card */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-black/40 rounded-t-3xl -translate-y-full" />

          <div className="text-center space-y-4">
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
              <Button
                onClick={() => setShowQR(true)}
                className="w-full bg-white text-black hover:bg-white/90 rounded-xl font-semibold"
                size="lg"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Mostrar QR
              </Button>

              <Button
                onClick={() => navigate(-1)}
                variant="ghost"
                className="w-full text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
                size="lg"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="bg-background text-foreground max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">Tu QR de Entrada</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {guestlistEntry?.qr_code_token ? (
              <div className="bg-white p-4 rounded-xl">
                <div className="w-48 h-48 flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-2 font-mono break-all px-2">
                      {guestlistEntry.qr_code_token.slice(0, 8)}...
                    </p>
                  </div>
                </div>
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
    </motion.div>
  );
};

export default YouAreGoing;
