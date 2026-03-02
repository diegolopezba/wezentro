import { useNavigate } from "react-router-dom";
import { Plus, CalendarCheck, UtensilsCrossed, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface QuickActionsProps {
  onBoostClick?: () => void;
}

export const QuickActions = ({ onBoostClick }: QuickActionsProps) => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <Button
        variant="outline"
        size="sm"
        className="flex-shrink-0 gap-1.5 rounded-full border-primary/60 text-primary hover:bg-primary/10 hover:border-primary animate-[glow_2s_ease-in-out_infinite]"
        onClick={onBoostClick}
      >
        <Zap className="w-4 h-4" />
        Boost
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="flex-shrink-0 gap-1.5 rounded-full"
        onClick={() => navigate("/create")}
      >
        <Plus className="w-4 h-4" />
        Crear Evento
      </Button>

      {profile?.reservations_enabled && (
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 gap-1.5 rounded-full"
          onClick={() => navigate("/settings")}
        >
          <CalendarCheck className="w-4 h-4" />
          Reservas
        </Button>
      )}

      {profile?.menu_enabled && (
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 gap-1.5 rounded-full"
          onClick={() => navigate("/settings")}
        >
          <UtensilsCrossed className="w-4 h-4" />
          Menú
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        className="flex-shrink-0 gap-1.5 rounded-full"
        onClick={() => navigate("/profile")}
      >
        <User className="w-4 h-4" />
        Mi Perfil
      </Button>
    </div>
  );
};
