import { SalesSummary } from "@/components/sales/SalesSummary";
import { SalesEvents } from "@/components/sales/SalesEvents";

export const SalesTab = () => (
  <div className="space-y-6">
    <SalesSummary />

    <section className="space-y-3">
      <h2 className="font-brand text-sm font-semibold text-foreground">Tickets por evento</h2>
      <SalesEvents />
    </section>
  </div>
);
