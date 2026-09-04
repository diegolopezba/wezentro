import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Users, CalendarDays, Clock, X, StickyNote, UserCheck, UserX, CheckCircle2 } from "lucide-react";
import { useBusinessReservations, useCancelReservation, useReservationGuests, useSetReservationStatus } from "@/hooks/useReservations";
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

const STATUS_LABEL: Record<string, string> = {
  seated: "Sentada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No-show",
};

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
  const statusMutation = useSetReservationStatus();

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

  const handleCancel = (reservationId: string) => {
    cancelMutation.mutate({ reservationId, cancelledBy: "business" });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="light-sheet max-h-[90vh]">
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
                  mode="single" selected={filterDate}
                  onSelect={setFilterDate}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            {filterDate && (
              <Button
                variant="ghost" size="icon" onClick={() => setFilterDate(undefined)}
                className="h-8 w-8" >
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
                    className="p-3 rounded-xl border bg-card space-y-2" >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={reservation.user?.avatar_url || DEFAULT_AVATAR}
                          alt="" className="w-8 h-8 rounded-full object-cover bg-secondary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {reservation.user?.full_name ||
                              reservation.user?.username || "Usuario"}
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

                    {(reservation as any).status &&
                      (reservation as any).status !== "confirmed" && (
                        <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {STATUS_LABEL[(reservation as any).status as string] ??
                            (reservation as any).status}
                        </span>
                      )}

                    {/* Lifecycle actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={
                          statusMutation.isPending ||
                          (reservation as any).status === "seated"
                        }
                        onClick={() =>
                          statusMutation.mutate({
                            reservationId: reservation.id,
                            status: "seated",
                          })
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
                          statusMutation.mutate({
                            reservationId: reservation.id,
                            status: "completed",
                          })
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
                          statusMutation.mutate({
                            reservationId: reservation.id,
                            status: "no_show",
                          })
                        }
                      >
                        <UserX className="w-3.5 h-3.5 mr-1" />
                        No-show
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline" size="sm" className="flex-1 text-destructive border-destructive/30 " >
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
                              className="bg-destructive text-destructive-foreground " >
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
            className="w-5 h-5 rounded-full border border-background object-cover" />
        ))}
      </div>
    </div>
  );
};
