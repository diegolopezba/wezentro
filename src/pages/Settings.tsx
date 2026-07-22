import { m } from "framer-motion";
import { User, Shield, HelpCircle, LogOut, Bookmark, ChevronRight, ChevronLeft, Ticket, Calendar, Gift, UtensilsCrossed, Briefcase, Ban, Sparkles } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { ExperienceGoalSheet } from "@/components/profile/ExperienceGoalSheet";

interface SettingsItem {
  icon: React.ElementType;
  label: string;
  path: string;
  highlight?: boolean;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);

  const sections: SettingsSection[] = [
    {
      title: "Actividad",
      items: [
        { icon: Ticket, label: "Entradas", path: "/settings/tickets" },
        { icon: UtensilsCrossed, label: "Mis Reservas", path: "/settings/reservations" },
        { icon: Calendar, label: "Eventos Asistidos", path: "/settings/joined-events" },
        { icon: Bookmark, label: "Guardados", path: "/saved" },
      ],
    },
    {
      title: "Personal",
      items: [
        { icon: User, label: "Editar Perfil", path: "/edit-profile" },
        { icon: Sparkles, label: "Meta del año", path: "__experience_goal__" },
        { icon: Shield, label: "Privacidad", path: "/settings/privacy" },
        { icon: Ban, label: "Usuarios Bloqueados", path: "/settings/blocks" },
        { icon: Gift, label: "Invitar Amigos", path: "/settings/referrals" },
      ],
    },
    {
      title: "Business",
      items: [
        { icon: Briefcase, label: "Business", path: "/settings/business", highlight: true },
      ],
    },
    {
      title: "Soporte",
      items: [
        { icon: HelpCircle, label: "Ayuda y Soporte", path: "/settings/help" },
      ],
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sesión cerrada exitosamente");
    navigate("/auth");
  };

  let globalIndex = 0;

  return (
    <AppLayout hideNav>
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform [-webkit-tap-highlight-color:transparent]"
            aria-label="Volver"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-brand text-xl font-bold text-foreground">Configuración</h1>
        </div>
      </header>


      <div className="px-4 py-2 space-y-6 pb-8">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
              {section.title}
            </p>
            <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
              {section.items.map((item) => {
                const Icon = item.icon;
                const idx = globalIndex++;
                return (
                  <m.button
                    key={item.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => {
                      if (item.path === "__experience_goal__") setGoalSheetOpen(true);
                      else navigate(item.path);
                    }}
                    className="w-full flex items-center gap-4 py-3.5 px-4"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.highlight ? "bg-primary/15" : "bg-secondary"}`}>
                      <Icon className={`w-4 h-4 ${item.highlight ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className="font-medium flex-1 text-left text-sm text-foreground">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                  </m.button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <m.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 py-3.5 px-4"
          >
            <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-destructive" />
            </div>
            <span className="text-destructive font-medium flex-1 text-left text-sm">Cerrar Sesión</span>
          </m.button>
        </div>
      </div>
      <ExperienceGoalSheet open={goalSheetOpen} onOpenChange={setGoalSheetOpen} />
    </AppLayout>
  );
};

export default Settings;
