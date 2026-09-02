import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Sparkles, ChevronRight, CalendarCheck, UtensilsCrossed } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { ReservasGestionTab } from "@/components/business/ReservasGestionTab";
import { SalesTab } from "@/components/dashboard/SalesTab";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";

type Tab = "reservas" | "ventas" | "experiencias";

const TABS: { id: Tab; label: string }[] = [
  { id: "reservas", label: "Reservas" },
  { id: "ventas", label: "Ventas" },
  { id: "experiencias", label: "Experiencias" },
];

/** Business-account replacement for the consumer "Entradas" tab. */
const BusinessHub = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("reservas");

  return (
    <AppLayout>
      <header className="sticky top-0 z-30 safe-top bg-background/80 backdrop-blur-lg">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="font-brand text-xl font-medium text-foreground">Gestión</h1>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground active:opacity-60"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Dashboard
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide">
            {TABS.map((p) => (
              <button
                key={p.id}
                onClick={() => setTab(p.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors select-none [-webkit-tap-highlight-color:transparent] active:scale-95",
                  tab === p.id
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 pt-2 pb-28 space-y-5">
        {tab === "reservas" && <ReservasTab period={period} onPeriodChange={setPeriod} />}
        {tab === "ventas" && <SalesTab />}
        {tab === "experiencias" && (
          <SettingsGroup title="Tus herramientas">
            <SettingsRow
              icon={Sparkles}
              label="Experiencias"
              sublabel="Creá y editá tours, clases y actividades"
              onClick={() => navigate("/settings/business/experiences")}
            />
            <SettingsRow
              icon={CalendarCheck}
              label="Configurar reservas"
              sublabel="Mesas, horarios y reglas"
              onClick={() => navigate("/settings/business/reservations")}
              delay={0.03}
            />
            <SettingsRow
              icon={UtensilsCrossed}
              label="Menú"
              sublabel="Editá tu carta"
              onClick={() => navigate("/settings/business/menu")}
              delay={0.06}
            />
            <SettingsRow
              icon={ChevronRight}
              label="Ajustes Business"
              sublabel="Información, plan y pagos"
              onClick={() => navigate("/settings/business")}
              delay={0.09}
            />
          </SettingsGroup>
        )}
      </div>
    </AppLayout>
  );
};

export default BusinessHub;
