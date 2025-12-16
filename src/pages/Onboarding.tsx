import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, User, MapPin, Sparkles, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const interests = [
  "Clubs",
  "Bars",
  "Concerts",
  "Festivals",
  "House Parties",
  "Rooftops",
  "Live Music",
  "DJ Sets",
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    city: "",
    interests: [] as string[],
    isBusiness: false,
  });

  const validateUsername = (username: string) => {
    if (username.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (username.length > 20) {
      return "Username must be less than 20 characters";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "Username can only contain letters, numbers, and underscores";
    }
    return "";
  };

  const checkUsernameAvailability = async (username: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("Error checking username:", error);
      return false;
    }

    return !data;
  };

  const handleUsernameChange = (value: string) => {
    const lowercased = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setFormData({ ...formData, username: lowercased });
    setUsernameError(validateUsername(lowercased));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
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
        setUsernameError("Username is already taken");
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
        city: formData.city || null,
        interests: formData.interests.length > 0 ? formData.interests : null,
        is_business: formData.isBusiness,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
      setIsLoading(false);
      return;
    }

    await refreshProfile();
    toast.success("Welcome to Zentro!");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-[80px]" />
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-secondary z-20">
        <motion.div
          className="h-full gradient-primary"
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
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="font-brand text-2xl font-bold text-foreground mb-1">
          {step === 1 && "Choose your username"}
          {step === 2 && "Tell us about yourself"}
          {step === 3 && "What are you into?"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {step === 1 && "This is how others will find you"}
          {step === 2 && "Help us personalize your experience"}
          {step === 3 && "Select your nightlife interests"}
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
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    @
                  </span>
                  <Input
                    type="text"
                    placeholder="yourname"
                    value={formData.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className="pl-9"
                    maxLength={20}
                  />
                </div>
                {usernameError && (
                  <p className="text-destructive text-xs mt-2">{usernameError}</p>
                )}
                <p className="text-muted-foreground text-xs mt-2">
                  Letters, numbers, and underscores only
                </p>
              </div>

              <Button
                variant="hero"
                className="w-full"
                onClick={handleNextStep}
                disabled={isLoading || !formData.username || !!usernameError}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Continue
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
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="How should we call you?"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="pl-12"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Your City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Los Angeles, CA"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="pl-12"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isBusiness: false })}
                    className={`p-4 rounded-2xl text-left transition-all ${
                      !formData.isBusiness
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-secondary border-2 border-transparent hover:border-border"
                    }`}
                  >
                    <p className="font-semibold text-foreground">Personal</p>
                    <p className="text-xs text-muted-foreground">
                      Discover & join events
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isBusiness: true })}
                    className={`p-4 rounded-2xl text-left transition-all ${
                      formData.isBusiness
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-secondary border-2 border-transparent hover:border-border"
                    }`}
                  >
                    <p className="font-semibold text-foreground">Business</p>
                    <p className="text-xs text-muted-foreground">
                      Promote your venue
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={handleNextStep}
                >
                  Continue
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
                        ? "gradient-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {formData.interests.includes(interest) && (
                      <Check className="w-4 h-4" />
                    )}
                    {interest}
                  </button>
                ))}
              </div>

              <p className="text-muted-foreground text-xs text-center">
                Select at least one interest to get personalized recommendations
              </p>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={handleComplete}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      Let's Go
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
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
