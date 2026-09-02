import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

/** Shared building blocks for the Gestión tabs (Reservas / Experiencias). */

export const DAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export const STATUS_LABEL: Record<string, string> = {
  seated: "Comenzada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No-show",
};

// Color-coded so the host reads the day at a glance.
export const STATUS_STYLE: Record<string, string> = {
  seated: "bg-emerald-500/15 text-emerald-600",
  completed: "bg-sky-500/15 text-sky-600",
  no_show: "bg-amber-500/15 text-amber-600",
  cancelled: "bg-destructive/15 text-destructive",
};

export const dayLabel = (d: Date) => {
  if (isToday(d)) return "Hoy";
  if (isTomorrow(d)) return "Mañana";
  return format(d, "EEE d MMM", { locale: es });
};

interface DayPillProps {
  date: Date;
  selected: boolean;
  count: number;
  onSelect: (d: Date) => void;
}

export const DayPill = ({ date, selected, count, onSelect }: DayPillProps) => (
  <button
    data-selected={selected || undefined}
    onClick={() => onSelect(date)}
    className={cn(
      "flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-full border transition-colors select-none [-webkit-tap-highlight-color:transparent] active:scale-95 shrink-0 min-w-[3rem]",
      selected
        ? "bg-foreground text-background border-foreground"
        : "bg-transparent text-foreground border-border",
    )}
  >
    <span
      className={cn(
        "text-[9px] font-semibold uppercase tracking-wide",
        selected ? "text-background/70" : "text-muted-foreground",
      )}
    >
      {isToday(date) ? "Hoy" : DAYS_ES[date.getDay()]}
    </span>
    <span className="text-base font-bold leading-none">{date.getDate()}</span>
    <span
      className={cn(
        "text-[9px] leading-none",
        selected ? "text-background/70" : "text-muted-foreground",
      )}
    >
      {format(date, "MMM", { locale: es })}
    </span>
    <span
      className={cn(
        "w-1 h-1 rounded-full mt-0.5",
        count === 0 && "invisible",
        selected ? "bg-background" : "bg-primary",
      )}
    />
  </button>
);

/** One hour block of the vertical timeline: time rail on the left, cards on the right. */
export const TimelineSlot = ({
  time,
  past,
  children,
}: {
  time: string;
  past?: boolean;
  children: React.ReactNode;
}) => (
  <div className={cn("flex gap-3", past && "opacity-60")}>
    <div className="w-12 shrink-0 flex flex-col items-center">
      <span className="text-xs font-semibold text-foreground tabular-nums">{time}</span>
      <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 mt-1" />
      <span className="flex-1 w-px bg-border mt-1" />
    </div>
    <div className="flex-1 min-w-0 space-y-2">{children}</div>
  </div>
);
