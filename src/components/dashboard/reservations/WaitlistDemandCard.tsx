import type { ReservationAnalytics } from "@/hooks/useReservationAnalytics";

const DAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

interface Props {
  waitlist: ReservationAnalytics["waitlist"];
}

export const WaitlistDemandCard = ({ waitlist }: Props) => {
  return (
    <section className="rounded-2xl bg-card border border-border p-4">
      <div className="mb-3">
        <h3 className="font-brand text-sm font-semibold text-foreground">
          Demanda no atendida
        </h3>
        <p className="text-xs text-muted-foreground">
          Personas que quedaron en lista de espera
        </p>
      </div>

      {waitlist.total === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Nadie quedó en lista de espera en este periodo.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-lg font-bold text-foreground">{waitlist.total}</p>
              <p className="text-xs text-muted-foreground">En espera</p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-lg font-bold text-foreground">{waitlist.people}</p>
              <p className="text-xs text-muted-foreground">Personas</p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-lg font-bold text-foreground">{waitlist.converted}</p>
              <p className="text-xs text-muted-foreground">Convertidas</p>
            </div>
          </div>

          {waitlist.top_slots.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Más demanda sin cubrir:{" "}
              {waitlist.top_slots
                .map((s) => `${DAYS_ES[s.dow]} ${s.hour}h (${s.count})`)
                .join(" · ")}
              . Abrir más turnos ahí puede aumentar tus covers.
            </p>
          )}
        </>
      )}
    </section>
  );
};
