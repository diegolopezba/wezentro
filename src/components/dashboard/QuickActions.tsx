import { useNavigate } from "react-router-dom";
import { Plus, CalendarCheck, UtensilsCrossed, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const QuickActions = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const actions = [
    { label: "Crear Evento", icon: Plus, path: "/create" },
    ...(profile?.reservations_enabled
      ? [{ label: "Reservas", icon: CalendarCheck, path: "/settings" }]
      : []),
    ...(profile?.menu_enabled
      ? [{ label: "Menú", icon: UtensilsCrossed, path: "/settings" }]
      : []),
    { label: "Mi Perfil", icon: User, path: "/profile" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          className="flex-shrink-0 gap-1.5 rounded-full"
          onClick={() => navigate(action.path)}
        >
          <action.icon className="w-4 h-4" />
          {action.label}
        </Button>
      ))}
    </div>
  );
};
