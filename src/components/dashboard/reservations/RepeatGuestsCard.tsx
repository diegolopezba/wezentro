import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { haptic } from "@/lib/haptics";
import type { ReservationAnalytics } from "@/hooks/useReservationAnalytics";

interface Props {
  guests: ReservationAnalytics["guests"];
}

export const RepeatGuestsCard = ({ guests }: Props) => {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl bg-card border border-border p-4">
      <div className="mb-3">
        <h3 className="font-brand text-sm font-semibold text-foreground">
          Clientes que vuelven
        </h3>
        <p className="text-xs text-muted-foreground">
          {guests.repeat_rate !== null
            ? `${guests.repeat_rate}% de tus clientes reservó más de una vez`
            : "Aún no hay suficientes datos"}
        </p>
      </div>

      {guests.top.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Aún no hay reservas con clientes registrados.
        </p>
      ) : (
        <div className="space-y-2">
          {guests.top.map((g, i) => (
            <button
              key={g.user_id}
              onClick={() => {
                haptic("light");
                navigate(`/user/${g.user_id}`);
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-xl text-left active:bg-secondary transition-colors ${
                i === 0 ? "bg-primary/5 border border-primary/20" : ""
              }`}
            >
              <span
                className={`w-5 shrink-0 text-center text-sm font-semibold ${
                  i === 0 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <Avatar className="w-9 h-9">
                <AvatarImage src={g.avatar_url || DEFAULT_AVATAR} />
                <AvatarFallback>{(g.full_name || "?").charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {g.full_name || g.username || "Usuario"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {g.reservations} reserva{g.reservations === 1 ? "" : "s"} · {g.covers}{" "}
                  covers
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
