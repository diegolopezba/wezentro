import { useState } from "react";
import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Ticket, Calendar, QrCode } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PAST_PAGE_SIZE = 10;

export const TicketsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [qrTicket, setQrTicket] = useState<{ token: string; title: string } | null>(null);
  const [pastVisible, setPastVisible] = useState(PAST_PAGE_SIZE);

  // Fetch events the user is confirmed (approved) to attend
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["user-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("guestlist_entries")
        .select(` id,
          event_id,
          qr_code_token,
          joined_at,
          status,
          payment_status,
          user_id,
          purchased_by_user_id,
          event:events(
            id,
            title,
            image_url,
            start_datetime,
            location_name,
            price,
            payment_qr_url,
            creator:profiles!events_creator_id_fkey(
              id,
              username,
              full_name
            )
          ) `)
        // Own tickets + extra tickets this user paid for that nobody claimed yet.
        .or(`user_id.eq.${user.id},and(user_id.is.null,purchased_by_user_id.eq.${user.id})`)
        .eq("status", "approved")
        .order("joined_at", { ascending: false });

      if (error) throw error;

      return data || [];
    },

    enabled: !!user,
  });

  const getPaymentStatusBadge = (paymentStatus: string | null, isFree: boolean) => {
    if (!isFree && paymentStatus === "pending") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
          Pago Pendiente
        </span>
      );
    }
    if (!isFree && paymentStatus === "rejected") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          Pago Rechazado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
        Confirmado
      </span>
    );
  };

  const now = Date.now();
  const withEvent = (tickets || []).filter((t: any) => !!t.event);
  const upcoming = withEvent.filter(
    (t: any) => new Date(t.event.start_datetime).getTime() >= now
  );
  const past = withEvent
    .filter((t: any) => new Date(t.event.start_datetime).getTime() < now)
    .sort(
      (a: any, b: any) =>
        new Date(b.event.start_datetime).getTime() - new Date(a.event.start_datetime).getTime()
    );

  const renderTicket = (ticket: any, index: number, isPast: boolean) => {
    const event = ticket.event;
    const eventDate = new Date(event.start_datetime);
    const formattedDate = format(eventDate, "EEE, d MMM · HH:mm", { locale: es });

    const isFree = !event.price || Number(event.price) === 0;
    const paymentOk =
      ticket.payment_status === "none" ||
      ticket.payment_status === "confirmed" ||
      !ticket.payment_status;
    const canShowQr = !isPast && !!ticket.qr_code_token && (isFree || paymentOk);

    const handleRowClick = () => {
      if (isPast) {
        navigate(`/event/${event.id}`);
      } else if (isFree && canShowQr) {
        setQrTicket({ token: ticket.qr_code_token, title: event.title });
      } else if (canShowQr) {
        navigate(`/going/${event.id}`);
      }
    };

    return (
      <m.div
        key={ticket.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index, 6) * 0.05 }}
        className={cn(
          "w-full flex items-center gap-4 p-4 bg-secondary/30 rounded-2xl",
          isPast && "opacity-60"
        )}
      >
        {/* Event Image */}
        <button
          onClick={handleRowClick}
          className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-secondary active:opacity-80"
        >
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Ticket className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </button>

        {/* Event Info */}
        <button
          onClick={handleRowClick}
          className="flex-1 min-w-0 text-left active:opacity-80"
        >
          <h3 className="font-semibold text-foreground truncate">
            {event.title}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {event.creator?.full_name || event.creator?.username}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <Calendar className="w-3 h-3" />
              <span>{formattedDate}</span>
            </div>
            {isPast ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                Finalizado
              </span>
            ) : (
              getPaymentStatusBadge(ticket.payment_status, isFree)
            )}
            {!ticket.user_id && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                Para invitado
              </span>
            )}
          </div>
        </button>

        {/* Trailing action */}
        {isFree && canShowQr ? (
          <Button
            size="sm"
            onClick={() => setQrTicket({ token: ticket.qr_code_token, title: event.title })}
            className="rounded-full shrink-0 gap-1.5 active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            Ver QR
          </Button>
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        )}
      </m.div>
    );
  };

  return (
    <div className="px-4 py-2">
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : withEvent.length > 0 ? (
        <div className="space-y-3">
          {upcoming.map((t: any, i: number) => renderTicket(t, i, false))}

          {upcoming.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No tienes entradas próximas
            </div>
          )}

          {past.length > 0 && (
            <div className="pt-4 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Pasadas</h2>
              {past.slice(0, pastVisible).map((t: any, i: number) => renderTicket(t, i, true))}
              {past.length > pastVisible && (
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => setPastVisible((v) => v + PAST_PAGE_SIZE)}
                >
                  Ver más
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center" >
          <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
            <Ticket className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Sin entradas aún</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Cuando estés confirmado para eventos, tus entradas aparecerán aquí
          </p>
          <Button
            onClick={() => navigate("/")}
            className="mt-6 rounded-xl" >
            Descubrir Eventos
          </Button>
        </m.div>
      )}

      {/* Inline QR Dialog (free tickets) */}
      <Dialog open={!!qrTicket} onOpenChange={(open) => !open && setQrTicket(null)}>
        <DialogContent className="bg-background text-foreground max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">{qrTicket?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {qrTicket?.token ? (
              <div className="bg-white p-5 rounded-2xl shadow-lg">
                <QRCodeSVG
                  value={qrTicket.token}
                  size={200}
                  level="H"
                  includeMargin={false}
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
    </div>
  );
};
