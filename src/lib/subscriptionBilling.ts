/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BILLING INTEGRATION POINT — the ONLY file that should know how plans are paid.
 *
 * TODO(qhantuy): swap these stubs for real Qhantuy recurring-billing calls once
 * the integration docs are available. Gating logic (useSubscriptionTier,
 * subscriptionTiers.ts, LockedFeature) must NOT need any change when that happens.
 *
 * Today: subscriptions are activated manually straight in the database
 * (business_subscriptions.activation_method = 'manual').
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { toast } from "sonner";
import { SUBSCRIPTION_TIERS, TierKey } from "./subscriptionTiers";

export const BILLING_CONTACT_EMAIL = "hello@zentro.com";

/** Placeholder checkout — no charge happens yet. */
export const startSubscriptionCheckout = async (tier: TierKey): Promise<void> => {
  // TODO(qhantuy): create recurring subscription and return a payment URL / QR.
  toast.info(
    `Para activar el plan ${SUBSCRIPTION_TIERS[tier].name}, escríbenos a ${BILLING_CONTACT_EMAIL}. Lo activamos manualmente por ahora.`
  );
};

/** Placeholder cancellation — no billing action happens yet. */
export const cancelSubscription = async (): Promise<void> => {
  // TODO(qhantuy): cancel the recurring subscription.
  toast.info(
    `Para cambiar o cancelar tu plan, escríbenos a ${BILLING_CONTACT_EMAIL}.`
  );
};
