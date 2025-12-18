import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Check, Users, BarChart3, QrCode, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SubscriptionUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

const businessFeatures = [
  { icon: Users, label: "Create events with guestlists" },
  { icon: QrCode, label: "QR code check-ins" },
  { icon: BarChart3, label: "View event analytics" },
  { icon: Sparkles, label: "Priority event visibility" },
];

export const SubscriptionUpsellModal = ({
  isOpen,
  onClose,
  feature = "this feature",
}: SubscriptionUpsellModalProps) => {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    onClose();
    navigate("/subscription");
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
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="relative bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
              {/* Gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-32 gradient-primary opacity-20" />
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-secondary/80 hover:bg-secondary transition-colors z-10"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="relative p-6 pt-8">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <Crown className="w-8 h-8 text-primary-foreground" />
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-foreground text-center mb-2">
                  Unlock Zentro Business
                </h2>
                <p className="text-muted-foreground text-center text-sm mb-6">
                  Upgrade to access {feature} and powerful event management tools
                </p>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {businessFeatures.map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm text-foreground">{item.label}</span>
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    </motion.div>
                  ))}
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-foreground">$19.99</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cancel anytime
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={handleSubscribe}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Subscribe Now
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={onClose}
                  >
                    Maybe Later
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
