import { Instagram } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

interface TicketInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TicketInfoSheet = ({ open, onOpenChange }: TicketInfoSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="light-sheet rounded-t-3xl border-t border-border bg-background p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-2 text-left">
          <SheetTitle className="text-xl font-bold">
            Comparte tu entrada 🎟️
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-8 pt-2 space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-secondary/60 p-4">
            <Instagram className="w-5 h-5 mt-0.5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Súbela a tu historia de Instagram y etiqueta el evento. Así tus
              amigos saben que vas y pueden unirse contigo. Mientras más gente,
              mejor la noche 🔥
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Tip: haz una captura de esta pantalla y publícala. Tu código QR es
            personal, no lo compartas.
          </p>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full rounded-full font-semibold active:scale-95"
            size="lg"
          >
            Entendido
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
