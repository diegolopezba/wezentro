import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  interests: string[] | null;
  is_business: boolean;
  account_type: string | null;
  birth_date: string | null;
  gender: string | null;
  is_food_business: boolean | null;
  business_latitude: number | null;
  business_longitude: number | null;
  business_address: string | null;
  business_hours: string | null;
  business_phone: string | null;
  business_type: string | null;
  reservations_enabled: boolean | null;
  menu_enabled: boolean | null;
  experiences_enabled: boolean | null;
  reservation_start_time: string | null;
  reservation_end_time: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, username?: string, accountType?: "personal" | "business") => Promise<{ data: { user: User | null; session: Session | null } | null; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: Error | null }>;
  verifySignupOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile | null;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
        }

        if (event === "INITIAL_SESSION") {
          setIsLoading(false);
        }
      }
    );

    // The onAuthStateChange listener with INITIAL_SESSION handles the
    // existing session automatically — no need for a separate getSession() call.
    // This eliminates the race condition that caused duplicate profile fetches.

    return () => subscription.unsubscribe();
  }, []);

  // Re-validate the token when the app is resumed (tab foregrounded or restored
  // from bfcache). Safari suspends timers, so autoRefreshToken can miss a cycle
  // and leave a stale access token that fails on the next authed request.
  useEffect(() => {
    const revalidate = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const current = data.session;
        if (!current) return;
        const expiresAt = (current.expires_at ?? 0) * 1000;
        if (expiresAt - Date.now() < 5 * 60 * 1000) {
          await supabase.auth.refreshSession();
        }
      } catch {
        /* ignore — the next authed call surfaces the error */
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") revalidate();
    };
    const onPageShow = () => revalidate();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);


  const signUp = async (
    email: string,
    password: string,
    username?: string,
    accountType?: "personal" | "business",
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const metadata: Record<string, string> = {};
    if (username) metadata.username = username;
    if (accountType) metadata.account_type = accountType;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        ...(Object.keys(metadata).length > 0 && { data: metadata }),
      },
    });

    return { data, error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      const profile = await fetchProfile(user.id);
      setProfile(profile);
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    return { error: error as Error | null };
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { error: error as Error | null };
  };

  const verifySignupOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        resendConfirmation,
        verifySignupOtp,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
