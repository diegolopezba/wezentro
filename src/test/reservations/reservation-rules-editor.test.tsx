import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReservationRulesEditor } from "@/components/reservations/ReservationRulesEditor";
import { useReservationConfigRealtime } from "@/hooks/useReservationConfig";

vi.mock("@/hooks/useReservationConfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useReservationConfig")>();
  return {
    ...actual,
    useReservationConfigRealtime: () => {},
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
  LockedFeature: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("ReservationRulesEditor number fields", () => {
  it("lets the owner type a two-digit table duration without snapping to the minimum", () => {
    render(<ReservationRulesEditor businessId="biz-1" />);

    const duration = screen.getByLabelText("Duración de la mesa (min)");
    // Owner clears the field and types "60": no keystroke may clamp to min (30).
    fireEvent.change(duration, { target: { value: "" } });
    fireEvent.change(duration, { target: { value: "6" } });
    expect((duration as HTMLInputElement).value).toBe("6");
    fireEvent.change(duration, { target: { value: "60" } });
    expect((duration as HTMLInputElement).value).toBe("60");
  });

  it("keeps the minimum only as a blur/save guard", () => {
    render(<ReservationRulesEditor businessId="biz-1" />);

    const duration = screen.getByLabelText("Duración de la mesa (min)");
    fireEvent.change(duration, { target: { value: "" } });
    fireEvent.change(duration, { target: { value: "5" } });
    fireEvent.blur(duration);
    expect((duration as HTMLInputElement).value).toBe("30");
  });
});
