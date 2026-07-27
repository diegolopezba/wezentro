import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, refreshProfile: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ neq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) },
}));
vi.mock("@/hooks/useReferrals", () => ({ useProcessReferral: () => ({ mutateAsync: vi.fn() }) }));

import Onboarding from "@/pages/Onboarding";

describe("onboarding", () => {
  it("advances to step 2", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Onboarding /></MemoryRouter>);
    await user.type(screen.getByPlaceholderText("tunombre"), "rafael2510_");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await waitFor(() => expect(screen.getByText(/Cuéntanos sobre ti/i)).toBeInTheDocument());
  });
});
