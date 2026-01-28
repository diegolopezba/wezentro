import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Ticket, MessageCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PremiumGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PremiumGateModal({ open, onOpenChange }: PremiumGateModalProps) {
  const navigate = useNavigate();

  const handleActivateTrial = () => {
    onOpenChange(false);
    navigate("/subscription");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-4">
          <Crown className="w-8 h-8 text-primary-foreground" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-brand font-bold text-foreground">
          Únete a la Lista y Compra Entradas
        </h2>

        {/* Description */}
        <p className="text-muted-foreground text-sm mt-2">
          Para unirte a listas de eventos y comprar entradas, necesitas ser suscriptor de Zentro Premium.
        </p>

        {/* Benefits */}
        <div className="mt-4 space-y-2 text-left">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
            <Ticket className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">Accede a listas exclusivas</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">Ve quién asiste a eventos</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">Chat grupal con asistentes</span>
          </div>
        </div>

        {/* Free trial highlight */}
        <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm font-semibold text-primary">
            🎉 ¡Tu primer mes es GRATIS!
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-6 space-y-3">
          <Button
            variant="hero"
            className="w-full"
            onClick={handleActivateTrial}
          >
            Activar Prueba Gratis
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
