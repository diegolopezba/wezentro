import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

// Mock the supabase client BEFORE importing the context
const signUpMock = vi.fn();
const signInMock = vi.fn();
const verifyOtpMock = vi.fn();
const onAuthStateChangeMock = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => signUpMock(...args),
      signInWithPassword: (...args: unknown[]) => signInMock(...args),
      verifyOtp: (...args: unknown[]) => verifyOtpMock(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      resend: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext - signup + OTP verify + unconfirmed login", () => {
  beforeEach(() => {
    signUpMock.mockReset();
    signInMock.mockReset();
    verifyOtpMock.mockReset();
  });

  it("signUp returns user without session when confirmation is required", async () => {
    signUpMock.mockResolvedValue({
      data: {
        user: { id: "u1", email: "new@test.com", identities: [{ id: "i1" }] },
        session: null,
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    let res: any;
    await act(async () => {
      res = await result.current.signUp("new@test.com", "password123");
    });

    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@test.com", password: "password123" })
    );
    expect(res.error).toBeNull();
    expect(res.data.user).toBeTruthy();
    expect(res.data.session).toBeNull();
  });

  it("verifySignupOtp calls supabase with type=signup", async () => {
    verifyOtpMock.mockResolvedValue({ data: {}, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    let res: any;
    await act(async () => {
      res = await result.current.verifySignupOtp("new@test.com", "123456");
    });

    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: "new@test.com",
      token: "123456",
      type: "signup",
    });
    expect(res.error).toBeNull();
  });

  it("verifySignupOtp surfaces invalid-code errors", async () => {
    verifyOtpMock.mockResolvedValue({
      data: {},
      error: { message: "Token has expired or is invalid" },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    let res: any;
    await act(async () => {
      res = await result.current.verifySignupOtp("new@test.com", "000000");
    });
    expect(res.error).toBeTruthy();
    expect(res.error.message).toMatch(/invalid|expired/i);
  });

  it("signIn returns an email_not_confirmed error when account is unconfirmed", async () => {
    signInMock.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Email not confirmed", code: "email_not_confirmed", status: 400 },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    let res: any;
    await act(async () => {
      res = await result.current.signIn("new@test.com", "password123");
    });

    expect(signInMock).toHaveBeenCalledWith({
      email: "new@test.com",
      password: "password123",
    });
    expect(res.error).toBeTruthy();
    expect((res.error as any).code ?? res.error.message).toMatch(
      /email_not_confirmed|Email not confirmed/
    );
  });
});
