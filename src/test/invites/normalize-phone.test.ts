import { describe, it, expect } from "vitest";
import { normalizePhone } from "@/lib/inviteImport";

describe("normalizePhone", () => {
  it("adds 591 to 8-digit Bolivian numbers", () => {
    expect(normalizePhone("70123456")).toBe("59170123456");
  });
  it("keeps numbers that already have a country code", () => {
    expect(normalizePhone("+591 701-23456")).toBe("59170123456");
  });
  it("rejects too-short numbers", () => {
    expect(normalizePhone("12345")).toBeNull();
  });
});
