import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  upload: vi.fn(),
  update: vi.fn(),
  refreshProfile: vi.fn(),
  hasBusinessIntent: vi.fn(),
}));

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => mocks.navigate,
}));
vi.mock("framer-motion", () => ({ m: { div: ({ children, initial, animate, transition, ...props }: any) => <div {...props}>{children}</div> } }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user" }, profile: null, refreshProfile: mocks.refreshProfile }),
}));
vi.mock("@/hooks/useReferrals", () => ({ useProcessReferral: () => ({ mutateAsync: vi.fn() }) }));
vi.mock("@/hooks/useKeyboardAdjust", () => ({ useKeyboardAdjust: () => ({ isVisible: false }) }));
vi.mock("@/hooks/useSpecialInvites", () => ({ takePendingSpecialInvite: () => null }));
vi.mock("@/lib/businessIntent", () => ({
  hasBusinessIntent: mocks.hasBusinessIntent,
  takeBusinessIntent: () => mocks.hasBusinessIntent(),
}));
vi.mock("@/lib/mediaCompression", () => ({
  compressImage: async (file: File) => ({ blob: file }),
  blobToFile: (blob: Blob) => new File([blob], "photo.webp", { type: "image/webp" }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ neq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
      update: mocks.update,
    }),
    storage: { from: () => ({ upload: mocks.upload, getPublicUrl: () => ({ data: { publicUrl: "https://example.test/photo.webp" } }) }) },
  },
}));

import Onboarding from "@/pages/Onboarding";

const start = async () => {
  const view = render(<MemoryRouter><Onboarding /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText("tunombre"), { target: { value: "newuser" } });
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
  await screen.findByText("Nombre para mostrar");
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
  await screen.findByText("Agregá tu foto de perfil para que la gente pueda encontrarte");
  return view;
};

describe("required onboarding photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: () => ({ select: async () => ({ data: [{ id: "test-user" }], error: null }) }) });
    mocks.hasBusinessIntent.mockReturnValue(false);
  });

  it("blocks continuing until upload succeeds; personal accounts then see private fields", async () => {
    const view = await start();
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
    fireEvent.change(view.container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(["photo"], "photo.png", { type: "image/png" })] } });
    await waitFor(() => expect(screen.getByRole("button", { name: /continuar/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(await screen.findByText("Género")).toBeInTheDocument();
    expect(screen.getByText("Fecha de nacimiento")).toBeInTheDocument();
  });

  it("business accounts finish with a photo but no gender or birth date", async () => {
    mocks.hasBusinessIntent.mockReturnValue(true);
    const view = await start();
    expect(screen.queryByText("Género")).not.toBeInTheDocument();
    fireEvent.change(view.container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(["photo"], "photo.png", { type: "image/png" })] } });
    await waitFor(() => expect(screen.getByRole("button", { name: /vamos/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /vamos/i }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/business/setup", { replace: true }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: expect.stringContaining("photo.webp"), is_business: true, account_type: "business" }));
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("gender");
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("birth_date");
  });
});