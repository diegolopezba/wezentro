import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LeaveGuestlistDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  isPending?: boolean;
}

export function LeaveGuestlistDrawer({ open, onOpenChange, onConfirm, isPending }: LeaveGuestlistDrawerProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-center">
          <DrawerTitle className="font-brand text-xl">¿Salir de la lista?</DrawerTitle>
          <DrawerDescription>
            Si abandonas la lista perderás tu lugar en este evento.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="flex-row gap-3">
          <Button
            variant="ghost"
            className="flex-1 rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 rounded-full bg-destructive text-destructive-foreground"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salir de la lista"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
