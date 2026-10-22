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
