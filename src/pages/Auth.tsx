import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const emailSchema = z.string().email("Por favor ingresa un correo válido");
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres");

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    isLoading: authLoading
  } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      const from = (location.state as {
        from?: {
          pathname: string;
        };
      })?.from?.pathname || "/";
      navigate(from, {
        replace: true
      });
    }
  }, [user, authLoading, navigate, location]);

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
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
      const { error } = await signUp(formData.email, formData.password);
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Ya existe una cuenta con este correo");
        } else {
          toast.error(error.message);
        }
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message || "Error al iniciar sesión con Google");
      setIsGoogleLoading(false);
    }
    // Don't set loading to false on success - redirect will happen
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-20 pb-10 text-center relative z-10"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="inline-block mb-6"
        >
          <div className="w-20 h-20 flex items-center justify-center mx-auto">
            <img src="/logo.png" alt="Logo de Zentro" className="w-20 h-20 object-contain" />
          </div>
        </motion.div>
        <h1 className="font-brand text-4xl text-foreground mb-2 font-semibold">zentro</h1>
      </motion.div>

      {/* Content */}
      <div className="flex-1 px-6 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-sm mx-auto space-y-6"
          >
            {/* Toggle */}
            {mode !== "reset" && (
              <div className="flex p-1 rounded-xl bg-secondary">
                <button
                  onClick={() => {
                    setMode("login");
                    setErrors({});
                  }}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                    mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => {
                    setMode("signup");
                    setErrors({});
                  }}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                    mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
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
                    type="email"
                    placeholder="Correo electrónico"
                    value={formData.email}
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
                      placeholder="Contraseña"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className={`pl-12 pr-12 ${errors.password ? "border-destructive" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
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

              <Button
                variant="hero"
                className="w-full"
                onClick={mode === "reset" ? handleResetPassword : handleAuth}
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

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">o continúa con</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Social login */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </>
                )}
              </Button>
              <Button variant="secondary" className="w-full opacity-50 cursor-not-allowed" disabled title="Próximamente">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Apple
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Apple próximamente
            </p>

            {mode === "login" && (
              <p className="text-center text-sm text-muted-foreground">
                ¿Olvidaste tu contraseña?{" "}
                <button
                  className="text-foreground hover:underline"
                  onClick={() => {
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
                  className="text-foreground hover:underline"
                  onClick={() => {
                    setMode("login");
                    setErrors({});
                  }}
                >
                  Volver al inicio
                </button>
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Terms */}
      <div className="p-6 text-center text-xs text-muted-foreground relative z-10">
        Al continuar, aceptas nuestros <button className="text-foreground hover:underline">Términos</button> y{" "}
        <button className="text-foreground hover:underline">Política de Privacidad</button>
      </div>
    </div>
  );
};

export default Auth;
