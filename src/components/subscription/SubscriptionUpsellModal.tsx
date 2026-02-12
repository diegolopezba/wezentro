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
  { icon: Users, label: "Crear eventos con lista de invitados" },
  { icon: QrCode, label: "Check-in con código QR" },
  { icon: BarChart3, label: "Ver analíticas de eventos" },
  { icon: Sparkles, label: "Gestiona menú y reservas" },
];

export const SubscriptionUpsellModal = ({
  isOpen,
  onClose,
  feature = "esta función",
}: SubscriptionUpsellModalProps) => {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    onClose();
    navigate("/settings");
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
            className="fixed inset-4 z-50 max-w-md mx-auto flex items-center justify-center"
          >
            <div className="relative bg-card border border-border rounded-3xl overflow-hidden shadow-elevated max-h-[90vh] overflow-y-auto">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-secondary/80 hover:bg-secondary transition-colors z-10"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="relative p-6 pt-8">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Crown className="w-8 h-8 text-white" />
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-foreground text-center mb-2">
                  Activa tu Cuenta Business
                </h2>
                <p className="text-muted-foreground text-center text-sm mb-6">
                  Cambia a cuenta Business gratis para acceder a {feature} y herramientas poderosas de gestión
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
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-amber-500" />
                      </div>
                      <span className="text-sm text-foreground">{item.label}</span>
                      <Check className="w-4 h-4 text-amber-500 ml-auto" />
                    </motion.div>
                  ))}
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-foreground">Gratis</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sin costo, actívalo en Configuración
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    variant="premium"
                    className="w-full"
                    onClick={handleSubscribe}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Activar Cuenta Business
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={onClose}
                  >
                    Quizás Después
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
