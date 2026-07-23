import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Briefcase, Check } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERKS = [
  "Vender entradas con pago QR",
  "Listas de invitados y check-in",
  "Dashboard con analíticas",
  "Menú y reservas",
];

export function BusinessRequiredSheet({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-border bg-background px-6 pb-8 pt-6"
      >
        <SheetHeader className="items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <Briefcase className="w-7 h-7 text-primary" />
          </div>
          <SheetTitle className="text-xl text-foreground">
            Solo cuentas Business pueden vender entradas
          </SheetTitle>
        </SheetHeader>

        <p className="text-sm text-muted-foreground text-center mt-3 leading-relaxed">
          Cualquier persona puede crear eventos gratis. Para cobrar entradas
          necesitas activar tu cuenta Business — es gratis y toma menos de un minuto.
        </p>

        <ul className="mt-5 space-y-2">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-3 text-sm text-foreground">
              <Check className="w-4 h-4 text-primary shrink-0" />
              {p}
            </li>
          ))}
        </ul>

        <Button
          type="button"
          onClick={() => {
            onOpenChange(false);
            navigate("/settings/business");
          }}
          className="w-full rounded-full mt-6 h-12 bg-primary text-primary-foreground active:bg-primary/90"
        >
          Activar cuenta Business
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
