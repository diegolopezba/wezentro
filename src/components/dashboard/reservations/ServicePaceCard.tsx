import type { ReservationAnalytics } from "@/hooks/useReservationAnalytics";

interface Props {
  service: ReservationAnalytics["service"];
  turnTime: number;
}

export const ServicePaceCard = ({ service, turnTime }: Props) => {
  if (!service || service.seated_count === 0) return null;

  const delay = Math.round(service.avg_seat_delay_min);
  const table = Math.round(service.avg_table_minutes);

  return (
    <section className="rounded-2xl bg-card border border-border p-4">
      <div className="mb-3">
        <h3 className="font-brand text-sm font-semibold text-foreground">
          Ritmo de servicio
        </h3>
        <p className="text-xs text-muted-foreground">
          Sobre {service.seated_count} mesa{service.seated_count === 1 ? "" : "s"} sentada
          {service.seated_count === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="text-lg font-bold text-foreground">
            {delay > 0 ? `+${delay}` : delay} min
          </p>
          <p className="text-xs text-muted-foreground">Sentado vs. hora reservada</p>
        </div>
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="text-lg font-bold text-foreground">{table} min</p>
          <p className="text-xs text-muted-foreground">Duración media de mesa</p>
        </div>
      </div>

      {table > 0 && Math.abs(table - turnTime) > 15 && (
        <p className="text-xs text-muted-foreground mt-3">
          Tu turno configurado es de {turnTime} min pero las mesas duran {table} min.
          Ajustarlo mejora la precisión de tu disponibilidad.
        </p>
      )}
    </section>
  );
};
