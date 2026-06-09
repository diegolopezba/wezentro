import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ---- Mocks ----
const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: null, pathname: "/auth" }),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/useKeyboardAdjust", () => ({
  useKeyboardAdjust: () => ({ isVisible: false }),
}));

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

const signInMock = vi.fn();
const signUpMock = vi.fn();
const verifySignupOtpMock = vi.fn();
const resetPasswordMock = vi.fn();
const resendConfirmationMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    signIn: signInMock,
    signUp: signUpMock,
    verifySignupOtp: verifySignupOtpMock,
    resetPassword: resetPasswordMock,
    resendConfirmation: resendConfirmationMock,
  }),
}));

import Auth from "@/pages/Auth";

const renderAuth = () =>
  render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>
  );

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

    // Switch to signup mode
    await user.click(screen.getByRole("button", { name: /registrarse/i }));

    await user.type(screen.getByPlaceholderText(/correo/i), "zoe@test.com");
    await user.type(screen.getByPlaceholderText(/contraseña/i), "password123");

    // Accept terms checkbox - find by role
    const termsCheckbox = screen.getByRole("checkbox");
    await user.click(termsCheckbox);

    // Submit
    const submitBtn = screen
      .getAllByRole("button")
      .find((b) => /crear cuenta|registrarse|continuar/i.test(b.textContent || ""));
    expect(submitBtn).toBeTruthy();
    await user.click(submitBtn!);

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith("zoe@test.com", "password123");
    });

    // OTP screen appears
    await waitFor(() => {
      expect(screen.getByText(/verifica tu correo/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/código de 6 dígitos/i)
      ).toBeInTheDocument();
    });
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

    await user.click(screen.getByRole("button", { name: /registrarse/i }));
    await user.type(screen.getByPlaceholderText(/correo/i), "zoe@test.com");
    await user.type(screen.getByPlaceholderText(/contraseña/i), "password123");
    await user.click(screen.getByRole("checkbox"));
    const submitBtn = screen
      .getAllByRole("button")
      .find((b) => /crear cuenta|registrarse|continuar/i.test(b.textContent || ""));
    await user.click(submitBtn!);

    const codeInput = await screen.findByPlaceholderText(/código de 6 dígitos/i);
    await user.type(codeInput, "123456");

    const verifyBtn = screen.getByRole("button", { name: /verificar/i });
    await user.click(verifyBtn);

    await waitFor(() => {
      expect(verifySignupOtpMock).toHaveBeenCalledWith("zoe@test.com", "123456");
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
    await user.click(screen.getByRole("button", { name: /registrarse/i }));
    await user.type(screen.getByPlaceholderText(/correo/i), "zoe@test.com");
    await user.type(screen.getByPlaceholderText(/contraseña/i), "password123");
    await user.click(screen.getByRole("checkbox"));
    const submitBtn = screen
      .getAllByRole("button")
      .find((b) => /crear cuenta|registrarse|continuar/i.test(b.textContent || ""));
    await user.click(submitBtn!);

    const codeInput = await screen.findByPlaceholderText(/código de 6 dígitos/i);
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
    const loginBtn = screen
      .getAllByRole("button")
      .find((b) => /iniciar sesión|entrar|continuar/i.test(b.textContent || ""));
    await user.click(loginBtn!);

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("zoe@test.com", "password123");
      expect(screen.getByText(/verifica tu correo/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/código de 6 dígitos/i)
      ).toBeInTheDocument();
    });
    expect(navigateMock).not.toHaveBeenCalledWith("/onboarding");
  });
});
