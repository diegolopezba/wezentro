import type { ReservationAnalytics } from "@/hooks/useReservationAnalytics";

interface Props {
  data: ReservationAnalytics;
}

const ACTOR_LABEL: Record<string, string> = {
  business: "Negocio",
  user: "Cliente",
  customer: "Cliente",
  desconocido: "Sin registro",
};

export const CancellationsCard = ({ data }: Props) => {
  const { cancellations, current } = data;
  const actors = Object.entries(cancellations.by_actor || {});
  const totalActors = actors.reduce((s, [, v]) => s + Number(v), 0);
  const topHour = cancellations.by_hour?.[0];

  const hasData = current.cancelled > 0 || current.no_shows > 0;

  return (
    <section className="rounded-2xl bg-card border border-border p-4">
      <div className="mb-3">
        <h3 className="font-brand text-sm font-semibold text-foreground">
          Cancelaciones y no-shows
        </h3>
        <p className="text-xs text-muted-foreground">
          {cancellations.lost_covers} covers perdidos en el periodo
        </p>
      </div>

      {!hasData ? (
        <p className="text-sm text-muted-foreground py-2">
          Sin cancelaciones ni no-shows en este periodo. Excelente.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-lg font-bold text-foreground">{current.cancelled}</p>
              <p className="text-xs text-muted-foreground">
                Canceladas ({current.cancel_rate ?? 0}%)
              </p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-lg font-bold text-foreground">{current.no_shows}</p>
              <p className="text-xs text-muted-foreground">
                No-shows ({current.no_show_rate ?? 0}%)
              </p>
            </div>
          </div>

          {totalActors > 0 && (
            <div className="space-y-2 mb-3">
              {actors.map(([actor, count]) => (
                <div key={actor} className="flex items-center gap-3">
                  <span className="w-20 text-[11px] text-muted-foreground">
                    {ACTOR_LABEL[actor] || actor}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(Number(count) / totalActors) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11px] text-muted-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {topHour
              ? `La franja de las ${topHour.hour}h concentra más bajas. `
              : ""}
            {(current.no_show_rate ?? 0) > 10
              ? "Considera un recordatorio más cerca de la hora de la reserva o una ventana de cancelación más corta."
              : "Mantén los recordatorios activos para conservar esta tasa."}
          </p>
        </>
      )}
    </section>
  );
};
