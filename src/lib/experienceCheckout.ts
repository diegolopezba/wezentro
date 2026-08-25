export const buildExperienceQrRequest = (newBookingId: string) => ({
  bookingId: newBookingId,
});

export const resolveExperienceBookingId = (
  newBookingId: string,
  responseBookingId: unknown,
) => (typeof responseBookingId === "string" ? responseBookingId : newBookingId);