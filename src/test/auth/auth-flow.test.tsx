import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  signInMock: vi.fn(),
  signUpMock: vi.fn(),
  verifySignupOtpMock: vi.fn(),
  resetPasswordMock: vi.fn(),
  resendConfirmationMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => mocks.navigateMock,
    useLocation: () => ({ state: null, pathname: "/auth" }),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/useKeyboardAdjust", () => ({
  useKeyboardAdjust: () => ({ isVisible: false }),
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const cache: Record<string, any> = {};
  const passthrough = (tag: string) => {
    if (cache[tag]) return cache[tag];
    const comp = React.forwardRef<any, any>(
      ({ children, initial, animate, exit, transition, variants, whileTap, whileHover, layout, layoutId, ...props }, ref) =>
        React.createElement(tag, { ...props, ref }, children)
    );
    comp.displayName = `motion.${tag}`;
    cache[tag] = comp;
    return comp;
  };
  const proxy = new Proxy({}, { get: (_t, key: string) => passthrough(key) });
  return {
    m: proxy,
    motion: proxy,
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    signIn: mocks.signInMock,
    signUp: mocks.signUpMock,
    verifySignupOtp: mocks.verifySignupOtpMock,
    resetPassword: mocks.resetPasswordMock,
    resendConfirmation: mocks.resendConfirmationMock,
  }),
}));

import Auth from "@/pages/Auth";

const { navigateMock, signInMock, signUpMock, verifySignupOtpMock } = mocks;

const renderAuth = () =>
  render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>
  );

const switchToSignup = async (user: ReturnType<typeof userEvent.setup>) => {
  // The mode toggle has buttons "Iniciar Sesión" and "Registrarse".
  // "Registrarse" only appears in the toggle, so it's unambiguous.
  const toggleBtn = screen
    .getAllByRole("button")
    .find((b) => b.textContent?.trim() === "Registrarse");
  if (!toggleBtn) throw new Error("Signup toggle not found");
  await user.click(toggleBtn);
};

const submitSignup = async (user: ReturnType<typeof userEvent.setup>) => {
  const btn = await screen.findByRole("button", { name: /crear cuenta/i });
  await user.click(btn);
};

const submitLogin = async (user: ReturnType<typeof userEvent.setup>) => {
  // The "Iniciar Sesión" submit is the LAST button with that text
  // (the first is the mode toggle).
  const all = screen.getAllByRole("button", { name: /iniciar sesión/i });
  await user.click(all[all.length - 1]);
};

const fillSignupForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await switchToSignup(user);
  await user.type(screen.getByPlaceholderText(/correo/i), "zoe@test.com");
  await user.type(screen.getByPlaceholderText(/contraseña/i), "password123");
  const checkbox = screen.getByRole("checkbox");
  await user.click(checkbox);
};

describe("Auth page - signup → code → verify flow", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signInMock.mockReset();
    signUpMock.mockReset();
    verifySignupOtpMock.mockReset();
  });

  it("signup with confirmation required shows the OTP entry screen", async () => {
    const user = userEvent.setup();
    signUpMock.mockResolvedValue({
      data: {
        user: { id: "u1", email: "zoe@test.com", identities: [{ id: "i1" }] },
        session: null,
      },
      error: null,
    });

    renderAuth();
    await fillSignupForm(user);
    await submitSignup(user);

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith("zoe@test.com", "password123");
    });
    expect(await screen.findByText(/verifica tu correo/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/código de verificación/i)
    ).toBeInTheDocument();
  });

  it("entering a valid 6-digit code calls verifySignupOtp and navigates to /onboarding", async () => {
    const user = userEvent.setup();
    signUpMock.mockResolvedValue({
      data: {
        user: { id: "u1", email: "zoe@test.com", identities: [{ id: "i1" }] },
        session: null,
      },
      error: null,
    });
    verifySignupOtpMock.mockResolvedValue({ error: null });

    renderAuth();
    await fillSignupForm(user);
    await submitSignup(user);

    const codeInput = await screen.findByPlaceholderText(/código de verificación/i);
    await user.type(codeInput, "123456");
    await user.click(screen.getByRole("button", { name: /verificar/i }));

    await waitFor(() => {
      expect(verifySignupOtpMock).toHaveBeenCalledWith(
        "zoe@test.com",
        "123456"
      );
      expect(navigateMock).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("invalid OTP shows an error and does not navigate", async () => {
    const user = userEvent.setup();
    signUpMock.mockResolvedValue({
      data: {
        user: { id: "u1", email: "zoe@test.com", identities: [{ id: "i1" }] },
        session: null,
      },
      error: null,
    });
    verifySignupOtpMock.mockResolvedValue({
      error: { message: "Invalid otp code" },
    });

    renderAuth();
    await fillSignupForm(user);
    await submitSignup(user);

    const codeInput = await screen.findByPlaceholderText(/código de verificación/i);
    await user.type(codeInput, "000000");
    await user.click(screen.getByRole("button", { name: /verificar/i }));

    await waitFor(() => {
      expect(verifySignupOtpMock).toHaveBeenCalled();
      expect(screen.getByText(/código incorrecto/i)).toBeInTheDocument();
    });
    expect(navigateMock).not.toHaveBeenCalledWith("/onboarding");
  });

  it("login with unconfirmed email routes the user to the OTP entry screen", async () => {
    const user = userEvent.setup();
    signInMock.mockResolvedValue({
      error: {
        message: "Email not confirmed",
        code: "email_not_confirmed",
        status: 400,
      },
    });

    renderAuth();
    // Default mode is login
    await user.type(screen.getByPlaceholderText(/correo/i), "zoe@test.com");
    await user.type(screen.getByPlaceholderText(/contraseña/i), "password123");
    await submitLogin(user);

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("zoe@test.com", "password123");
    });
    expect(await screen.findByText(/verifica tu correo/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/código de verificación/i)
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith("/onboarding");
  });
});
