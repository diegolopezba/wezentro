import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { BillingForm } from "@/components/billing/BillingForm";
import { useBillingDetails } from "@/hooks/useBillingDetails";

export default function BillingSettings() {
  const navigate = useNavigate();
  const billing = useBillingDetails();
  return <AppLayout hideNav>
    <header className="sticky top-0 safe-top bg-background/80 backdrop-blur-lg flex items-center gap-3 p-4">
      <Button variant="ghost" size="icon" aria-label="Volver" onClick={() => navigate(-1)}><ChevronLeft /></Button>
      <h1 className="font-brand text-xl">Datos de facturación</h1>
    </header>
    {billing.isLoading ? <Loader2 className="mx-auto my-12 animate-spin" /> : billing.isError ? <div className="p-5 space-y-3"><p>No pudimos cargar tus datos.</p><Button onClick={() => billing.refetch()}>Reintentar</Button></div> : <BillingForm initial={billing.data} onSave={async (value) => { await billing.save(value); toast.success("Datos de facturación guardados"); }} />}
  </AppLayout>;
}