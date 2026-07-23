import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useHasBeneficiary() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["qhantuy-beneficiary", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qhantuy_beneficiaries")
        .select("id")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  return {
    hasBeneficiary: query.data === true,
    isLoading: query.isLoading,
  };
}
