import { m } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  X,
  Users,
  MapPin,
  StickyNote,
  Check,
  Navigation,
  Trash2,
  Share2,
  Loader2,
  Clock,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useExperienceBookingDetail,
  useCancelExperienceBooking,
} from "@/hooks/useExperiences";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { useMemo, useState } from "react";
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const money = (n: number) => (n > 0 ? `Bs. ${n.toFixed(2)}` : "Gratis");

const ExperienceBookingConfirmation = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { data, isLoading, isError, refetch, isFetching } = useExperienceBookingDetail(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelMutation = useCancelExperienceBooking();

  const booking = data?.booking;
  const guests = data?.guests ?? [];
  const experience = booking?.experience;
  const business = booking?.business;

  const bookingStart = useMemo(() => {
    if (!booking) return null;
    return new Date(`${booking.booking_date}T${booking.booking_time}`);
  }, [booking]);

  const isPast = bookingStart ? bookingStart.getTime() < Date.now() : false;
  const cancelled = booking?.status === "cancelled";

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">No pudimos cargar tu reserva.</p>
        <div className="flex gap-2">
          <Button
            variant="default"
            className="rounded-full"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Intentar de nuevo
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => navigate("/tickets")}>
            Mis entradas
          </Button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">No se encontró esta reserva.</p>
        <Button variant="outline" className="rounded-full" onClick={() => navigate("/tickets")}>
          Volver a mis entradas
        </Button>
      </div>
    );
  }

  const formattedDate = format(parseISO(booking.booking_date), "EEE d 'de' MMM", { locale: es });
  const formattedTime = booking.booking_time.slice(0, 5);
  const confirmationCode = booking.id.slice(0, 4).toUpperCase();
  const qrImageUrl = `${SUPABASE_URL}/functions/v1/invite-qr?token=${encodeURIComponent(booking.check_in_token)}`;

  const handleDirections = () => {
    haptic("light");
    const query = business?.business_address
      ? encodeURIComponent(business.business_address)
      : null;
    if (!query) {
      toast.error("Sin dirección disponible");
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const handleShare = async () => {
    haptic("light");
    const text = `Mi reserva para ${experience?.title} — ${formattedDate} ${formattedTime} • Código ${confirmationCode}`;
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
    cancelMutation.mutate(booking.id, {
      onSuccess: () => {
        setCancelOpen(false);
        window.history.length > 1 ? navigate(-1) : navigate("/tickets");
      },
    });
  };

  const visibleGuests = guests.slice(0, 5);
  const extraGuests = guests.length - visibleGuests.length;

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      {/* Ambient glow background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between p-4 safe-top">
        <Button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/tickets"))}
          variant="ghost"
          size="icon"
          className="bg-card/60 backdrop-blur-md text-foreground rounded-full border border-border/50"
        >
          <X className="w-5 h-5" />
        </Button>
        <Button
          onClick={handleShare}
          variant="ghost"
          size="icon"
          className="bg-card/60 backdrop-blur-md text-foreground rounded-full border border-border/50"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 px-5 pb-10 safe-bottom max-w-md mx-auto">
        {/* Status badge */}
        <m.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-3 pt-4 pb-8"
        >
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center border",
              cancelled
                ? "bg-destructive/10 border-destructive/30"
                : "bg-emerald-500/15 border-emerald-500/30"
            )}
          >
            {cancelled ? (
              <X className="w-8 h-8 text-destructive" strokeWidth={3} />
            ) : (
              <Check className="w-8 h-8 text-emerald-400" strokeWidth={3} />
            )}
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {cancelled ? "Reserva cancelada" : "Reserva confirmada"}
          </p>
        </m.div>

        {/* Pass card */}
        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative rounded-3xl bg-card/70 backdrop-blur-xl border border-border/60 overflow-hidden shadow-2xl"
        >
          {/* Top: experience + business */}
          <button
            onClick={() => business && navigate(`/user/${business.id}`)}
            className="w-full p-5 flex items-center gap-3 text-left active:bg-muted/30 transition-colors"
          >
            {experience?.image_url ? (
              <img
                src={experience.image_url}
                alt=""
                className="w-12 h-12 rounded-2xl object-cover border border-border/60"
              />
            ) : (
              <img
                src={business?.avatar_url || DEFAULT_AVATAR}
                alt=""
                className="w-12 h-12 rounded-2xl object-cover border border-border/60"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-brand text-lg font-semibold truncate">
                {experience?.title || "Experiencia"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {business?.full_name || business?.username || "Negocio"}
              </p>
              {experience?.location_note && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{experience.location_note}</span>
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
                <p className="font-brand text-xl font-semibold capitalize">{formattedDate}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Hora
                </p>
                <p className="font-brand text-xl font-semibold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  {formattedTime}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Personas
                </p>
                <p className="font-brand text-xl font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  {booking.quantity}
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
              {booking.segment?.name && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Opción
                  </p>
                  <p className="font-brand text-base font-semibold flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    {booking.segment.name}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Total pagado
                </p>
                <p className="font-brand text-base font-semibold">
                  {money(Number(booking.amount))}
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
                  alt=""
                  className="w-7 h-7 rounded-full object-cover"
                />
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
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border-2 border-card"
                      />
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
            {booking.notes && (
              <div className="pt-4 border-t border-border/40">
                <div className="flex gap-2 p-3 rounded-xl bg-muted/40 border border-border/40">
                  <StickyNote className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/90 italic">"{booking.notes}"</p>
                </div>
              </div>
            )}
          </div>

          {/* Check-in QR */}
          {!cancelled && !isPast && (
            <>
              <div className="relative h-px">
                <div className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-background" />
                <div className="absolute -right-2 -top-2 w-4 h-4 rounded-full bg-background" />
                <div className="border-t border-dashed border-border/60 mx-3" />
              </div>
              <div className="p-5 flex flex-col items-center">
                <img
                  src={qrImageUrl}
                  alt={`QR de check-in para ${experience?.title}`}
                  className="w-48 h-48 rounded-2xl bg-white object-contain p-2"
                />
                <p className="mt-3 text-[11px] text-muted-foreground text-center">
                  Mostrá este código al llegar para confirmar tu asistencia
                </p>
              </div>
            </>
          )}
        </m.div>

        {/* Quick actions */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="grid grid-cols-1 gap-2 mt-4"
        >
          <button
            onClick={handleDirections}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card/60 backdrop-blur-md border border-border/50 active:scale-[0.97] transition-transform"
          >
            <Navigation className="w-5 h-5 text-foreground" />
            <span className="text-[11px] font-medium">Cómo llegar</span>
          </button>
        </m.div>

        {/* Cancel */}
        {!cancelled && !isPast && (
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.3 }}
            className="mt-2"
          >
            <Button
              onClick={() => setCancelOpen(true)}
              variant="outline"
              className="w-full rounded-2xl h-11 bg-transparent text-destructive border-destructive/40"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Cancelar reserva
            </Button>
          </m.div>
        )}
      </div>

      {/* Cancel confirm */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El negocio será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Sí, cancelar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </m.div>
  );
};

export default ExperienceBookingConfirmation;
