import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import {
  useReservationSchedules,
  useSaveSchedules,
  useReservationBlackouts,
  useToggleBlackout,
} from "@/hooks/useReservationConfig";
import { useDirtyBaseline, saveVariant } from "@/hooks/useDirtyBaseline";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { LockedFeature } from "@/components/subscriptions/LockedFeature";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface Shift {
  shift_name: string | null;
  start_time: string;
  end_time: string;
}

type DayState = { closed: boolean; shifts: Shift[] };

const defaultDay = (): DayState => ({
  closed: false,
  shifts: [{ shift_name: "Cena", start_time: "18:00", end_time: "23:00" }],
});

interface Props {
  businessId: string;
}

export const ReservationScheduleEditor = ({ businessId }: Props) => {
  const { data: schedules = [], isLoading } = useReservationSchedules(businessId);
  const save = useSaveSchedules(businessId);
  const { data: blackouts = [] } = useReservationBlackouts(businessId);
  const toggleBlackout = useToggleBlackout(businessId);
  const { tier, hasFeature } = useSubscriptionTier(businessId);
  const canMultiShift = hasFeature("multi_shift");
  const canBlackouts = hasFeature("blackout_dates");
  /** Nothing saved yet: the defaults on screen are not what customers see. */
  const neverConfigured = !isLoading && schedules.length === 0;

  const [days, setDays] = useState<DayState[]>(() =>
    Array.from({ length: 7 }, () => defaultDay())
  );
  const [newBlackout, setNewBlackout] = useState("");
  const { isDirty, capture } = useDirtyBaseline(days);

  useEffect(() => {
    if (isLoading) return;
    const next: DayState[] = Array.from({ length: 7 }, () => ({ closed: false, shifts: [] }));
    schedules.forEach((s) => {
      if (s.is_closed) {
        next[s.weekday].closed = true;
        return;
      }
      next[s.weekday].shifts.push({
        shift_name: s.shift_name,
        start_time: s.start_time.slice(0, 5),
        end_time: s.end_time.slice(0, 5),
      });
    });
    for (let i = 0; i < 7; i++) {
      if (!next[i].closed && next[i].shifts.length === 0) {
        if (schedules.length === 0) next[i] = defaultDay();
        else next[i].closed = true;
      }
    }
    setDays(next);
    capture(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules, isLoading]);

  const update = (i: number, patch: Partial<DayState>) =>
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const updateShift = (dayIdx: number, shiftIdx: number, patch: Partial<Shift>) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, shifts: d.shifts.map((s, j) => (j === shiftIdx ? { ...s, ...patch } : s)) }
          : d
      )
    );

  const addShift = (dayIdx: number) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              shifts: [
                ...d.shifts,
                { shift_name: "Almuerzo", start_time: "12:00", end_time: "15:00" },
              ],
            }
          : d
      )
    );

  const removeShift = (dayIdx: number, shiftIdx: number) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, shifts: d.shifts.filter((_, j) => j !== shiftIdx) } : d
      )
    );

  const handleSave = () => {
    const rows = days.flatMap((d, weekday) => {
      if (d.closed || d.shifts.length === 0) {
        return [
          {
            weekday,
            shift_name: null,
            start_time: "00:00",
            end_time: "00:00",
            is_closed: true,
          },
        ];
      }
      return d.shifts.map((s) => ({
        weekday,
        shift_name: s.shift_name,
        start_time: s.start_time,
        end_time: s.end_time,
        is_closed: false,
      }));
    });
    save.mutate(rows);
  };

  return (
    <div className="py-4 px-4 rounded-xl bg-card border border-border space-y-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-blue-500" />
        <Label className="text-foreground font-semibold">Horarios por día</Label>
      </div>

      {neverConfigured && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
          Todavía no publicaste tus horarios. Hasta que los guardes, tus clientes
          no verán horarios disponibles para reservar.
        </div>
      )}


      <div className="space-y-3">
        {days.map((d, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{DAYS[i]}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {d.closed ? "Cerrado" : "Abierto"}
                </span>
                <Switch
                  checked={!d.closed}
                  onCheckedChange={(v) =>
                    update(i, {
                      closed: !v,
                      shifts: !v ? d.shifts : d.shifts.length ? d.shifts : defaultDay().shifts,
                    })
                  }
                />
              </div>
            </div>

            {!d.closed &&
              d.shifts.map((s, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Input
                    value={s.shift_name ?? ""}
                    placeholder="Turno"
                    onChange={(e) => updateShift(i, j, { shift_name: e.target.value })}
                    className="h-8 flex-1"
                  />
                  <Input
                    type="time"
                    value={s.start_time}
                    onChange={(e) => updateShift(i, j, { start_time: e.target.value })}
                    className="h-8 w-[104px]"
                  />
                  <Input
                    type="time"
                    value={s.end_time}
                    onChange={(e) => updateShift(i, j, { end_time: e.target.value })}
                    className="h-8 w-[104px]"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeShift(i, j)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

            {!d.closed &&
              (canMultiShift || d.shifts.length === 0 ? (
                <Button variant="ghost" size="sm" onClick={() => addShift(i)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar turno
                </Button>
              ) : (
                <LockedFeature feature="multi_shift" currentTier={tier}>
                  <Button variant="ghost" size="sm">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Agregar turno
                  </Button>
                </LockedFeature>
              ))}
          </div>
        ))}
      </div>

      <Button
        variant={saveVariant(isDirty)}
        className="w-full rounded-full"
        onClick={() => { handleSave(); capture(days); }}
        disabled={!isDirty || save.isPending}
      >
        Guardar horarios
      </Button>

      {/* Blackouts */}
      <div className="pt-2 border-t border-border space-y-2">
        <Label className="text-sm text-foreground">Días cerrados (feriados)</Label>
        <LockedFeature feature="blackout_dates" currentTier={tier} locked={!canBlackouts}>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="date"
                value={newBlackout}
                onChange={(e) => setNewBlackout(e.target.value)}
                className="h-9"
              />
              <Button
                size="sm"
                disabled={!newBlackout}
                onClick={() => {
                  toggleBlackout.mutate({ date: newBlackout });
                  setNewBlackout("");
                }}
              >
                Agregar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {blackouts.map((b) => (
                <button
                  key={b.id}
                  onClick={() =>
                    toggleBlackout.mutate({ date: b.blackout_date, existingId: b.id })
                  }
                  className="px-3 py-1 rounded-full text-xs bg-secondary text-foreground flex items-center gap-1"
                >
                  {b.blackout_date}
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              ))}
            </div>
          </div>
        </LockedFeature>
      </div>
    </div>
  );
};
