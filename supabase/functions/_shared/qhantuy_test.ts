import {
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildCharge, organizerPayouts } from "./qhantuy.ts";

Deno.test("event checkout pays only the organizer as an external beneficiary", () => {
  const charge = buildCharge(10);
  assertEquals(charge.payoutAmount, 9.4);
  assertEquals(charge.platformFee, 0.6);
  assertEquals(organizerPayouts("ORGANIZER", charge.payoutAmount), [
    { code: "ORGANIZER", amount: 9.4 },
  ]);
});

Deno.test("low-price checkout leaves merchant balance for platform and gateway fees", () => {
  const charge = buildCharge(5);
  const payouts = organizerPayouts("ORGANIZER", charge.payoutAmount);
  const distributed = payouts.reduce((sum, payout) => sum + payout.amount, 0);

  assertEquals(charge.gatewayFee, 0.06);
  assertEquals(charge.totalAmount, 5.06);
  assertEquals(distributed, 4.7);
  assertEquals(Number((charge.totalAmount - distributed).toFixed(2)), 0.36);
});