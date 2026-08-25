import { describe, expect, it } from "vitest";
import {
  buildExperienceQrRequest,
  resolveExperienceBookingId,
} from "@/lib/experienceCheckout";

describe("experience checkout booking identity", () => {
  it("always sends the freshly created booking ID to QR generation", () => {
    const staleStateBookingId = "older-booking";
    const newBookingId = "new-booking";

    const request = buildExperienceQrRequest(newBookingId);

    expect(request).toEqual({ bookingId: newBookingId });
    expect(request.bookingId).not.toBe(staleStateBookingId);
  });

  it("uses the booking linked by the backend as the canonical success target", () => {
    expect(resolveExperienceBookingId("local-booking", "confirmed-booking")).toBe(
      "confirmed-booking",
    );
    expect(resolveExperienceBookingId("local-booking", null)).toBe("local-booking");
  });
});