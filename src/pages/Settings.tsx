import { useState } from "react";
import { m } from "framer-motion";
import { Store, X, User, Shield, HelpCircle, LogOut, Bookmark, ChevronRight, ChevronLeft, Gift, Briefcase, Ban, BarChart3, Wallet } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { toast } from "sonner";


interface SettingsItem {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
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
  const { isBusiness, hasPayouts } = useDashboardAccess();
  const [businessPromoDismissed, setBusinessPromoDismissed] = useState(
    () => localStorage.getItem("business-promo-dismissed") === "1",
  );

  const dismissBusinessPromo = () => {
    localStorage.setItem("business-promo-dismissed", "1");
    setBusinessPromoDismissed(true);
  };

  const businessItems: SettingsItem[] = [
    { icon: Briefcase, label: "Business", path: "/settings/business", highlight: true },
  ];

  if (isBusiness && hasPayouts) {
    businessItems.push({
      icon: BarChart3,
      label: "Dashboard",
      sublabel: "Analíticas, ventas y reservas",
      path: "/dashboard",
      highlight: true,
    });
  } else if (isBusiness) {
    businessItems.push({
      icon: Wallet,
      label: "Desbloquea tu dashboard",
      sublabel: "Termina de configurar tus pagos",
      path: "/settings/business/payments",
    });
  }

  const sections: SettingsSection[] = [
    {
      title: "Personal",
      items: [
        { icon: User, label: "Editar Perfil", path: "/edit-profile" },
        { icon: Bookmark, label: "Guardados", path: "/saved" },
        { icon: Shield, label: "Privacidad", path: "/settings/privacy" },
        { icon: Ban, label: "Usuarios Bloqueados", path: "/settings/blocks" },
        { icon: Gift, label: "Invitar Amigos", path: "/settings/referrals" },
      ],
    },
    {
      title: "Business",
      items: businessItems,
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
          <h1 className="font-brand text-xl font-medium text-foreground">Configuración</h1>
        </div>
      </header>


      <div className="px-4 py-2 space-y-6 pb-8">
        {!isBusiness && !businessPromoDismissed && (
          <m.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl border border-border bg-card p-4"
          >
            <button
              onClick={dismissBusinessPromo}
              className="absolute right-3 top-3 text-muted-foreground active:opacity-60"
              aria-label="Descartar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Store className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-brand text-base font-medium text-foreground">
                  ¿Tenés un local?
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                  Recibí reservas, vendé entradas y mostrá tu menú desde tu perfil.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/settings/business", { state: { intro: true } })}
              className="mt-3 w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background active:opacity-80"
            >
              Conocer cuenta Business
            </button>
          </m.div>
        )}

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
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-4 py-3.5 px-4"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.highlight ? "bg-primary/15" : "bg-secondary"}`}>
                      <Icon className={`w-4 h-4 ${item.highlight ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className="flex-1 text-left min-w-0">
                      <span className="block font-medium text-sm text-foreground">{item.label}</span>
                      {item.sublabel && (
                        <span className="block text-xs text-muted-foreground">{item.sublabel}</span>
                      )}
                    </span>

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
      
    </AppLayout>
  );
};

export default Settings;
