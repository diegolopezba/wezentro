import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock, Users, X, UserCheck } from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import {
  useCancelExperienceBooking,
  type MyExperienceBooking,
} from "@/hooks/useExperiences";

const formatDateLabel = (dateStr: string) => {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "EEEE d 'de' MMMM", { locale: es });
};

const money = (n: number) => (n > 0 ? `Bs. ${n.toFixed(2)}` : "Gratis");

export const ExperienceBookingCard = ({
  booking,
  isPast = false,
}: {
  booking: MyExperienceBooking;
  isPast?: boolean;
}) => {
  const navigate = useNavigate();
  const cancelMutation = useCancelExperienceBooking();

  const cancelled = booking.status === "cancelled";

  return (
    <div
      className={cn(
        "p-3 rounded-xl border bg-card space-y-2 cursor-pointer",
        isPast && "opacity-60"
      )}
      onClick={() => navigate(`/experience-booking/${booking.id}`)}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (booking.business) navigate(`/user/${booking.business.id}`);
          }}
          className="flex items-center gap-2"
        >
          {booking.experience?.image_url ? (
            <img
              src={booking.experience.image_url}
              alt=""
              className="w-8 h-8 rounded-lg object-cover bg-secondary"
            />
          ) : (
            <img
              src={booking.business?.avatar_url || DEFAULT_AVATAR}
              alt=""
              className="w-8 h-8 rounded-full object-cover bg-secondary"
            />
          )}
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">
              {booking.experience?.title || "Experiencia"}
            </p>
            <p className="text-xs text-muted-foreground">
              {booking.business?.full_name || booking.business?.username || "Negocio"}
              {booking.segment?.name ? ` · ${booking.segment.name}` : ""}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {booking.isTagged && (
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              Invitado
            </span>
          )}
          {cancelled ? (
            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
              Cancelada
            </span>
          ) : isPast ? (
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
              Finalizada
            </span>
          ) : (
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
              {money(Number(booking.amount))}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" />
          {formatDateLabel(booking.booking_date)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {booking.booking_time.slice(0, 5)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {booking.quantity}
        </span>
      </div>

      {booking.notes && (
        <p className="text-xs text-muted-foreground truncate">{booking.notes}</p>
      )}

      {!isPast && !booking.isTagged && !cancelled && (
        <div className="flex gap-2 pt-1">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-destructive border-destructive/30"
                onClick={(e) => e.stopPropagation()}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancelar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se notificará al negocio que tu reserva de experiencia ha sido cancelada.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => cancelMutation.mutate(booking.id)}
                  className="bg-destructive text-destructive-foreground"
                >
                  Sí, cancelar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
};
