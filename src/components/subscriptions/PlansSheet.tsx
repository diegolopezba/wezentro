import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { PlanSelector } from "@/components/subscriptions/PlanSelector";
import { TierKey } from "@/lib/subscriptionTiers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier?: TierKey;
  highlightTier?: TierKey;
}

export const PlansSheet = ({ open, onOpenChange, currentTier = "basico", highlightTier }: Props) => {
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="light-sheet rounded-t-3xl h-[88dvh] pb-0">
        <SheetTitle className="sr-only">Planes para tu negocio</SheetTitle>
        <PlanSelector
          variant="sheet"
          currentTier={currentTier}
          initialTier={highlightTier ?? currentTier}
          onDismiss={() => onOpenChange(false)}
          dismissLabel="Cerrar"
          footerSlot={
            <Button
              variant="ghost"
              className="w-full rounded-full"
              onClick={() => {
                onOpenChange(false);
                navigate("/settings/business/plans");
              }}
            >
              Ver todos los detalles
            </Button>
          }
        />
      </SheetContent>
    </Sheet>
  );
};
