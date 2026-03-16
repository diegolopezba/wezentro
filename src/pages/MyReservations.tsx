import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, Users, X, UserCheck } from "lucide-react";
import { useCancelReservation } from "@/hooks/useReservations";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";
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

interface ReservationWithBusiness {
  id: string;
  business_id: string;
  user_id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  notes: string | null;
  status: string;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
  isTagged?: boolean;
  business: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const useAllReservations = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reservations", "all-combined", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const today = new Date().toISOString().split("T")[0];

      const [myRes, taggedGuests] = await Promise.all([
        supabase
          .from("reservations")
          .select("*, business:profiles!reservations_business_id_fkey(id, username, full_name, avatar_url)")
          .eq("user_id", user.id)
          .gte("reservation_date", today)
          .order("reservation_date", { ascending: true })
          .order("reservation_time", { ascending: true }),
        supabase
          .from("reservation_guests")
          .select("reservation_id")
          .eq("user_id", user.id),
      ]);

      if (myRes.error) throw myRes.error;

      let tagged: ReservationWithBusiness[] = [];
      if (taggedGuests.data && taggedGuests.data.length > 0) {
        const ids = taggedGuests.data.map((g) => g.reservation_id);
        const { data, error } = await supabase
          .from("reservations")
          .select("*, business:profiles!reservations_business_id_fkey(id, username, full_name, avatar_url)")
          .in("id", ids)
          .gte("reservation_date", today)
          .neq("status", "cancelled");
        if (error) throw error;
        tagged = (data as ReservationWithBusiness[]).map((r) => ({ ...r, isTagged: true }));
      }

      const mine = (myRes.data as ReservationWithBusiness[]) || [];
      const taggedIds = new Set(tagged.map((r) => r.id));
      const combined = [
        ...mine,
        ...tagged.filter((r) => !mine.find((m) => m.id === r.id)),
      ].sort((a, b) => {
        const dateCompare = a.reservation_date.localeCompare(b.reservation_date);
        return dateCompare !== 0 ? dateCompare : a.reservation_time.localeCompare(b.reservation_time);
      });

      return combined;
    },
    enabled: !!user?.id,
  });
};

const formatDateLabel = (dateStr: string) => {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "EEEE d 'de' MMMM", { locale: es });
};

const ReservationCard = ({
  reservation,
}: {
  reservation: ReservationWithBusiness;
}) => {
  const navigate = useNavigate();
  const cancelMutation = useCancelReservation();

  return (
    <div
      className="p-3 rounded-xl border bg-card space-y-2 cursor-pointer"
      onClick={() => navigate(`/reservation/${reservation.id}`)}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            reservation.business && navigate(`/user/${reservation.business.id}`);
          }}
          className="flex items-center gap-2"
        >
          <img
            src={reservation.business?.avatar_url || DEFAULT_AVATAR}
            alt=""
            className="w-8 h-8 rounded-full object-cover bg-secondary"
          />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">
              {reservation.business?.full_name || reservation.business?.username || "Negocio"}
            </p>
            <p className="text-xs text-muted-foreground">@{reservation.business?.username}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {reservation.isTagged && (
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              Invitado
            </span>
          )}
          {reservation.status === "cancelled" && (
            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
              Cancelada
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" />
          {formatDateLabel(reservation.reservation_date)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {reservation.reservation_time.slice(0, 5)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {reservation.party_size}
        </span>
      </div>

      {reservation.notes && (
        <p className="text-xs text-muted-foreground truncate">{reservation.notes}</p>
      )}

      {!reservation.isTagged && reservation.status !== "cancelled" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={(e) => e.stopPropagation()}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Cancelar reserva
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
              <AlertDialogDescription>
                Se notificará al negocio que tu reserva ha sido cancelada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => cancelMutation.mutate({ reservationId: reservation.id, cancelledBy: "user" })}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sí, cancelar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

const MyReservations = () => {
  const navigate = useNavigate();
  const { data: reservations, isLoading } = useAllReservations();

  return (
    <AppLayout>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">Mis Reservas</h1>
        </div>
      </header>

      <div className="px-4 pb-6 mt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !reservations || reservations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
            No tienes reservas próximas
          </div>
        ) : (
          reservations.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ReservationCard reservation={r} />
            </motion.div>
          ))
        )}
      </div>
    </AppLayout>
  );
};

export default MyReservations;
