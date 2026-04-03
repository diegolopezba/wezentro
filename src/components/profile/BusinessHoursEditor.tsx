import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DaySchedule {
  day: number;
  open: boolean;
  from: string;
  to: string;
}

const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

export const DEFAULT_SCHEDULE: DaySchedule[] = DAY_LABELS.map((_, i) => ({
  day: i,
  open: i < 5,
  from: "09:00",
  to: "18:00",
}));

export function parseSchedule(raw: string | null | undefined): DaySchedule[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 7 && typeof parsed[0]?.day === "number") {
      return parsed as DaySchedule[];
    }
  } catch {}
  return null;
}

export function serializeSchedule(schedule: DaySchedule[]): string {
  return JSON.stringify(schedule);
}

interface BusinessHoursEditorProps {
  value: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
}

export const BusinessHoursEditor = ({ value, onChange }: BusinessHoursEditorProps) => {
  const update = (dayIndex: number, patch: Partial<DaySchedule>) => {
    const next = value.map((d) => (d.day === dayIndex ? { ...d, ...patch } : d));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.map((day) => (
        <div
          key={day.day}
          className={`flex flex-col gap-2 p-3 rounded-xl border transition-colors ${
            day.open ? "bg-card border-border" : "bg-muted/40 border-transparent"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${day.open ? "text-foreground" : "text-muted-foreground"}`}>
              {DAY_LABELS[day.day]}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{day.open ? "Abierto" : "Cerrado"}</span>
              <Switch checked={day.open} onCheckedChange={(v) => update(day.day, { open: v })} />
            </div>
          </div>

          {day.open && (
            <div className="flex items-center gap-2 pl-1">
              <Select value={day.from} onValueChange={(v) => update(day.day, { from: v })}>
                <SelectTrigger className="h-8 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">–</span>
              <Select value={day.to} onValueChange={(v) => update(day.day, { to: v })}>
                <SelectTrigger className="h-8 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
