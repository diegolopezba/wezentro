import { useNavigate } from "react-router-dom";
import { m } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { useFanBase, type FanBaseEntry } from "@/hooks/useBusinessAnalytics";
import { haptic } from "@/lib/haptics";

const buildBreakdown = (fan: FanBaseEntry): string => {
  const parts: string[] = [];
  if (fan.events_attended > 0) parts.push(`${fan.events_attended} asistencia${fan.events_attended === 1 ? "" : "s"}`);
  if (fan.tickets > 0) parts.push(`${fan.tickets} entrada${fan.tickets === 1 ? "" : "s"}`);
  if (fan.lounges > 0) parts.push(`${fan.lounges} lounge${fan.lounges === 1 ? "" : "s"}`);
  if (fan.experiences > 0) parts.push(`${fan.experiences} experiencia${fan.experiences === 1 ? "" : "s"}`);
  if (fan.reservations > 0) parts.push(`${fan.reservations} reserva${fan.reservations === 1 ? "" : "s"}`);
  if (fan.comments > 0) parts.push(`${fan.comments} comentario${fan.comments === 1 ? "" : "s"}`);
  if (fan.likes > 0) parts.push(`${fan.likes} like${fan.likes === 1 ? "" : "s"}`);
  return parts.slice(0, 3).join(" · ");
};

export const FanBaseSection = () => {
  const navigate = useNavigate();
  const { data: fans, isLoading } = useFanBase(10);

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="mb-4">
        <p className="font-brand text-base font-semibold text-foreground">Fan base</p>
        <p className="text-xs text-muted-foreground">Tus 10 personas más activas</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : !fans || fans.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aún no hay suficiente actividad para calcular tu fan base.
        </p>
      ) : (
        <div className="space-y-2">
          {fans.map((fan, i) => (
            <m.button
              key={fan.user_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                haptic("light");
                navigate(`/user/${fan.user_id}`);
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-xl text-left active:bg-secondary transition-colors ${
                i < 3 ? "bg-primary/5 border border-primary/20" : ""
              }`}
            >
              <span
                className={`w-6 shrink-0 text-center text-sm font-semibold ${
                  i < 3 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <Avatar className="w-9 h-9">
                <AvatarImage src={fan.avatar_url || DEFAULT_AVATAR} />
                <AvatarFallback>{(fan.username || "U")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {fan.full_name || fan.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">{buildBreakdown(fan)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">{fan.score}</p>
                <p className="text-[10px] text-muted-foreground">puntos</p>
              </div>
            </m.button>
          ))}
        </div>
      )}
    </div>
  );
};
