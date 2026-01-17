import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, QrCode, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const YouAreGoing = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
      <div className="fixed inset-0 bg-primary flex items-center justify-center z-50">
        <div className="animate-pulse text-primary-foreground">Cargando...</div>
      </div>
    );
  }

  const eventDate = new Date(event.start_datetime);
  const formattedDate = format(eventDate, "EEEE, d 'de' MMMM", { locale: es });
  const formattedTime = format(eventDate, "HH:mm", { locale: es });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-destructive z-50 flex flex-col items-center justify-center px-6 text-primary-foreground safe-top safe-bottom"
    >
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center max-w-sm w-full items-center justify-center flex flex-col"
      >
        {/* You Are Going */}
        <p className="text-sm font-medium uppercase tracking-widest opacity-80 text-white">
          Vas a asistir
        </p>

        {/* Event Creator's Display Name */}
        <h1 className="font-bold mt-4 font-brand text-primary text-5xl">
          {event.creator?.full_name || event.creator?.username || "Anfitrión"}
        </h1>

        {/* Event Title */}
        <h2 className="font-semibold mt-2 opacity-90 text-white text-xl">{event.title}</h2>

        {/* Event Owner's Display Name */}
        <p className="mt-2 opacity-80 text-primary text-sm my-0">
          Organizado por {event.creator?.full_name || event.creator?.username}
        </p>

        {/* Location */}
        {event.location_name && (
          <div className="flex items-center gap-1.5 mt-4 opacity-70">
            <MapPin className="w-4 h-4 text-white" />
            <p className="text-sm text-white">{event.location_name}</p>
          </div>
        )}

        {/* Date/Time */}
        <div className="flex items-center gap-1.5 mt-2 opacity-70">
          <Calendar className="w-4 h-4 text-white" />
          <p className="text-sm text-white">
            {formattedDate} a las {formattedTime}
          </p>
        </div>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3 mt-12 w-full max-w-xs"
      >
        <Button
          onClick={() => setShowQR(true)}
          className="w-full bg-background text-foreground hover:bg-background/90 rounded-xl"
          size="lg"
        >
          <QrCode className="w-4 h-4 mr-2" />
          Mostrar QR
        </Button>

        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="w-full text-primary-foreground hover:bg-primary-foreground/10 rounded-xl"
          size="lg"
        >
          Cerrar
        </Button>
      </motion.div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="bg-background text-foreground max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">Tu QR de Entrada</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {guestlistEntry?.qr_code_token ? (
              <div className="bg-white p-4 rounded-xl">
                {/* Simple QR representation - in production, use a QR library */}
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
