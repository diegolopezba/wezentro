import { useState } from "react";
import { m } from "framer-motion";
import { Store, X, User, Shield, HelpCircle, LogOut, Bookmark, ChevronLeft, Gift, Briefcase, Ban, BarChart3, Wallet } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { toast } from "sonner";

interface SettingsItem {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  path: string;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

const Settings = () => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { isBusiness, hasPayouts } = useDashboardAccess();
  const [businessPromoDismissed, setBusinessPromoDismissed] = useState(
    () => localStorage.getItem("business-promo-dismissed") === "1",
  );

  const dismissBusinessPromo = () => {
    localStorage.setItem("business-promo-dismissed", "1");
    setBusinessPromoDismissed(true);
  };

  const businessItems: SettingsItem[] = [
    { icon: Briefcase, label: "Business", path: "/settings/business" },
  ];

  if (isBusiness && hasPayouts) {
    businessItems.push({
      icon: BarChart3,
      label: "Dashboard",
      sublabel: "Analíticas, ventas y reservas",
      path: "/dashboard",
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

      <div className="px-4 py-2 space-y-5 pb-8">
        {/* Profile row */}
        <SettingsGroup>
          <SettingsRow
            label={profile?.full_name || profile?.username || "Mi perfil"}
            sublabel={profile?.username}
            onClick={() => navigate("/edit-profile")}
            left={
              <img
                src={profile?.avatar_url || DEFAULT_AVATAR}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            }
          />
        </SettingsGroup>

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
          <SettingsGroup key={section.title} title={section.title}>
            {section.items.map((item) => {
              const idx = globalIndex++;
              return (
                <SettingsRow
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  sublabel={item.sublabel}
                  onClick={() => navigate(item.path)}
                  delay={idx * 0.03}
                />
              );
            })}
          </SettingsGroup>
        ))}

        <SettingsGroup>
          <SettingsRow
            icon={LogOut}
            label="Cerrar Sesión"
            onClick={handleSignOut}
            destructive
            right={<span />}
            delay={0.3}
          />
        </SettingsGroup>
      </div>
    </AppLayout>
  );
};

export default Settings;
