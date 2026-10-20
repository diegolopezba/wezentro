import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { billingSchema, type BillingDetails } from "@/lib/billing";

export function useBillingDetails() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["billing-details", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("user_billing_details").select("legal_name,document_type,document_number,phone").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data ? billingSchema.parse(data) : null;
    },
  });
  const save = async (details: BillingDetails) => {
    if (!user) throw new Error("Inicia sesión para guardar tus datos");
    const valid = billingSchema.parse(details);
    const { error } = await supabase.rpc("save_my_billing_details", {
      _legal_name: valid.legal_name, _document_type: valid.document_type,
      _document_number: valid.document_number, _phone: valid.phone,
    });
    if (error) throw new Error("No pudimos guardar tus datos. Intenta de nuevo.");
    qc.setQueryData(["billing-details", user.id], valid);
    await qc.invalidateQueries({ queryKey: ["missing-billing-orders"] });
  };
  return { ...query, save };
}