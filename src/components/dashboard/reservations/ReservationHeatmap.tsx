import { useMemo, useState } from "react";
import type { ReservationAnalytics } from "@/hooks/useReservationAnalytics";

const DAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

interface Props {
  heatmap: ReservationAnalytics["heatmap"];
}

export const ReservationHeatmap = ({ heatmap }: Props) => {
  const [selected, setSelected] = useState<{ dow: number; hour: number } | null>(null);

  const { hours, cells, max } = useMemo(() => {
    const hoursSet = new Set<number>();
    const map = new Map<string, { count: number; covers: number }>();
    let maxCovers = 0;
    heatmap.forEach((c) => {
      hoursSet.add(c.hour);
      map.set(`${c.dow}-${c.hour}`, { count: c.count, covers: c.covers });
      if (c.covers > maxCovers) maxCovers = c.covers;
    });
    return {
      hours: Array.from(hoursSet).sort((a, b) => a - b),
      cells: map,
      max: Math.max(1, maxCovers),
    };
  }, [heatmap]);

  if (heatmap.length === 0) {
    return (
      <section className="rounded-2xl bg-card border border-border p-4">
        <h3 className="font-brand text-sm font-semibold text-foreground mb-1">
          Cuándo se llena tu local
        </h3>
        <p className="text-sm text-muted-foreground py-4 text-center">
          Aún no hay suficientes datos.
        </p>
      </section>
    );
  }

  const sel = selected ? cells.get(`${selected.dow}-${selected.hour}`) : null;

  return (
    <section className="rounded-2xl bg-card border border-border p-4">
      <div className="mb-3">
        <h3 className="font-brand text-sm font-semibold text-foreground">
          Cuándo se llena tu local
        </h3>
        <p className="text-xs text-muted-foreground">Covers por día y franja horaria</p>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-max">
          <div className="flex gap-1 mb-1 pl-9">
            {hours.map((h) => (
              <span
                key={h}
                className="w-8 text-center text-[10px] text-muted-foreground"
              >
                {h}h
              </span>
            ))}
          </div>
          {DAYS_ES.map((label, dow) => (
            <div key={label} className="flex items-center gap-1 mb-1">
              <span className="w-8 text-[11px] text-muted-foreground">{label}</span>
              {hours.map((h) => {
                const cell = cells.get(`${dow}-${h}`);
                const intensity = cell ? Math.max(0.15, cell.covers / max) : 0;
                const isSel = selected?.dow === dow && selected?.hour === h;
                return (
                  <button
                    key={h}
                    onClick={() =>
                      setSelected(isSel || !cell ? null : { dow, hour: h })
                    }
                    className={`w-8 h-7 rounded-md border transition-colors ${
                      isSel ? "border-primary" : "border-transparent"
                    } ${cell ? "" : "bg-secondary/40"}`}
                    style={
                      cell
                        ? { backgroundColor: `hsl(var(--primary) / ${intensity})` }
                        : undefined
                    }
                    aria-label={`${label} ${h}h`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        {sel && selected
          ? `${DAYS_ES[selected.dow]} ${selected.hour}h · ${sel.count} reserva${
              sel.count === 1 ? "" : "s"
            } · ${sel.covers} covers`
          : "Toca una celda para ver el detalle"}
      </p>
    </section>
  );
};
