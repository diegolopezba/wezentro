import { motion } from "framer-motion";
import { User, Shield, CreditCard, HelpCircle, LogOut, Bookmark, ChevronRight, Ticket, BarChart3, Calendar, Gift, UtensilsCrossed } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: subscription } = useUserSubscription();

  const isBusiness = subscription?.plan_type === "business_premium";

  const handleDashboardClick = () => {
    if (isBusiness) {
      navigate("/dashboard");
    } else {
      toast.info("Solo disponible para usuarios Zentro Business", {
        action: {
          label: "Ver planes",
          onClick: () => navigate("/settings/subscription"),
        },
      });
    }
  };

  const settingsItems = [
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
        {/* Business Dashboard - Always visible, with upsell for non-business */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleDashboardClick}
          className="w-full flex items-center gap-4 py-4 px-4 transition-colors mx-0 mb-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:from-primary/15 hover:to-primary/10"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <span className="text-foreground font-semibold block">Business Dashboard</span>
            <span className="text-xs text-muted-foreground">Analytics e insights</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.button>

        <div className="divide-y divide-background">
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + 1) * 0.05 }}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-4 py-4 hover:bg-secondary/30 px-4 transition-colors mx-0"
              >
                <Icon className="w-5 h-5 text-muted-foreground" />
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
