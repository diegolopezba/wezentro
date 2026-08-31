import { useState } from "react";
import { m } from "framer-motion";
import { ArrowRight, User, Check, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useProcessReferral } from "@/hooks/useReferrals";
import { useKeyboardAdjust } from "@/hooks/useKeyboardAdjust";

import { takePendingSpecialInvite } from "@/hooks/useSpecialInvites";
import { hasBusinessIntent } from "@/lib/businessIntent";

const genderOptions = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "non_binary", label: "No binario" },
  { value: "prefer_not_to_say", label: "Prefiero no decir" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const processReferral = useProcessReferral();
  const { isVisible: isKeyboardVisible } = useKeyboardAdjust();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    gender: "",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
  });

  const validateUsername = (username: string) => {
    if (username.length < 3) return "El usuario debe tener al menos 3 caracteres";
    if (username.length > 20) return "El usuario debe tener menos de 20 caracteres";
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Solo puede contener letras, números y guiones bajos";
    return "";
  };

  /**
   * Returns "available" | "taken" | "unknown".
   * "unknown" means the lookup itself failed (offline / RLS / transient) —
   * we must NOT treat that as "taken", the final profile update has a unique
   * constraint that catches real duplicates anyway.
   */
  const checkUsernameAvailability = async (
    username: string
  ): Promise<"available" | "taken" | "unknown"> => {
    if (!user) return "unknown";
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username.toLowerCase())
        .neq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error("[Onboarding] username availability check failed:", error);
        return "unknown";
      }
      return data ? "taken" : "available";
    } catch (e) {
      console.error("[Onboarding] username availability check threw:", e);
      return "unknown";
    }
  };

  const handleUsernameChange = (value: string) => {
    const lowercased = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setFormData({ ...formData, username: lowercased });
    setUsernameError(validateUsername(lowercased));
  };

  const handleNextStep = async () => {
    try {
      if (step === 1) {
        const validationError = validateUsername(formData.username);
        if (validationError) { setUsernameError(validationError); return; }
        setIsLoading(true);
        const availability = await checkUsernameAvailability(formData.username);
        setIsLoading(false);
        if (availability === "taken") { setUsernameError("Este usuario ya está en uso"); return; }
        setStep(2);
      } else if (step === 2) {
        setStep(3);
      } else if (step === 3) {
        if (!formData.gender) { toast.error("Selecciona tu género."); return; }
        const birthDate = buildBirthDate();
        if (!birthDate) { toast.error("Por favor ingresa tu fecha de nacimiento completa."); return; }
        const age = getAge(birthDate);
        if (age < 13) { toast.error("Debes tener al menos 13 años para usar Zentro."); return; }
        await handleComplete();
      }
    } catch (e) {
      console.error("[Onboarding] step transition failed:", e);
      setIsLoading(false);
      toast.error("No pudimos continuar. Intenta de nuevo.");
    }
  };


  const buildBirthDate = (): string | null => {
    const { birthDay, birthMonth, birthYear } = formData;
    if (!birthDay || !birthMonth || !birthYear) return null;
    const d = parseInt(birthDay), m = parseInt(birthMonth), y = parseInt(birthYear);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) return null;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  const getAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleComplete = async () => {
    if (!user || isLoading) return;

    const birthDate = buildBirthDate();
    if (!formData.gender || !birthDate) {
      toast.error("Faltan datos del paso anterior.");
      return;
    }

    setIsLoading(true);
    try {
      const updatePayload: any = {
        username: formData.username.toLowerCase(),
        full_name: formData.fullName || null,
        gender: formData.gender,
        birth_date: birthDate,
      };
      const { data: updated, error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id)
        .select("id");

      if (error) {
        console.error("[Onboarding] Error updating profile:", error);
        const code = (error as any)?.code;
        if (code === "23505" || /duplicate|unique/i.test(error.message)) {
          toast.error("Ese nombre de usuario ya está en uso. Elige otro.");
          setUsernameError("Este usuario ya está en uso");
          setStep(1);
        } else {
          toast.error("No pudimos guardar tu perfil. Intenta de nuevo.");
        }
        setIsLoading(false);
        return;
      }

      if (!updated || updated.length === 0) {
        console.error("[Onboarding] Profile update affected 0 rows for", user.id);
        toast.error("No pudimos guardar tu perfil. Cierra sesión y vuelve a entrar.");
        setIsLoading(false);
        return;
      }

      const referralCode = localStorage.getItem("zentro_referral_code");
      if (referralCode) {
        try {
          await processReferral.mutateAsync(referralCode);
        } catch (e) {
          console.warn("Referral processing failed:", e);
        }
        localStorage.removeItem("zentro_referral_code");
      }

      await refreshProfile();
      toast.success("¡Bienvenido a Zentro!");
      setIsLoading(false);
      const pendingInvite = takePendingSpecialInvite();
      if (pendingInvite) {
        navigate(`/i/${pendingInvite}`);
      } else if (hasBusinessIntent()) {
        navigate("/business/setup", { replace: true });
      } else {
        navigate("/");
      }
    } catch (e) {
      console.error("[Onboarding] handleComplete threw:", e);
      toast.error("No pudimos guardar tu perfil. Intenta de nuevo.");
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-y-auto">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-secondary z-20">
        <m.div
          className="h-full bg-foreground" initial={{ width: "33%" }}
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Logo + heading */}
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-center relative z-10 transition-all duration-300 ${isKeyboardVisible ? "pt-5 pb-2" : "pt-16 pb-6"}`}
      >
        {!isKeyboardVisible && (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-primary-foreground">
            <img src="/logo.png" alt="Zentro" className="w-10 h-10 object-fill" />
          </div>
        )}
        <h1 className="font-brand text-2xl font-medium text-foreground mb-1">
          {step === 1 && "Elige tu nombre de usuario"}
          {step === 2 && "Cuéntanos sobre ti"}
          {step === 3 && "Un poco más sobre ti"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {step === 1 && "Así te encontrarán los demás"}
          {step === 2 && "Ayúdanos a personalizar tu experiencia"}
          {step === 3 && "Esta info es privada y mejora tus recomendaciones"}
        </p>
      </m.div>

      {/* Content */}
      <div className="flex-1 px-6 relative z-10">
        <div className="max-w-sm mx-auto">

          {/* Step 1: Username */}
          {step === 1 && (
            <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Nombre de usuario</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    type="text" placeholder="tunombre" value={formData.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className="pl-9" maxLength={20}
                  />
                </div>
                {usernameError && <p className="text-destructive text-xs mt-2">{usernameError}</p>}
                <p className="text-muted-foreground text-xs mt-2">Solo letras, números y guiones bajos</p>
              </div>
              <Button
                variant="sheet-action" className="w-full" onClick={handleNextStep}
                disabled={isLoading || !formData.username || !!usernameError}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Continuar <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </m.div>
          )}

          {/* Step 2: Display name */}
          {step === 2 && (
            <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Nombre para mostrar</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text" placeholder="¿Cómo te llamamos?" value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="pl-12" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>Atrás</Button>
                <Button variant="sheet-action" className="flex-1" onClick={handleNextStep}>
                  Continuar <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </m.div>
          )}

          {/* Step 3: Gender + birth date */}
          {step === 3 && (
            <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">

              {/* Gender */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Género</label>
                <div className="grid grid-cols-2 gap-2">
                  {genderOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button" onClick={() => setFormData({ ...formData, gender: opt.value })}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        formData.gender === opt.value
                          ? "gradient-red text-accent-red-foreground" : "bg-secondary text-muted-foreground " }`}
                    >
                      {formData.gender === opt.value && <Check className="w-4 h-4 shrink-0" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Birth date */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Fecha de nacimiento</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number" placeholder="DD" value={formData.birthDay}
                      onChange={(e) => setFormData({ ...formData, birthDay: e.target.value })}
                      min={1} max={31}
                      className="text-center" />
                    <p className="text-muted-foreground text-xs text-center mt-1">Día</p>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number" placeholder="MM" value={formData.birthMonth}
                      onChange={(e) => setFormData({ ...formData, birthMonth: e.target.value })}
                      min={1} max={12}
                      className="text-center" />
                    <p className="text-muted-foreground text-xs text-center mt-1">Mes</p>
                  </div>
                  <div className="flex-[2]">
                    <Input
                      type="number" placeholder="AAAA" value={formData.birthYear}
                      onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                      min={1900} max={new Date().getFullYear()}
                      className="text-center" />
                    <p className="text-muted-foreground text-xs text-center mt-1">Año</p>
                  </div>
                </div>
              </div>

              {/* Privacy note */}
              <div className="flex items-start gap-2 rounded-xl bg-secondary/60 px-3 py-2.5">
                <Lock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-muted-foreground text-xs">
                  Tu género y edad nunca se muestran públicamente. Solo se usan para personalizar tu experiencia.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>Atrás</Button>
                <Button variant="sheet-action" className="flex-1" onClick={handleNextStep} disabled={isLoading || !formData.gender || !formData.birthDay || !formData.birthMonth || !formData.birthYear}>
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>¡Vamos! <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>
              </div>
            </m.div>
          )}

        </div>
      </div>

      {/* Skip removed: birth date is required for 18+ verification */}
    </div>
  );
};

export default Onboarding;
