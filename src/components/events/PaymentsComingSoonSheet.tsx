import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentsComingSoonSheet({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-border bg-background px-6 pb-8 pt-6"
      >
        <SheetHeader className="items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <Ticket className="w-7 h-7 text-primary" />
          </div>
          <SheetTitle className="text-xl text-foreground">
            Pagos disponibles muy pronto
          </SheetTitle>
        </SheetHeader>

        <p className="text-sm text-muted-foreground text-center mt-4 leading-relaxed">
          Estamos puliendo el sistema de pagos para que vender entradas sea súper
          fácil y seguro. Estará disponible en aproximadamente{" "}
          <span className="text-foreground font-medium">2 semanas</span>.
          <br />
          <br />
          Mientras tanto, podés publicar tu evento como{" "}
          <span className="text-foreground font-medium">gratis</span> (sin entradas)
          y empezar a generar comunidad desde ya.
        </p>

        <Button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full rounded-full mt-6 h-12 bg-primary text-primary-foreground active:bg-primary/90"
        >
          Entendido
        </Button>
      </SheetContent>
    </Sheet>
  );
}
