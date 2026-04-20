import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  X,
  Users,
  MapPin,
  StickyNote,
  UtensilsCrossed,
  Check,
  Navigation,
  MessageCircle,
  Pencil,
  Trash2,
  Share2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useReservationDetail,
  useCancelReservation,
} from "@/hooks/useReservations";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { useMemo, useState } from "react";
import { MenuSheet } from "@/components/menu/MenuSheet";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import { useCreatePrivateChat } from "@/hooks/useChats";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const ReservationConfirmation = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { data, isLoading } = useReservationDetail(id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelMutation = useCancelReservation();
  const createChat = useCreatePrivateChat();

  const reservationStart = useMemo(() => {
    if (!data) return null;
    const r = data.reservation;
    return new Date(`${r.reservation_date}T${r.reservation_time}`);
  }, [data]);

  const canModify = useMemo(() => {
    if (!reservationStart) return false;
    return reservationStart.getTime() - Date.now() > 2 * 60 * 60 * 1000;
  }, [reservationStart]);

  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { reservation, guests } = data;
  const business = reservation.business;
  const formattedDate = format(parseISO(reservation.reservation_date), "EEE d 'de' MMM", { locale: es });
  const formattedTime = reservation.reservation_time.slice(0, 5);
  const confirmationCode = reservation.id.slice(0, 4).toUpperCase();

  const handleDirections = () => {
    haptic("light");
    const query = business?.business_address
      ? encodeURIComponent(business.business_address)
      : business?.business_latitude && business?.business_longitude
      ? `${business.business_latitude},${business.business_longitude}` : null;
    if (!query) {
      toast.error("Sin dirección disponible");
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const handleMessage = () => {
    if (!business?.id) return;
    haptic("light");
    createChat.mutate(business.id, {
      onSuccess: (chatId) => navigate(`/chats/${chatId}`),
      onError: () => toast.error("No se pudo iniciar el chat"),
    });
  };

  const handleShare = async () => {
    haptic("light");
    const text = `Mi reserva en ${business?.full_name || business?.username} — ${formattedDate} ${formattedTime} • Código ${confirmationCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mi reserva", text });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado al portapapeles");
    }
  };

  const handleCancel = () => {
    cancelMutation.mutate(
      { reservationId: reservation.id, cancelledBy: "user" },
      {
        onSuccess: () => {
          setCancelOpen(false);
          navigate(-1);
        },
      }
    );
  };

  const visibleGuests = guests?.slice(0, 5) ?? [];
  const extraGuests = (guests?.length ?? 0) - visibleGuests.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto" >
      {/* Ambient glow background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between p-4 safe-top">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost" size="icon" className="bg-card/60 backdrop-blur-md text-foreground rounded-full border border-border/50" >
          <X className="w-5 h-5" />
        </Button>
        <Button
          onClick={handleShare}
          variant="ghost" size="icon" className="bg-card/60 backdrop-blur-md text-foreground rounded-full border border-border/50" >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 px-5 pb-10 safe-bottom max-w-md mx-auto">
        {/* Success badge */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-3 pt-4 pb-8" >
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-400" strokeWidth={3} />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Reserva confirmada
          </p>
        </motion.div>

        {/* Pass card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative rounded-3xl bg-card/70 backdrop-blur-xl border border-border/60 overflow-hidden shadow-2xl" >
          {/* Top: business */}
          <button
            onClick={() => business && navigate(`/user/${business.id}`)}
            className="w-full p-5 flex items-center gap-3 text-left active:bg-muted/30 transition-colors" >
            <img
              src={business?.avatar_url || DEFAULT_AVATAR}
              alt="" className="w-12 h-12 rounded-2xl object-cover border border-border/60" />
            <div className="flex-1 min-w-0">
              <p className="font-brand text-lg font-semibold truncate">
                {business?.full_name || business?.username || "Restaurante"}
              </p>
              {business?.business_address && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{business.business_address}</span>
                </div>
              )}
            </div>
          </button>

          {/* Ticket perforation */}
          <div className="relative h-px">
            <div className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-background" />
            <div className="absolute -right-2 -top-2 w-4 h-4 rounded-full bg-background" />
            <div className="border-t border-dashed border-border/60 mx-3" />
          </div>

          {/* Details grid */}
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Fecha
                </p>
                <p className="font-brand text-xl font-semibold capitalize">
                  {formattedDate}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Hora
                </p>
                <p className="font-brand text-xl font-semibold">{formattedTime}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Personas
                </p>
                <p className="font-brand text-xl font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  {reservation.party_size}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Código
                </p>
                <p className="font-mono text-xl font-semibold tracking-widest text-primary">
                  #{confirmationCode}
                </p>
              </div>
            </div>

            {/* On behalf of */}
            <div className="pt-4 border-t border-border/40">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                A nombre de
              </p>
              <div className="flex items-center gap-2">
                <img
                  src={profile?.avatar_url || DEFAULT_AVATAR}
                  alt="" className="w-7 h-7 rounded-full object-cover" />
                <span className="text-sm font-medium">
                  {profile?.full_name || profile?.username || "Invitado"}
                </span>
              </div>
            </div>

            {/* Guests */}
            {visibleGuests.length > 0 && (
              <div className="pt-4 border-t border-border/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Invitados ({guests.length})
                </p>
                <div className="flex items-center">
                  {visibleGuests.map((g, i) => (
                    <button
                      key={g.user_id}
                      onClick={() => navigate(`/user/${g.user_id}`)}
                      className={cn("relative", i > 0 && "-ml-2")}
                      style={{ zIndex: visibleGuests.length - i }}
                    >
                      <img
                        src={g.user?.avatar_url || DEFAULT_AVATAR}
                        alt="" className="w-8 h-8 rounded-full object-cover border-2 border-card" />
                    </button>
                  ))}
                  {extraGuests > 0 && (
                    <div className="-ml-2 w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-semibold">
                      +{extraGuests}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {reservation.notes && (
              <div className="pt-4 border-t border-border/40">
                <div className="flex gap-2 p-3 rounded-xl bg-muted/40 border border-border/40">
                  <StickyNote className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/90 italic"> "{reservation.notes}" </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="grid grid-cols-2 gap-2 mt-4" >
          <button
            onClick={handleDirections}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card/60 backdrop-blur-md border border-border/50 active:scale-[0.97] transition-transform" >
            <Navigation className="w-5 h-5 text-foreground" />
            <span className="text-[11px] font-medium">Cómo llegar</span>
          </button>
          <button
            onClick={handleMessage}
            disabled={createChat.isPending}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card/60 backdrop-blur-md border border-border/50 active:scale-[0.97] transition-transform disabled:opacity-50" >
            {createChat.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <MessageCircle className="w-5 h-5 text-foreground" />
            )}
            <span className="text-[11px] font-medium">Mensaje</span>
          </button>
        </motion.div>

        {/* Primary CTA */}
        {business?.menu_enabled && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.3 }}
            className="mt-4" >
            <Button
              onClick={() => setMenuOpen(true)}
              className="w-full bg-primary text-primary-foreground rounded-2xl font-semibold h-12" >
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Ver Menú
            </Button>
          </motion.div>
        )}

        {/* Secondary actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.3 }}
          className="grid grid-cols-2 gap-2 mt-2" >
          <Button
            onClick={() => setEditOpen(true)}
            disabled={!canModify}
            variant="outline" className="rounded-2xl h-11 bg-transparent" >
            <Pencil className="w-4 h-4 mr-1.5" />
            Modificar
          </Button>
          <Button
            onClick={() => setCancelOpen(true)}
            variant="outline" className="rounded-2xl h-11 bg-transparent text-destructive border-destructive/40 " >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>
        </motion.div>

        {!canModify && (
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Solo puedes modificar con más de 2 horas de anticipación
          </p>
        )}
      </div>

      {/* Menu sheet */}
      {business && (
        <MenuSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          userId={business.id}
          businessName={business.full_name || business.username}
        />
      )}

      {/* Edit sheet */}
      {business && (
        <ReservationSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          businessId={business.id}
          businessName={business.full_name || business.username}
          editingReservation={{
            id: reservation.id,
            reservation_date: reservation.reservation_date,
            reservation_time: reservation.reservation_time,
            party_size: reservation.party_size,
            notes: reservation.notes,
          }}
        />
      )}

      {/* Cancel confirm */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El restaurante será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground " >
              {cancelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : ( "Sí, cancelar" )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ReservationConfirmation;
