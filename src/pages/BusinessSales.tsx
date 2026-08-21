import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { SalesSummary } from "@/components/sales/SalesSummary";
import { SalesEvents } from "@/components/sales/SalesEvents";
import { SalesPromoters } from "@/components/sales/SalesPromoters";
import { FeatureIntroSheet, useFeatureIntro } from "@/components/business/FeatureIntroSheet";
import { SALES_PAYOUTS_INTRO } from "@/components/business/featureIntroSteps";

type Tab = "overview" | "events" | "promoters";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Resumen" },
  { key: "events", label: "Por evento" },
  { key: "promoters", label: "Promotores" },
];

const BusinessSales = () => {
  const navigate = useNavigate();
  const intro = useFeatureIntro("sales");
  const [tab, setTab] = useState<Tab>("overview");

  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate("/settings/business");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              aria-label="Volver"
              className="w-9 h-9 rounded-full grid place-items-center active:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-brand text-lg font-semibold text-foreground">Ventas y promotores</h1>
          </div>
          <button
            onClick={intro.reopen}
            aria-label="¿Cómo funciona?"
            className="w-9 h-9 rounded-full grid place-items-center active:bg-secondary transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-4">
        {tab === "overview" && <SalesSummary />}
        {tab === "events" && <SalesEvents />}
        {tab === "promoters" && <SalesPromoters />}
      </main>
      <FeatureIntroSheet open={intro.open} onOpenChange={intro.setOpen} steps={SALES_PAYOUTS_INTRO} />
    </div>
  );
};

export default BusinessSales;
