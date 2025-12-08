import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);
    // Simulate auth
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    
    if (mode === "signup") {
      setStep(2);
    } else {
      toast.success("Welcome back!");
      navigate("/");
    }
  };

  const handleOnboarding = () => {
    toast.success("Account created!");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-[80px]" />
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
          <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center shadow-glow mx-auto">
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </div>
        </motion.div>
        <h1 className="font-brand text-4xl font-bold text-gradient mb-2">
          Zentro
        </h1>
        <p className="text-muted-foreground">
          {step === 1 ? "Your nightlife, discovered" : "Tell us about you"}
        </p>
      </motion.div>

      {/* Content */}
      <div className="flex-1 px-6 relative z-10">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto space-y-6"
            >
              {/* Toggle */}
              <div className="flex p-1 rounded-xl bg-secondary">
                <button
                  onClick={() => setMode("login")}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                    mode === "login"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => setMode("signup")}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                    mode === "signup"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Username"
                        className="pl-12"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    className="pl-12"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    className="pl-12"
                  />
                </div>

                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleAuth}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === "login" ? "Log In" : "Create Account"}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or continue with</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Social login */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" className="w-full">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button variant="secondary" className="w-full">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  Apple
                </Button>
              </div>

              {mode === "login" && (
                <p className="text-center text-sm text-muted-foreground">
                  Forgot password?{" "}
                  <button className="text-primary hover:underline">
                    Reset it
                  </button>
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto space-y-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Display Name
                  </label>
                  <Input placeholder="How should we call you?" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Your City
                  </label>
                  <Input placeholder="Los Angeles, CA" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    What are you into?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["Clubs", "Bars", "Concerts", "Festivals", "House Parties", "Rooftops"].map(
                      (interest) => (
                        <button
                          key={interest}
                          className="px-4 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {interest}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 rounded-2xl bg-primary/10 border-2 border-primary text-left">
                      <p className="font-semibold text-foreground">Personal</p>
                      <p className="text-xs text-muted-foreground">
                        Discover & join events
                      </p>
                    </button>
                    <button className="p-4 rounded-2xl bg-secondary border-2 border-transparent text-left hover:border-border transition-colors">
                      <p className="font-semibold text-foreground">Business</p>
                      <p className="text-xs text-muted-foreground">
                        Promote your venue
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              <Button
                variant="hero"
                className="w-full"
                onClick={handleOnboarding}
              >
                Let's Go
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Terms */}
      <div className="p-6 text-center text-xs text-muted-foreground relative z-10">
        By continuing, you agree to our{" "}
        <button className="text-primary hover:underline">Terms</button> and{" "}
        <button className="text-primary hover:underline">Privacy Policy</button>
      </div>
    </div>
  );
};

export default Auth;
