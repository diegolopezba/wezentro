import { describe, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  signInMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn(), useLocation: () => ({ state: null, pathname: "/auth" }) };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/useKeyboardAdjust", () => ({ useKeyboardAdjust: () => ({ isVisible: false }) }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const passthrough = (tag: string) =>
    React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(tag, { ...props, ref }, children)
    );
  return {
    m: new Proxy({}, { get: (_t, key: string) => passthrough(key) }),
    motion: new Proxy({}, { get: (_t, key: string) => passthrough(key) }),
    AnimatePresence: ({ children }: any) => children,
  };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    signIn: mocks.signInMock,
    signUp: vi.fn(),
    verifySignupOtp: vi.fn(),
    resetPassword: vi.fn(),
    resendConfirmation: vi.fn(),
  }),
}));

import Auth from "@/pages/Auth";

describe("debug", () => {
  it("logs", async () => {
    const user = userEvent.setup();
    mocks.signInMock.mockResolvedValue({ error: null });
    render(<MemoryRouter><Auth /></MemoryRouter>);
    const email = screen.getByPlaceholderText(/correo/i) as HTMLInputElement;
    const pwd = screen.getByPlaceholderText(/contraseña/i) as HTMLInputElement;
    await user.type(email, "zoe@test.com");
    await user.type(pwd, "password123");
    // eslint-disable-next-line no-console
    console.log("EMAIL VAL:", email.value, "PWD VAL:", pwd.value);
    const buttons = screen.getAllByRole("button");
    // eslint-disable-next-line no-console
    console.log("BUTTONS:", buttons.map((b) => b.textContent?.trim()));
    const submit = buttons.find((b) => b.textContent?.trim() === "Iniciar Sesión");
    await user.click(submit!);
    // eslint-disable-next-line no-console
    console.log("signInMock calls:", mocks.signInMock.mock.calls);
  });
});
