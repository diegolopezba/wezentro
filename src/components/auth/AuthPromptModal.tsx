import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";

export const AuthPromptModal = () => {
  const navigate = useNavigate();
  const { isOpen, action, returnTo, closePrompt } = useAuthPrompt();

  const handleSignUp = () => {
    closePrompt();
    navigate("/auth", { state: { mode: "signup", returnTo } });
  };

  const handleSignIn = () => {
    closePrompt();
    navigate("/auth", { state: { mode: "signin", returnTo } });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={closePrompt}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-4 right-4 bottom-8 z-[101] max-w-md mx-auto" >
            <div className="bg-card rounded-3xl p-6 shadow-elevated border border-border/50">
              {/* Close button */}
              <button
                onClick={closePrompt}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground transition-colors" >
                <X className="w-4 h-4" />
              </button>

              {/* Content */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 flex items-center justify-center mx-auto">
                  <img src="/logo.png" alt="Zentro" className="w-16 h-16 object-contain" />
                </div>

                <div>
                  <h2 className="font-brand text-2xl font-bold text-foreground mb-2">
                    Únete a Zentro
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Para {action}, necesitas crear una cuenta
                  </p>
                </div>

                {/* Action buttons */}
                <div className="space-y-3 pt-2">
                  <Button
                    variant="hero" className="w-full" onClick={handleSignUp}
                  >
                    Crear Cuenta
                  </Button>
                  <Button
                    variant="secondary" className="w-full" onClick={handleSignIn}
                  >
                    Ya tengo cuenta
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
