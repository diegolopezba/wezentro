import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Users, CalendarDays, Clock, MessageCircle, X, StickyNote } from "lucide-react";
import { useBusinessReservations, useCancelReservation, useReservationGuests } from "@/hooks/useReservations";
import { useCreatePrivateChat } from "@/hooks/useChats";
import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
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

interface ReservationsManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export const ReservationsManagementSheet = ({
  open,
  onOpenChange,
  businessId,
}: ReservationsManagementSheetProps) => {
  const navigate = useNavigate();
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const { data: reservations, isLoading } = useBusinessReservations(businessId);
  const cancelMutation = useCancelReservation();
  const createChatMutation = useCreatePrivateChat();

  const filteredReservations = filterDate
    ? reservations?.filter(
        (r) => r.reservation_date === format(filterDate, "yyyy-MM-dd")
      )
    : reservations;

  // Group by date
  const grouped = (filteredReservations || []).reduce(
    (acc, r) => {
      const date = r.reservation_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(r);
      return acc;
    },
    {} as Record<string, typeof filteredReservations>
  );

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoy";
    if (isTomorrow(date)) return "Mañana";
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  };

  const handleMessage = (userId: string) => {
    createChatMutation.mutate(userId, {
      onSuccess: (chatId) => {
        onOpenChange(false);
        navigate(`/chats/${chatId}`);
      },
    });
  };

  const handleCancel = (reservationId: string) => {
    cancelMutation.mutate({ reservationId, cancelledBy: "business" });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg font-brand">
            Reservas
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {/* Date filter */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarDays className="w-4 h-4" />
                  {filterDate
                    ? format(filterDate, "dd/MM/yyyy")
                    : "Filtrar por fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            {filterDate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFilterDate(undefined)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Reservations list */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredReservations || filteredReservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay reservas próximas
            </div>
          ) : (
            Object.entries(grouped).map(([date, items]) => (
              <div key={date} className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground capitalize">
                  {formatDateLabel(date)}
                </h3>
                {items!.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="p-3 rounded-xl border bg-card space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={reservation.user?.avatar_url || DEFAULT_AVATAR}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover bg-secondary"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {reservation.user?.full_name ||
                              reservation.user?.username ||
                              "Usuario"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {reservation.user?.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {reservation.reservation_time.slice(0, 5)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {reservation.party_size} personas
                      </span>
                      {reservation.notes && (
                        <span className="flex items-center gap-1">
                          <StickyNote className="w-3.5 h-3.5" />
                          {reservation.notes}
                        </span>
                      )}
                    </div>

                    <ReservationGuestAvatars reservationId={reservation.id} />

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          reservation.user &&
                          handleMessage(reservation.user.id)
                        }
                        disabled={createChatMutation.isPending}
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1" />
                        Mensaje
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            Cancelar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              ¿Cancelar esta reserva?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Se notificará al cliente que su reserva ha sido
                              cancelada.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Volver</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancel(reservation.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Sí, cancelar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const ReservationGuestAvatars = ({ reservationId }: { reservationId: string }) => {
  const { data: guests } = useReservationGuests(reservationId);
  if (!guests || guests.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Invitados:</span>
      <div className="flex -space-x-1.5">
        {guests.map((g) => (
          <img
            key={g.user_id}
            src={(g.user as any)?.avatar_url || DEFAULT_AVATAR}
            alt={(g.user as any)?.username || ""}
            title={`@${(g.user as any)?.username}`}
            className="w-5 h-5 rounded-full border border-background object-cover"
          />
        ))}
      </div>
    </div>
  );
};
