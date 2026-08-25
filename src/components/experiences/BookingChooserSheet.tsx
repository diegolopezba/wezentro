import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { CalendarCheck, ChevronRight, Sparkles } from "lucide-react";
import type { Experience } from "@/hooks/useExperiences";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the business also offers table reservations. */
  showTableReservation: boolean;
  experiences: Experience[];
  onSelectTable: () => void;
  onSelectExperience: (experience: Experience) => void;
}

/**
 * First slide of the booking flow when a business offers more than one thing
 * to book: a table (food businesses) and/or one or more experiences.
 * Only the relevant rows are rendered, so a business with a single offering
 * never shows this sheet (callers skip it).
 */
export function BookingChooserSheet({
  open,
  onOpenChange,
  showTableReservation,
  experiences,
  onSelectTable,
  onSelectExperience,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="light-sheet rounded-t-3xl px-6 pb-8 pt-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg">Reservar</SheetTitle>
        </SheetHeader>

        <div className="space-y-2">
          {showTableReservation && (
            <button
              type="button"
              onClick={onSelectTable}
              className="w-full flex items-center gap-3 rounded-2xl bg-secondary/60 border border-border px-4 py-3 text-left active:bg-secondary transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Reservar mesa</p>
                <p className="text-xs text-muted-foreground">Elegí fecha, hora y cuántas personas</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          )}

          {experiences.map((exp) => (
            <button
              key={exp.id}
              type="button"
              onClick={() => onSelectExperience(exp)}
              className="w-full flex items-center gap-3 rounded-2xl bg-secondary/60 border border-border px-4 py-3 text-left active:bg-secondary transition-colors"
            >
              {exp.image_url ? (
                <img
                  src={exp.image_url}
                  alt={exp.title}
                  className="w-10 h-10 rounded-xl object-cover shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{exp.title}</p>
                <p className="text-xs text-muted-foreground">{exp.duration_minutes} min · Reserva con pago anticipado</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
