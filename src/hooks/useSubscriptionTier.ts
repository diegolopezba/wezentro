import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isFoodBusinessType } from "@/lib/businessTypes";
import {
  FeatureKey,
  TierKey,
  tierHasFeature,
  SUBSCRIPTION_TIERS,
} from "@/lib/subscriptionTiers";

export type SubscriptionStatus =
  | "active"
  | "pending_activation"
  | "past_due"
  | "cancelled";

export interface BusinessSubscription {
  tier: TierKey;
  status: SubscriptionStatus;
  billing_period_start: string | null;
  billing_period_end: string | null;
  activation_method: "manual" | "qhantuy";
  notes: string | null;
}

/**
 * Current plan for a business + a feature lookup helper.
 * Businesses outside the food categories are not part of this system: for them
 * hasFeature() always returns true so nothing existing gets gated.
 */
export const useSubscriptionTier = (businessId?: string) => {
  const { profile } = useAuth();
  const isOwnProfile = !!businessId && profile?.id === businessId;
  const isFood = isOwnProfile
    ? isFoodBusinessType((profile as any)?.business_type)
    : true;

  const { data, isLoading } = useQuery({
    queryKey: ["business-subscription", businessId],
    enabled: !!businessId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_subscriptions" as any)
        .select(
          "tier, status, billing_period_start, billing_period_end, activation_method, notes"
        )
        .eq("business_id", businessId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as BusinessSubscription) || null;
    },
  });

  const isSubscriptionGated = isOwnProfile ? isFood : true;
  const tier: TierKey =
    data?.status === "active" || data?.status === "past_due"
      ? data.tier
      : "basico";

  const hasFeature = (feature: FeatureKey): boolean => {
    if (isOwnProfile && !isFood) return true; // non-food businesses are unaffected
    return tierHasFeature(tier, feature);
  };

  return {
    tier,
    tierConfig: SUBSCRIPTION_TIERS[tier],
    status: (data?.status ?? "active") as SubscriptionStatus,
    subscription: data ?? null,
    isFoodBusiness: isSubscriptionGated,
    /** Food business that has never activated a paid plan yet. */
    needsActivation:
      isSubscriptionGated &&
      !isLoading &&
      !!data &&
      data.status !== "active" &&
      data.status !== "past_due",
    /** Max reservable tables allowed by the plan (null = unlimited). */
    maxTables: isSubscriptionGated ? SUBSCRIPTION_TIERS[tier].maxTables : null,
    isLoading,
    hasFeature,
  };
};

