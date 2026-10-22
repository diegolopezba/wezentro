import { describe, it, expect } from "vitest";
import { canOfferDiscountCode, computeDiscount } from "@/lib/discount";

describe("discount codes apply to the order subtotal", () => {
  it("percent discount on 3 tickets of Bs. 250 takes 10% of Bs. 750", () => {
    expect(computeDiscount(750, "percent", 10)).toBe(75);
  });
  it("fixed Bs. 50 is taken once from the whole subtotal, not per ticket", () => {
    expect(computeDiscount(800, "fixed", 50)).toBe(50);
  });
  it("fixed discount never exceeds the subtotal", () => {
    expect(computeDiscount(100, "fixed", 150)).toBe(100);
  });
});

describe("the discount code row only appears when it can work", () => {
  const base = { isFree: false, canBuyMultiple: true, hasTier: true, hasCodes: true };
  it("stays hidden when the organizer created no code for this event", () => {
    expect(canOfferDiscountCode({ ...base, hasCodes: false })).toBe(false);
  });
  it("stays hidden on free entries and special invitations", () => {
    expect(canOfferDiscountCode({ ...base, isFree: true })).toBe(false);
  });
  it("stays hidden for venue areas, which never take a code", () => {
    expect(canOfferDiscountCode({ ...base, canBuyMultiple: false, hasTier: false })).toBe(false);
  });
  it("shows for a paid entry when the event has a usable code", () => {
    expect(canOfferDiscountCode(base)).toBe(true);
  });
});
