import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { useKeyboardAdjust } from "@/hooks/useKeyboardAdjust";

const emailSchema = z.string().email("Por favor ingresa un correo válido");
const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres");

interface LocationState {
  from?: { pathname: string };
  mode?: "signin" | "signup";
  returnTo?: string;
}

const Auth = () => {
  const navigate = useNavigate();
  const { isVisible: isKeyboardVisible } = useKeyboardAdjust();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  
  const {
    user,
    signIn,
    signUp,
    resetPassword,
    resendConfirmation,
    isLoading: authLoading
  } = useAuth();
  
  // Initialize mode from navigation state (from AuthPromptModal)
  const [mode, setMode] = useState<"login" | "signup" | "reset">(() => {
    if (locationState?.mode === "signup") return "signup";
    if (locationState?.mode === "signin") return "login";
    return "login";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    terms?: string;
  }>({});
  const [formData, setFormData] = useState({
    email: "",
    password: "" });

  // Capture referral code from URL and store in localStorage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("zentro_referral_code", refCode);
    }
  }, [location.search]);

  // Determine where to redirect after auth
  const getRedirectPath = () => {
    // Priority: returnTo from modal > from state > default
    if (locationState?.returnTo) return locationState.returnTo;
    if (locationState?.from?.pathname) return locationState.from.pathname;
    return "/";
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate(getRedirectPath(), { replace: true });
    }
  }, [user, authLoading, navigate, locationState]);

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
      terms?: string;
    } = {};
    try {
      emailSchema.parse(formData.email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    try {
      passwordSchema.parse(formData.password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }
    if (mode === "signup" && !termsAccepted) {
      newErrors.terms = "Debes aceptar los Términos y la Política de Privacidad para continuar.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    if (mode === "login") {
      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Correo o contraseña incorrectos");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Por favor verifica tu correo primero");
        } else {
          toast.error(error.message);
        }
        setIsLoading(false);
        return;
      }
      toast.success("¡Bienvenido de vuelta!");
    } else {
      const { data, error } = await signUp(formData.email, formData.password);
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Ya existe una cuenta con este correo");
        } else {
          toast.error(error.message);
        }
        setIsLoading(false);
        return;
      }
      // Supabase returns success with an empty identities array when the
      // email is already registered (to prevent email enumeration). Detect
      // this and guide the user to login instead of sending them to onboarding.
      const isDuplicateEmail =
        !!data?.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0;
      if (isDuplicateEmail) {
        toast.error("Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.");
        setMode("login");
        setFormData((prev) => ({ ...prev, password: "" }));
        setIsLoading(false);
        return;
      }
      // Email confirmation is enabled: signUp returns a user but no session.
      // Do NOT navigate to /onboarding (ProtectedRoute would bounce back to /auth
      // and the user would think nothing happened). Tell them to check their inbox.
      if (data?.user && !data.session) {
        toast.success(
          `Te enviamos un correo de verificación a ${formData.email}. Confírmalo para iniciar sesión.`,
          { duration: 8000 }
        );
        setMode("login");
        setFormData((prev) => ({ ...prev, password: "" }));
        setIsLoading(false);
        return;
      }
      toast.success("¡Cuenta creada! Configurando tu perfil...");
      navigate("/onboarding");
    }
    setIsLoading(false);
  };

  const handleResetPassword = async () => {
    try {
      emailSchema.parse(formData.email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors({
          email: e.errors[0].message
        });
        return;
      }
    }
    setIsLoading(true);
    const { error } = await resetPassword(formData.email);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("¡Revisa tu correo para el enlace de recuperación!");
      setMode("login");
    }
    setIsLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value
    });
    if (errors[field as keyof typeof errors]) {
      setErrors({
        ...errors,
        [field]: undefined
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-y-auto">
      {/* Video Background */}
      <div className="fixed inset-0 w-full h-full z-0">
        <video autoPlay loop muted playsInline className="absolute w-full h-full object-cover" src="/auth-background.mp4">
        </video>
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/70" />
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
      </div>

      {/* Logo section */}
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-center relative z-10 transition-all duration-300 ${isKeyboardVisible ? "pt-6 pb-3" : "pt-20 pb-10"}`}
      >
        {!isKeyboardVisible && (
          <m.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="inline-block mb-6" >
            <div className="w-20 h-20 flex items-center justify-center mx-auto">
              <img src="/logo.png" alt="Logo de Zentro" className="w-20 h-20 object-contain" />
            </div>
          </m.div>
        )}
        <h1 className="font-brand text-4xl text-foreground mb-2 font-semibold">zentro</h1>
      </m.div>

      {/* Content */}
      <div className="flex-1 px-6 relative z-10">
        <AnimatePresence mode="wait">
          <m.div
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-sm mx-auto space-y-6" >
            {/* Toggle */}
            {mode !== "reset" && (
              <div className="flex p-1 rounded-xl bg-secondary">
                <button
                  onClick={() => {
                    setMode("login");
                    setErrors({});
                  }}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                    mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground" }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => {
                    setMode("signup");
                    setErrors({});
                  }}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                    mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground" }`}
                >
                  Registrarse
                </button>
              </div>
            )}

            {mode === "reset" && (
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground mb-2">Recuperar Contraseña</h2>
                <p className="text-sm text-muted-foreground">Ingresa tu correo para recibir un enlace de recuperación</p>
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              <div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="Correo electrónico" value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`pl-12 ${errors.email ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {mode !== "reset" && (
                <div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Contraseña" value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className={`pl-12 pr-12 ${errors.password ? "border-destructive" : ""}`}
                    />
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors" >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.password}
                    </p>
                  )}
                </div>
              )}

              {/* Terms checkbox — only shown on signup (store compliance) */}
              {mode === "signup" && (
                <div className="space-y-1">
                  <label
                    className="flex items-start gap-3 cursor-pointer select-none" onClick={(e) => {
                      e.preventDefault();
                      setTermsAccepted((prev) => !prev);
                      setErrors((prev) => ({ ...prev, terms: undefined }));
                    }}
                  >
                    <div
                      role="checkbox" aria-checked={termsAccepted}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); setTermsAccepted((prev) => !prev); } }}
                      className={`mt-0.5 w-5 h-5 rounded shrink-0 border-2 flex items-center justify-center transition-all ${
                        termsAccepted
                          ? "gradient-red border-transparent" : "border-muted-foreground/40 bg-secondary" }`}
                    >
                      {termsAccepted && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Tengo 18 años o más y acepto los{" "}
                      <button
                        type="button" className="text-foreground underline underline-offset-2" onClick={(e) => { e.stopPropagation(); navigate("/terms"); }}
                      >
                        Términos de Uso
                      </button>
                      {" "}y la{" "}
                      <button
                        type="button" className="text-foreground underline underline-offset-2" onClick={(e) => { e.stopPropagation(); navigate("/privacy-policy"); }}
                      >
                        Política de Privacidad
                      </button>
                      , incluyendo el uso de mis datos para personalizar mi experiencia.
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.terms}
                    </p>
                  )}
                </div>
              )}

              <Button
                variant="hero" className="w-full" onClick={mode === "reset" ? handleResetPassword : handleAuth}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Iniciar Sesión" : mode === "signup" ? "Crear Cuenta" : "Enviar Enlace"}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>


            {mode === "login" && (
              <p className="text-center text-sm text-muted-foreground">
                ¿Olvidaste tu contraseña?{" "}
                <button
                  className="text-foreground " onClick={() => {
                    setMode("reset");
                    setErrors({});
                  }}
                >
                  Recupérala
                </button>
              </p>
            )}

            {mode === "reset" && (
              <p className="text-center text-sm text-muted-foreground">
                ¿Recordaste tu contraseña?{" "}
                <button
                  className="text-foreground " onClick={() => {
                    setMode("login");
                    setErrors({});
                  }}
                >
                  Volver al inicio
                </button>
              </p>
            )}
          </m.div>
        </AnimatePresence>
      </div>

      {/* Login passive terms footer */}
      {mode === "login" && (
        <div className="px-6 pb-6 text-center text-xs text-muted-foreground relative z-10">
          Al iniciar sesión, confirmas que aceptas nuestros{" "}
          <button className="text-foreground " onClick={() => navigate("/terms")}>Términos</button>
          {" "}y{" "}
          <button className="text-foreground " onClick={() => navigate("/privacy-policy")}>Política de Privacidad</button>
        </div>
      )}
    </div>
  );
};

export default Auth;
