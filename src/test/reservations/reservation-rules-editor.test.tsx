import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReservationRulesEditor } from "@/components/reservations/ReservationRulesEditor";

vi.mock("@/hooks/useReservationConfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useReservationConfig")>();
  return {
    ...actual,
    useReservationPolicy: () => ({ data: null }),
    useSaveReservationPolicy: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
  };
});

vi.mock("@/hooks/useDirtyBaseline", () => ({
  useDirtyBaseline: () => ({ isDirty: true, capture: () => {} }),
  saveVariant: () => "default",
}));

vi.mock("@/hooks/useSubscriptionTier", () => ({
  useSubscriptionTier: () => ({
    tier: "premium",
    hasFeature: () => true,
  }),
}));

vi.mock("@/components/subscriptions/LockedFeature", () => ({
  LockedFeature: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("ReservationRulesEditor number fields", () => {
  it("lets the owner type a two-digit table duration without snapping to the minimum", () => {
    render(<ReservationRulesEditor businessId="biz-1" />);

    const duration = screen.getByDisplayValue("90") as HTMLInputElement;
    // Owner clears the field and types "60": no keystroke may clamp to min (30).
    fireEvent.change(duration, { target: { value: "" } });
    fireEvent.change(duration, { target: { value: "6" } });
    expect(duration.value).toBe("6");
    fireEvent.change(duration, { target: { value: "60" } });
    expect(duration.value).toBe("60");
  });

  it("applies the minimum only on blur, never while typing", () => {
    render(<ReservationRulesEditor businessId="biz-1" />);

    const duration = screen.getByDisplayValue("90") as HTMLInputElement;
    fireEvent.change(duration, { target: { value: "" } });
    fireEvent.change(duration, { target: { value: "5" } });
    fireEvent.blur(duration);
    expect(duration.value).toBe("30");
  });
});
