import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildCharge } from "./qhantuy.ts";

Deno.test("default: organizer pays 6%", () => {
  const c = buildCharge(100);
  assertEquals([c.baseAmount, c.payoutAmount, c.platformFee], [100, 94, 6]);
});
Deno.test("custom 4% deducted from organizer", () => {
  const c = buildCharge(100, { bps: 400, paidBy: "organizer" });
  assertEquals([c.baseAmount, c.payoutAmount, c.platformFee], [100, 96, 4]);
});
Deno.test("buyer covers 6%: organizer keeps full price", () => {
  const c = buildCharge(100, { paidBy: "buyer" });
  assertEquals([c.baseAmount, c.payoutAmount, c.platformFee], [106, 100, 6]);
});
