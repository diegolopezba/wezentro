import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Landmark } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Adapts the copy to the flow that triggered the gate. */
  context?: "tickets" | "experience";
}

export function BeneficiaryRequiredSheet({ open, onOpenChange, context = "tickets" }: Props) {
  const navigate = useNavigate();
  const isExperience = context === "experience";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="light-sheet rounded-t-3xl border-border bg-background px-6 pb-8 pt-6"
      >
        <SheetHeader className="items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <Landmark className="w-7 h-7 text-primary" />
          </div>
          <SheetTitle className="text-xl text-foreground">
            Configura tus datos de cobro
          </SheetTitle>
        </SheetHeader>

        <p className="text-sm text-muted-foreground text-center mt-3 leading-relaxed">
          {isExperience
            ? "Para cobrar reservas de experiencias necesitamos los datos de tu cuenta bancaria. Los pagos se procesan por QR y recibirás el dinero al día siguiente automáticamente en tu cuenta."
            : "Para vender entradas necesitamos los datos de tu cuenta bancaria. Los pagos se procesan por QR y recibirás el dinero al día siguiente automáticamente en tu cuenta."}
        </p>


        <Button
          type="button"
          variant="sheet-action"
          onClick={() => {
            onOpenChange(false);
            navigate("/settings/business/payments");
          }}
          className="w-full rounded-full mt-6 h-12"
        >
          Configurar cobros
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="w-full rounded-full mt-2 h-11"
        >
          Ahora no
        </Button>
      </SheetContent>
    </Sheet>
  );
}
