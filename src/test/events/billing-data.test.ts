import { describe, it, expect } from "vitest";
import { billingSchema, emptyBilling, hasCompleteBilling } from "@/lib/billing";

const complete = { legal_name: "Juan Carlos Flores Quispe", document_type: "CI", document_number: "1234567-1A", phone: "70123456" };
describe("mandatory saved billing details", () => {
  it("requires a legal name independent from an existing social profile name", () => { expect(hasCompleteBilling({ ...emptyBilling, full_name: "Juan Flores" })).toBe(false); expect(hasCompleteBilling(complete)).toBe(true); });
  it("requires a NIT or CI number", () => { expect(hasCompleteBilling({ ...complete, document_number: "" })).toBe(false); });
  it("requires a phone number", () => { expect(hasCompleteBilling({ ...complete, phone: "" })).toBe(false); });
  it("accepts a legal business name and NIT", () => { expect(hasCompleteBilling({ ...complete, legal_name: "Empresa Bolivia SRL", document_type: "NIT", document_number: "12345678901" })).toBe(true); });
  it("keeps CI complements and normalizes phone formatting", () => { expect(billingSchema.parse({ ...complete, phone: "+591 701-23456" }).phone).toBe("+59170123456"); expect(billingSchema.parse(complete).document_number).toBe("1234567-1A"); });
});