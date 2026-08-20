import { lazy, Suspense } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { MapPin, Clock, Phone, Loader2 } from "lucide-react";
import { parseSchedule, type DaySchedule } from "./BusinessHoursEditor";

const BusinessMiniMap = lazy(() => import("./BusinessMiniMap"));


const SHORT_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function isOpenNow(schedule: DaySchedule[]): boolean {
  const now = new Date();
  // JS getDay: 0=Sun … 6=Sat → convert to Mon=0 … Sun=6
  const jsDay = now.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const entry = schedule[dayIndex];
  if (!entry?.open) return false;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm >= entry.from && hhmm < entry.to;
}

interface BusinessInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName?: string | null;
  address?: string | null;
  hours?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export const BusinessInfoSheet = ({
  open,
  onOpenChange,
  businessName,
  address,
  hours,
  phone,
  latitude,
  longitude,
}: BusinessInfoSheetProps) => {
  const hasAnyInfo = address || hours || phone;
  if (!hasAnyInfo) return null;

  const schedule = parseSchedule(hours ?? null);
  const openNow = schedule ? isOpenNow(schedule) : null;
  const hasCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Ubicación</p>
                <p className="text-sm text-muted-foreground mt-0.5">{address}</p>
                {open && hasCoords && (
                  <Suspense
                    fallback={
                      <div className="mt-2 h-[140px] w-full rounded-xl bg-secondary flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                      </div>
                    }
                  >
                    <BusinessMiniMap
                      latitude={latitude as number}
                      longitude={longitude as number}
                      name={businessName}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          )}


          {hours && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Horarios</p>

                {schedule ? (
                  <div className="mt-2 space-y-1">
                    {schedule.map((d) => (
                      <div key={d.day} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground w-10">{SHORT_DAYS[d.day]}</span>
                        {d.open ? (
                          <span className="text-foreground">{d.from} – {d.to}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Cerrado</span>
                        )}
                      </div>
                    ))}

                    {openNow !== null && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                        <span className={`w-2 h-2 rounded-full ${openNow ? "bg-green-500" : "bg-muted-foreground"}`} />
                        <span className={`text-xs font-medium ${openNow ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          {openNow ? "Abierto ahora" : "Cerrado ahora"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{hours}</p>
                )}
              </div>
            </div>
          )}

          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50"
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
