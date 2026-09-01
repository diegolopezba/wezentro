/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BILLING INTEGRATION POINT — the only file that knows how plans are paid.
 *
 * Plans are charged through Qhantuy QR checkout (same rails as tickets), either
 * monthly or 12 months up front with a 5% discount. The whole amount is routed
 * to Zentro's own beneficiary. Gating logic (useSubscriptionTier,
 * subscriptionTiers.ts, LockedFeature) never needs to know about this.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from "@/integrations/supabase/client";
import { BillingInterval, TierKey } from "./subscriptionTiers";
import type { CheckoutMethod } from "./cardCheckout";

export const BILLING_CONTACT_EMAIL = "hello@zentro.com";

export interface SubscriptionCheckout {
  paymentSessionId: string;
  /** Present for the QR rail. */
  qrImageUrl: string | null;
  /** Present for the card rail: Qhantuy's hosted Cybersource page. */
  paymentUrl: string | null;
  method: CheckoutMethod;
  amount: number;
  prorated: boolean;
  label: string;
  tier: TierKey;
  interval: BillingInterval;
}

/**
 * Creates the Qhantuy checkout for the selected plan (QR or card redirect).
 * Throws with a Spanish message.
 */
export const startSubscriptionCheckout = async (
  tier: TierKey,
  interval: BillingInterval = "month",
  method: CheckoutMethod = "qr",
  returnUrl?: string,
): Promise<SubscriptionCheckout> => {
  const { data, error } = await supabase.functions.invoke("generate-subscription-qr", {
    body: { tier, interval, method, ...(returnUrl ? { returnUrl } : {}) },
  });

  const fallback = method === "card"
    ? "No pudimos iniciar el pago con tarjeta. Intentá de nuevo."
    : "No pudimos generar el QR. Intentá de nuevo.";

  if (error) {
    const detail = (data as any)?.error;
    throw new Error(detail || fallback);
  }
  const hasRail = method === "card" ? !!data?.paymentUrl : !!data?.qrImageUrl;
  if (!hasRail || !data?.paymentSessionId) {
    throw new Error((data as any)?.error || fallback);
  }
  return { ...(data as SubscriptionCheckout), method };
};


export type SubscriptionPaymentStatus = "pending" | "confirmed" | "failed" | "expired";

export const checkSubscriptionPayment = async (
  paymentSessionId: string,
): Promise<SubscriptionPaymentStatus> => {
  const { data, error } = await supabase.functions.invoke("check-qhantuy-payment-status", {
    body: { paymentSessionId },
  });
  if (error) return "pending";
  return (data?.status as SubscriptionPaymentStatus) ?? "pending";
};

/** Cancellation is still handled by the team (no auto-renew to stop). */
export const cancelSubscription = async (): Promise<void> => {
  const { toast } = await import("sonner");
  toast.info(
    `Para cambiar o cancelar tu plan, escribinos a ${BILLING_CONTACT_EMAIL}. Si no renovás, el plan se desactiva solo al vencer.`,
  );
};
