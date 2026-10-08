import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CheckoutFeeTerms } from "@/lib/gatewayFee";

/** Fee terms of the seller (set by Zentro admins) so the buyer sees the exact total. */
export const useCheckoutFeeTerms = (ids: { eventId?: string; experienceId?: string }) =>
  useQuery({
    queryKey: ["checkout-fee-terms", ids.eventId ?? null, ids.experienceId ?? null],
    enabled: !!(ids.eventId || ids.experienceId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_checkout_fee_terms", {
        _event_id: ids.eventId ?? null,
        _experience_id: ids.experienceId ?? null,
      } as never);
      if (error) throw error;
      return (data ?? null) as CheckoutFeeTerms | null;
    },
  }).data ?? null;
