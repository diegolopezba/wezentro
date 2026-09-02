import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, MapPin, MessageCircle, StickyNote, UserCheck, Users, UserX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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
import { useCreatePrivateChat } from "@/hooks/useChats";
import { useSetExperienceBookingStatus, type ExperienceBookingRow } from "@/hooks/useExperiences";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { EXPERIENCE_STATUS_LABEL, STATUS_STYLE } from "@/components/business/gestionShared";
import { cn } from "@/lib/utils";

const dateLabel = (dateStr: string) => {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "EEEE d 'de' MMMM", { locale: es });
};

interface Props {
  booking: ExperienceBookingRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Detail + lifecycle actions for a single experience booking (owner view). */
export const ExperienceBookingDetailSheet = ({ booking, open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const statusMutation = useSetExperienceBookingStatus();
  const createChatMutation = useCreatePrivateChat();

  if (!booking) return null;

  const people = [
    booking.user ? { ...booking.user } : null,
    ...(booking.guests || []).map((g) => (g.user ? { ...g.user } : null)),
  ].filter(Boolean) as { id: string; username: string; full_name: string | null; avatar_url: string | null }[];

  const handleMessage = () => {
    if (!booking.user) return;
    createChatMutation.mutate(booking.user.id, {
      onSuccess: (chatId) => {
        onOpenChange(false);
        navigate(`/chats/${chatId}`);
      },
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="light-sheet max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg font-brand capitalize">
            {dateLabel(booking.booking_date)} · {booking.booking_time.slice(0, 5)}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          <div>
            <p className="text-sm font-medium text-foreground">
              {booking.experience?.title || "Experiencia"}
              {booking.segment?.name ? ` · ${booking.segment.name}` : ""}
            </p>
            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {booking.experience?.duration_minutes ?? 0} min
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {booking.quantity} personas
              </span>
              <span className="font-medium text-foreground">
                {Number(booking.amount) > 0 ? `Bs. ${Number(booking.amount)}` : "Gratis"}
              </span>
            </p>
            {booking.experience?.location_note && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {booking.experience.location_note}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {people.slice(0, 4).map((p) => (
                <img
                  key={p.id}
                  src={p.avatar_url || DEFAULT_AVATAR}
                  alt={p.username}
                  className="w-9 h-9 rounded-full border-2 border-background object-cover bg-secondary"
                />
              ))}
            </div>
            <p className="text-sm font-medium text-foreground truncate">
              {booking.user?.full_name || booking.user?.username || "Usuario"}
            </p>
          </div>

          {booking.notes && (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {booking.notes}
            </p>
          )}

          {booking.status !== "confirmed" && (
            <span
              className={cn(
                "inline-block text-[11px] px-2 py-0.5 rounded-full font-medium",
                STATUS_STYLE[booking.status] ?? "bg-secondary text-muted-foreground",
              )}
            >
              {EXPERIENCE_STATUS_LABEL[booking.status] ?? booking.status}
            </span>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={statusMutation.isPending || booking.status === "seated"}
              onClick={() => statusMutation.mutate({ bookingId: booking.id, status: "seated" })}
            >
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              Comenzada
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ bookingId: booking.id, status: "completed" })}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Completar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive border-destructive/30"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ bookingId: booking.id, status: "no_show" })}
            >
              <UserX className="w-3.5 h-3.5 mr-1" />
              No-show
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleMessage}
              disabled={createChatMutation.isPending || !booking.user}
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1" />
              Mensaje
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 text-destructive border-destructive/30">
                  Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se notificará al cliente que su reserva fue cancelada y los cupos vuelven a liberarse.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Volver</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      statusMutation.mutate(
                        { bookingId: booking.id, status: "cancelled" },
                        { onSuccess: () => onOpenChange(false) },
                      )
                    }
                    className="bg-destructive text-destructive-foreground"
                  >
                    Sí, cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
