import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, User, Check, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useProcessReferral } from "@/hooks/useReferrals";

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
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    interests: [] as string[]
  });

  const validateUsername = (username: string) => {
    if (username.length < 3) {
      return "El usuario debe tener al menos 3 caracteres";
    }
    if (username.length > 20) {
      return "El usuario debe tener menos de 20 caracteres";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "Solo puede contener letras, números y guiones bajos";
    }
    return "";
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!user) return false;
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username.toLowerCase())
      .neq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("Error checking username:", error);
      return false;
    }
    return !data;
  };

  const handleUsernameChange = (value: string) => {
    const lowercased = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setFormData({
      ...formData,
      username: lowercased
    });
    setUsernameError(validateUsername(lowercased));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleNextStep = async () => {
    if (step === 1) {
      const validationError = validateUsername(formData.username);
      if (validationError) {
        setUsernameError(validationError);
        return;
      }
      setIsLoading(true);
      const isAvailable = await checkUsernameAvailability(formData.username);
      setIsLoading(false);
      if (!isAvailable) {
        setUsernameError("Este usuario ya está en uso");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setIsLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: formData.username.toLowerCase(),
        full_name: formData.fullName || null,
        interests: formData.interests.length > 0 ? formData.interests : null
      })
      .eq("id", user.id);
    if (error) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar perfil. Intenta de nuevo.");
      setIsLoading(false);
      return;
    }
    
    // Process referral if exists
    const referralCode = localStorage.getItem("zentro_referral_code");
    if (referralCode) {
      await processReferral.mutateAsync(referralCode);
      localStorage.removeItem("zentro_referral_code");
    }
    
    await refreshProfile();
    toast.success("¡Bienvenido a Zentro!");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-secondary z-20">
        <motion.div
          className="h-full bg-foreground"
          initial={{ width: "33%" }}
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Logo section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-16 pb-6 text-center relative z-10"
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-primary-foreground">
          <img src="/logo.png" alt="Zentro" className="w-10 h-10 object-fill" />
        </div>
        <h1 className="font-brand text-2xl font-bold text-foreground mb-1">
          {step === 1 && "Elige tu nombre de usuario"}
          {step === 2 && "Cuéntanos sobre ti"}
          {step === 3 && "¿Qué te gusta?"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {step === 1 && "Así te encontrarán los demás"}
          {step === 2 && "Ayúdanos a personalizar tu experiencia"}
          {step === 3 && "Selecciona tus intereses"}
        </p>
      </motion.div>

      {/* Content */}
      <div className="flex-1 px-6 relative z-10">
        <div className="max-w-sm mx-auto">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Nombre de usuario
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    @
                  </span>
                  <Input
                    type="text"
                    placeholder="tunombre"
                    value={formData.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className="pl-9"
                    maxLength={20}
                  />
                </div>
                {usernameError && <p className="text-destructive text-xs mt-2">{usernameError}</p>}
                <p className="text-muted-foreground text-xs mt-2">
                  Solo letras, números y guiones bajos
                </p>
              </div>

              <Button
                variant="hero"
                className="w-full"
                onClick={handleNextStep}
                disabled={isLoading || !formData.username || !!usernameError}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Nombre para mostrar
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="¿Cómo te llamamos?"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fullName: e.target.value
                      })
                    }
                    className="pl-12"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button variant="hero" className="flex-1" onClick={handleNextStep}>
                  Continuar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleInterestToggle(interest)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                      formData.interests.includes(interest)
                        ? "gradient-red text-white"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {formData.interests.includes(interest) && <Check className="w-4 h-4" />}
                    {interest}
                  </button>
                ))}
              </div>

              <p className="text-muted-foreground text-xs text-center">
                Selecciona al menos un interés para recomendaciones personalizadas
              </p>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>
                  Atrás
                </Button>
                <Button variant="hero" className="flex-1" onClick={handleComplete} disabled={isLoading}>
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      ¡Vamos!
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Skip option */}
      {step > 1 && (
        <div className="p-6 text-center relative z-10">
          <button
            onClick={handleComplete}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            Omitir por ahora
          </button>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
