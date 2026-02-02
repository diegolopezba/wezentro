import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { MapPin, Clock, Phone } from "lucide-react";

interface BusinessInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName?: string | null;
  address?: string | null;
  hours?: string | null;
  phone?: string | null;
}

export const BusinessInfoSheet = ({
  open,
  onOpenChange,
  businessName,
  address,
  hours,
  phone,
}: BusinessInfoSheetProps) => {
  const hasAnyInfo = address || hours || phone;

  if (!hasAnyInfo) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-left">
            {businessName || "Información del negocio"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
          {address && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Ubicación</p>
                <p className="text-sm text-muted-foreground mt-0.5">{address}</p>
              </div>
            </div>
          )}

          {hours && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Horarios</p>
                <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{hours}</p>
              </div>
            </div>
          )}

          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Teléfono</p>
                <p className="text-sm text-muted-foreground mt-0.5">{phone}</p>
              </div>
            </a>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
