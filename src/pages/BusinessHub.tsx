import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BusinessPageContainer } from "@/components/layout/BusinessPageContainer";
import { cn } from "@/lib/utils";
import { ReservasGestionTab } from "@/components/business/ReservasGestionTab";
import { ExperienciasGestionTab } from "@/components/business/ExperienciasGestionTab";
import { EventosGestionTab } from "@/components/business/EventosGestionTab";

type Tab = "reservas" | "eventos" | "experiencias";

const TABS: { id: Tab; label: string }[] = [
  { id: "reservas", label: "Reservas" },
  { id: "eventos", label: "Eventos" },
  { id: "experiencias", label: "Experiencias" },
];

/** Business-account replacement for the consumer "Entradas" tab. */
const BusinessHub = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("reservas");

  return (
    <AppLayout>
      <header className="sticky top-0 z-30 safe-top bg-background/80 backdrop-blur-lg">
        <BusinessPageContainer className="px-4 pt-4 pb-3 lg:py-5">
          <div className="flex items-center justify-between lg:gap-6">
            <h1 className="font-brand text-xl font-medium text-foreground lg:text-2xl">Gestión</h1>
            <div className="hidden lg:flex items-center gap-2 flex-1">
              {TABS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTab(p.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors select-none active:scale-95",
                    tab === p.id
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground active:opacity-60"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Dashboard
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide lg:hidden">
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
        </BusinessPageContainer>
      </header>

      <BusinessPageContainer className="px-4 pt-2 pb-28 space-y-5 lg:pt-6">
        {tab === "reservas" && <ReservasGestionTab />}
        {tab === "eventos" && <EventosGestionTab />}
        {tab === "experiencias" && <ExperienciasGestionTab />}
      </BusinessPageContainer>
    </AppLayout>
  );
};

export default BusinessHub;
