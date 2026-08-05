import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { TicketsList } from "@/components/tickets/TicketsList";
import { ReservationsList } from "@/components/tickets/ReservationsList";

type Tab = "entradas" | "reservas";

const MyTickets = () => {
  const [tab, setTab] = useState<Tab>("entradas");

  return (
    <AppLayout>
      <header className="sticky top-0 z-30 safe-top bg-background/80 backdrop-blur-lg">
        <div className="px-4 pt-4 pb-3">
          <h1 className="font-brand text-xl font-bold text-foreground">Entradas</h1>
          <div className="flex items-center gap-2 mt-3">
            {([
              { id: "entradas", label: "Entradas" },
              { id: "reservas", label: "Reservas" },
            ] as const).map((p) => (
              <button
                key={p.id}
                onClick={() => setTab(p.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold transition-colors select-none [-webkit-tap-highlight-color:transparent] active:scale-95",
                  tab === p.id
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {tab === "entradas" ? <TicketsList /> : <ReservationsList />}
    </AppLayout>
  );
};

export default MyTickets;
