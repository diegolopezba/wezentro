import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { MessageCircle, StickyNote, Users, Clock, UserCheck, UserX, CheckCircle2 } from "lucide-react";
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
import { useCancelReservation, useSetReservationStatus, type ReservationWithGuests } from "@/hooks/useReservations";
import { useCreatePrivateChat } from "@/hooks/useChats";
import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

const STATUS_LABEL: Record<string, string> = {
  seated: "Sentada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No-show",
};

const dateLabel = (dateStr: string) => {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "EEEE d 'de' MMMM", { locale: es });
};

interface ReservationDetailSheetProps {
  reservation: ReservationWithGuests | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Detail + lifecycle actions for a single reservation, reused across views. */
export const ReservationDetailSheet = ({
  reservation,
  open,
  onOpenChange,
}: ReservationDetailSheetProps) => {
  const navigate = useNavigate();
  const cancelMutation = useCancelReservation();
  const statusMutation = useSetReservationStatus();
  const createChatMutation = useCreatePrivateChat();

  if (!reservation) return null;

  const guests = reservation.guests || [];
  const allPeople = [
    reservation.user ? { id: reservation.user.id, ...reservation.user } : null,
    ...guests.map((g) => (g.user ? { id: g.user.id, ...g.user } : null)),
  ].filter(Boolean) as { id: string; username: string; full_name: string | null; avatar_url: string | null }[];

  const handleMessage = () => {
    if (!reservation.user) return;
    createChatMutation.mutate(reservation.user.id, {
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
            {dateLabel(reservation.reservation_date)} · {reservation.reservation_time.slice(0, 5)}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {allPeople.slice(0, 4).map((p) => (
                <img
                  key={p.id}
                  src={p.avatar_url || DEFAULT_AVATAR}
                  alt={p.username}
                  className="w-9 h-9 rounded-full border-2 border-background object-cover bg-secondary"
                />
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {reservation.user?.full_name || reservation.user?.username || "Usuario"}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {reservation.party_size} personas
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {reservation.reservation_time.slice(0, 5)}
                </span>
              </p>
            </div>
          </div>

          {reservation.notes && (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {reservation.notes}
            </p>
          )}

          {reservation.status && reservation.status !== "confirmed" && (
            <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {STATUS_LABEL[reservation.status] ?? reservation.status}
            </span>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={statusMutation.isPending || reservation.status === "seated"}
              onClick={() =>
                statusMutation.mutate({ reservationId: reservation.id, status: "seated" })
              }
            >
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              Sentada
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({ reservationId: reservation.id, status: "completed" })
              }
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Completar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive border-destructive/30"
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({ reservationId: reservation.id, status: "no_show" })
              }
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
              disabled={createChatMutation.isPending || !reservation.user}
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1" />
              Mensaje
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-destructive border-destructive/30"
                >
                  Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se notificará al cliente que su reserva ha sido cancelada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Volver</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      cancelMutation.mutate(
                        { reservationId: reservation.id, cancelledBy: "business" },
                        { onSuccess: () => onOpenChange(false) }
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
