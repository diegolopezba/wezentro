# Fix the persistent Qhantuy insufficient-amount error

## Confirmed diagnosis

The latest failed tests reached the updated checkout code:

- Lounge: base **Bs. 10.00**, gateway fee **Bs. 0.11**, charged total **Bs. 10.11**, organizer payout **Bs. 9.40**, Zentro payout **Bs. 0.60**.
- Ticket: base **Bs. 5.00**, gateway fee **Bs. 0.06**, charged total **Bs. 5.06**, organizer payout **Bs. 4.70**, Zentro payout **Bs. 0.30**.

Both sessions failed. This confirms the deployment is active, but Qhantuy considers the small unallocated remainder insufficient for its applicable commission.

The integration currently treats Zentro as a second `custom_payouts` beneficiary. Qhantuy’s v11.0.2 documentation describes `custom_payouts` as amounts paid to external beneficiaries; the remainder belongs to the merchant that generated the checkout. Therefore, assigning both the organizer’s 94% and Zentro’s 6% as payouts unnecessarily distributes the full base amount before Qhantuy deducts its fee.

## Fix

1. **Event tickets and lounges**
  - Send only the organizer’s 94% as `custom_payouts`.
  - Leave Zentro’s 6% plus the buyer-paid processing fee unassigned in the checkout so Qhantuy deducts its applicable fee from the merchant remainder.
  - Continue recording the base, buyer fee, organizer payout, and Zentro platform fee separately in `payment_sessions` for reporting.
2. **Experience bookings**
  - Apply the same organizer-only payout structure and accounting.
3. **Subscriptions**
  - Remove the self-payout to Zentro’s beneficiary code. The subscription is already a Zentro merchant charge, so its proceeds should remain with the merchant after Qhantuy’s fee.
  - Keep the existing subscription accounting fields in the payment session.
4. **Verification**
  - Add focused tests asserting that event/experience `custom_payouts` contain only the organizer and subscriptions do not self-payout.
  - Deploy all three checkout functions.
  - Run authenticated smoke tests for a Bs. 10 lounge and Bs. 5 ticket, then confirm a Qhantuy transaction ID is created and the sessions remain pending rather than failed.