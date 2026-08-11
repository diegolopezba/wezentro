import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Dashboard access requires TWO conditions:
 *  1. profiles.is_business = true
 *  2. a qhantuy_beneficiaries row with a non-null beneficiary_code (payout setup done)
 */
export function useDashboardAccess() {
  const { user, profile } = useAuth();
  const isBusiness = profile?.is_business === true;

  const query = useQuery({
    queryKey: ["dashboard-payout-setup", user?.id],
    enabled: !!user?.id && isBusiness,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qhantuy_beneficiaries")
        .select("beneficiary_code")
        .eq("user_id", user!.id)
        .not("beneficiary_code", "is", null)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return !!data?.beneficiary_code;
    },
  });

  return {
    isBusiness,
    hasPayouts: query.data === true,
    canAccess: isBusiness && query.data === true,
    isLoading: !profile || (isBusiness && query.isLoading),
  };
}
