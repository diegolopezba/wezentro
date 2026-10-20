import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function MissingBillingNotice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["missing-billing-orders", user?.id], enabled: !!user,
    queryFn: async () => { const { data, error } = await supabase.rpc("get_my_missing_billing_orders"); if (error) throw error; return data; },
  });
  if (!data) return null;
  return <section className="px-5 py-4 space-y-2 bg-secondary text-foreground">
    <p className="text-sm font-semibold">Completa tus datos de facturación</p>
    <p className="text-xs text-muted-foreground">Hay {data} {data === 1 ? "compra anterior sin datos fiscales" : "compras anteriores sin datos fiscales"}. Tus entradas y sus QR siguen disponibles.</p>
    <Button variant="save" onClick={() => navigate("/settings/billing")}>Completar datos</Button>
  </section>;
}