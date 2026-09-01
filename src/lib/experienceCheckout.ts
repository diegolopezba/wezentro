import type { CheckoutMethod } from "./cardCheckout";

export const buildExperienceQrRequest = (
  newBookingId: string,
  method: CheckoutMethod = "qr",
  returnUrl?: string,
) => ({
  bookingId: newBookingId,
  method,
  ...(returnUrl ? { returnUrl } : {}),
});

export const resolveExperienceBookingId = (
  newBookingId: string,
  responseBookingId: unknown,
) => (typeof responseBookingId === "string" ? responseBookingId : newBookingId);
