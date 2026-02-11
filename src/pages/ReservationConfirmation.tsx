import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { X, CalendarDays, Clock, Users, MapPin, StickyNote, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useReservationDetail } from "@/hooks/useReservations";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { useState } from "react";
import { MenuSheet } from "@/components/menu/MenuSheet";

const ReservationConfirmation = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { data, isLoading } = useReservationDetail(id);
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="animate-pulse text-foreground">Cargando...</div>
      </div>
    );
  }

  const { reservation, guests } = data;
  const business = reservation.business;
  const formattedDate = format(parseISO(reservation.reservation_date), "EEEE, d 'de' MMMM", { locale: es });
  const formattedTime = reservation.reservation_time.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
    >
      {/* Background - business avatar or gradient */}
      <div className="absolute inset-0">
        {business?.avatar_url ? (
          <img
            src={business.avatar_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-600" />
        )}
      </div>

      {/* Close button */}
      <div className="absolute top-0 right-0 safe-top z-20 p-4">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="icon"
          className="bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="px-6 pt-8 pb-6 safe-bottom"
        >
          <div className="text-center space-y-4">
            {/* User name */}
            <h1 className="text-4xl font-bold font-brand text-white">
              {profile?.full_name || profile?.username || "Invitado"}
            </h1>

            {/* Business name */}
            {business && (
              <button
                onClick={() => navigate(`/user/${business.id}`)}
                className="flex items-center justify-center gap-2 text-white/80"
              >
                <img
                  src={business.avatar_url || DEFAULT_AVATAR}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
                <p className="text-sm font-medium">
                  {business.full_name || business.username}
                </p>
              </button>
            )}

            {/* Business location */}
            {business?.business_address && (
              <div className="flex items-center justify-center gap-2 text-white/70">
                <MapPin className="w-4 h-4" />
                <p className="text-sm">{business.business_address}</p>
              </div>
            )}

            {/* Date / Time / Party size */}
            <div className="flex items-center justify-center gap-4 text-white/80">
              <span className="flex items-center gap-1.5 text-sm">
                <CalendarDays className="w-4 h-4" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <Clock className="w-4 h-4" />
                {formattedTime}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <Users className="w-4 h-4" />
                {reservation.party_size}
              </span>
            </div>

            {/* Tagged guests */}
            {guests && guests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-white/60 uppercase tracking-wider">Invitados</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {guests.map((guest) => (
                    <button
                      key={guest.user_id}
                      onClick={() => navigate(`/user/${guest.user_id}`)}
                      className="flex flex-col items-center gap-1"
                    >
                      <img
                        src={guest.user?.avatar_url || DEFAULT_AVATAR}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
                      />
                      <span className="text-xs text-white/70">
                        @{guest.user?.username || "user"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {reservation.notes && (
              <div className="flex items-center justify-center gap-2 text-white/60">
                <StickyNote className="w-3.5 h-3.5" />
                <p className="text-xs">{reservation.notes}</p>
              </div>
            )}

            {/* Menu button */}
            {business && (
              <div className="pt-4">
                <Button
                  onClick={() => setMenuOpen(true)}
                  className="w-full bg-white text-black hover:bg-white/90 rounded-xl font-semibold"
                  size="lg"
                >
                  <UtensilsCrossed className="w-4 h-4 mr-2" />
                  Ver Menú
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Menu Sheet */}
      {business && (
        <MenuSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          userId={business.id}
          businessName={business.full_name || business.username}
        />
      )}
    </motion.div>
  );
};

export default ReservationConfirmation;
