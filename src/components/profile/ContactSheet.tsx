import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Phone, Copy, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name?: string | null;
  phone?: string | null;
}

/** Bottom sheet showing a profile's contact phone with call / WhatsApp / copy actions. */
export const ContactSheet = ({ open, onOpenChange, name, phone }: ContactSheetProps) => {
  if (!phone) return null;

  const digits = phone.replace(/[^\d+]/g, "");
  const waNumber = digits.replace(/\D/g, "");

  const handleCopy = async () => {
    haptic("light");
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("Número copiado");
    } catch {
      toast.error("No se pudo copiar el número");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="light-sheet">
        <DrawerHeader className="text-left">
          <DrawerTitle>Contactar{name ? ` a ${name}` : ""}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Phone className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Teléfono</p>
              <p className="font-medium text-foreground truncate">{phone}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="sheet-action" asChild>
              <a href={`tel:${digits}`} onClick={() => haptic("light")}>
                <Phone className="w-4 h-4 mr-2" />
                Llamar
              </a>
            </Button>
            <Button variant="secondary" asChild>
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => haptic("light")}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </a>
            </Button>
            <Button variant="secondary" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
