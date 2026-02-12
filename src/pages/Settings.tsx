import { motion } from "framer-motion";
import { User, Shield, CreditCard, HelpCircle, LogOut, Bookmark, ChevronRight, Ticket, Calendar, Gift, UtensilsCrossed, Briefcase } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const settingsItems = [
    {
      icon: Briefcase,
      label: "Business",
      path: "/settings/business",
      highlight: true,
    },
    {
      icon: Gift,
      label: "Invitar Amigos",
      path: "/settings/referrals"
    },
    {
      icon: UtensilsCrossed,
      label: "Mis Reservas",
      path: "/settings/reservations"
    },
    {
      icon: Ticket,
      label: "Entradas",
      path: "/settings/tickets"
    },
    {
      icon: Calendar,
      label: "Eventos Asistidos",
      path: "/settings/joined-events"
    },
    {
      icon: Bookmark,
      label: "Guardados",
      path: "/saved"
    },
    {
      icon: User,
      label: "Editar Perfil",
      path: "/edit-profile"
    },
    {
      icon: Shield,
      label: "Privacidad",
      path: "/settings/privacy"
    },
    {
      icon: CreditCard,
      label: "Suscripción",
      path: "/settings/subscription"
    },
    {
      icon: HelpCircle,
      label: "Ayuda y Soporte",
      path: "/settings/help"
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sesión cerrada exitosamente");
    navigate("/auth");
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <h1 className="font-brand text-xl font-bold text-foreground">Configuración</h1>
        </div>
      </header>

      <div className="px-4 py-2">
        <div className="divide-y divide-background">
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            const isHighlight = 'highlight' in item && item.highlight;
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-4 py-4 px-4 transition-colors mx-0 ${
                  isHighlight
                    ? "mb-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border border-blue-500/20 hover:from-blue-500/15 hover:to-indigo-500/10"
                    : "hover:bg-secondary/30"
                }`}
              >
                <Icon className={`w-5 h-5 ${isHighlight ? "text-blue-500" : "text-muted-foreground"}`} />
                <span className="text-foreground font-medium flex-1 text-left">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            );
          })}
        </div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 py-4 mt-8 px-4 transition-colors mx-0 bg-primary-foreground"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-destructive font-medium flex-1 text-left">Cerrar Sesión</span>
        </motion.button>
      </div>
    </AppLayout>
  );
};

export default Settings;
