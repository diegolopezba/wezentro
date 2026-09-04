import { useMemo } from "react";
import type { ReservationAnalytics } from "@/hooks/useReservationAnalytics";

const DAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

interface Props {
  data: ReservationAnalytics;
}

export const OccupancyCard = ({ data }: Props) => {
  const { capacity, heatmap, range } = data;

  const rows = useMemo(() => {
    const seats = capacity.active_seats;
    const turn = capacity.turn_time || 90;
    if (!seats || capacity.shifts.length === 0) return [];

    // Capacidad de un día de servicio por weekday
    const capByDay: Record<number, number> = {};
    capacity.shifts.forEach((s) => {
      const turns = Math.max(1, Math.floor(Number(s.minutes) / turn));
      capByDay[s.weekday] = (capByDay[s.weekday] || 0) + turns * seats;
    });

    // Ocurrencias de cada weekday dentro del rango
    const occurrences: Record<number, number> = {};
    if (range.from && range.to) {
      const start = new Date(`${range.from}T00:00:00`);
      const end = new Date(`${range.to}T00:00:00`);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const w = d.getDay();
        occurrences[w] = (occurrences[w] || 0) + 1;
      }
    }

    const coversByDay: Record<number, number> = {};
    heatmap.forEach((c) => {
      coversByDay[c.dow] = (coversByDay[c.dow] || 0) + c.covers;
    });

    return Object.keys(capByDay)
      .map(Number)
      .sort((a, b) => a - b)
      .map((w) => {
        const occ = occurrences[w] || 1;
        const avgCovers = (coversByDay[w] || 0) / occ;
        const pct = Math.min(100, Math.round((avgCovers / capByDay[w]) * 100));
        return { weekday: w, avgCovers, capacity: capByDay[w], pct };
      });
  }, [capacity, heatmap, range]);

  if (rows.length === 0) {
    return (
      <section className="rounded-2xl bg-card border border-border p-4">
        <h3 className="font-brand text-sm font-semibold text-foreground mb-1">
          Ocupación vs. capacidad
        </h3>
        <p className="text-sm text-muted-foreground py-3">
          Configura tus mesas y horarios de reserva para ver tu nivel de ocupación.
        </p>
      </section>
    );
  }

  const weakest = [...rows].sort((a, b) => a.pct - b.pct)[0];

  return (
    <section className="rounded-2xl bg-card border border-border p-4">
      <div className="mb-3">
        <h3 className="font-brand text-sm font-semibold text-foreground">
          Ocupación vs. capacidad
        </h3>
        <p className="text-xs text-muted-foreground">
          {capacity.table_count} mesas · {capacity.active_seats} asientos · turnos de{" "}
          {capacity.turn_time} min
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.weekday} className="flex items-center gap-3">
            <span className="w-8 text-[11px] text-muted-foreground">
              {DAYS_ES[r.weekday]}
            </span>
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${r.pct}%` }}
              />
            </div>
            <span className="w-20 text-right text-[11px] text-muted-foreground">
              {r.pct}% · {Math.round(r.avgCovers)}/{r.capacity}
            </span>
          </div>
        ))}
      </div>

      {weakest && weakest.pct < 40 && (
        <p className="text-xs text-muted-foreground mt-3">
          Tu día más flojo es {DAYS_ES[weakest.weekday]} ({weakest.pct}%). Una promoción
          para ese día puede llenar mesas vacías.
        </p>
      )}
    </section>
  );
};
