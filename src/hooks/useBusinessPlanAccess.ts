import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public check: does this business have an active (or in-grace) plan?
 * business_subscriptions is owner-only under RLS, so visitors resolve it
 * through a security-definer function.
 */
export const useBusinessPlanAccess = (businessId?: string, enabled = true) => {
  const { data, isLoading } = useQuery({
    queryKey: ["business-plan-active", businessId],
    enabled: !!businessId && enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_active_business_plan", {
        _business_id: businessId!,
      });
      if (error) throw error;
      return data === true;
    },
  });

  return { hasActivePlan: data === true, isLoading };
};
