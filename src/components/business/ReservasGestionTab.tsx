import { useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  isTomorrow,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, StickyNote, Users } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessReservationsByDate, type ReservationWithGuests } from "@/hooks/useReservations";
import { ReservationDetailSheet } from "@/components/reservations/ReservationDetailSheet";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

const DAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const STATUS_LABEL: Record<string, string> = {
  seated: "Sentada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No-show",
};

type ViewMode = "day" | "week";

const dayLabel = (d: Date) => {
  if (isToday(d)) return "Hoy";
  if (isTomorrow(d)) return "Mañana";
  return format(d, "EEE d MMM", { locale: es });
};

export const ReservasGestionTab = () => {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>("day");
  const [selected, setSelected] = useState<Date>(new Date());
  const [detail, setDetail] = useState<ReservationWithGuests | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // One generous range covers both the month calendar indicators and the week strip.
  const rangeFrom = format(startOfWeek(startOfMonth(selected), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const rangeTo = format(endOfWeek(endOfMonth(selected), { weekStartsOn: 0 }), "yyyy-MM-dd");

  const { data: reservations, isLoading } = useBusinessReservationsByDate(
    user?.id,
    rangeFrom,
    rangeTo,
  );

  const byDate = useMemo(() => {
    const map: Record<string, ReservationWithGuests[]> = {};
    (reservations || []).forEach((r) => {
      (map[r.reservation_date] ||= []).push(r);
    });
    return map;
  }, [reservations]);

  const activeCountFor = (dateStr: string) =>
    (byDate[dateStr] || []).filter((r) => r.status !== "cancelled").length;

  const selectedKey = format(selected, "yyyy-MM-dd");
  const dayRows = (byDate[selectedKey] || []).slice(); // already sorted by time
  const activeRows = dayRows.filter((r) => r.status !== "cancelled");
  const totalGuests = activeRows.reduce((s, r) => s + Number(r.party_size || 0), 0);

  const daysWithReservations = useMemo(
    () =>
      Object.entries(byDate)
        .filter(([, rows]) => rows.some((r) => r.status !== "cancelled"))
        .map(([d]) => parseISO(d)),
    [byDate],
  );

  const weekStart = startOfWeek(selected, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const shift = (dir: 1 | -1) =>
    setSelected((d) => (view === "day" ? addDays(d, dir) : addWeeks(d, dir)));

  const openDetail = (r: ReservationWithGuests) => {
    setDetail(r);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header: title + view toggle + jump-to-date */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-brand text-lg font-semibold text-foreground">Reservas</h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-secondary p-1 gap-1">
            {(["day", "week"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors select-none [-webkit-tap-highlight-color:transparent] active:scale-95",
                  view === v
                    ? "bg-foreground text-background"
                    : "text-muted-foreground",
                )}
              >
                {v === "day" ? "Día" : "Semana"}
              </button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                <CalendarDays className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(d) => d && setSelected(d)}
                locale={es}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Navigation arrows + current label */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          className="p-2 rounded-full text-muted-foreground active:opacity-60 [-webkit-tap-highlight-color:transparent]"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-medium text-foreground capitalize">
          {view === "day"
            ? dayLabel(selected)
            : `${format(weekStart, "d MMM", { locale: es })} – ${format(addDays(weekStart, 6), "d MMM", { locale: es })}`}
        </p>
        <button
          onClick={() => shift(1)}
          className="p-2 rounded-full text-muted-foreground active:opacity-60 [-webkit-tap-highlight-color:transparent]"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar / week strip */}
      {view === "day" ? (
        <section className="rounded-2xl bg-card border border-border p-2 flex justify-center">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => d && setSelected(d)}
            month={startOfMonth(selected)}
            onMonthChange={(m) => setSelected((cur) => (isSameDay(cur, m) ? cur : m))}
            locale={es}
            modifiers={{ hasReservations: daysWithReservations }}
            modifiersClassNames={{
              hasReservations:
                "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary",
            }}
          />
        </section>
      ) : (
        <section className="rounded-2xl bg-card border border-border p-3">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const count = activeCountFor(key);
              const isSelected = isSameDay(d, selected);
              return (
                <button
                  key={key}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 rounded-xl transition-colors select-none [-webkit-tap-highlight-color:transparent] active:scale-95",
                    isSelected ? "bg-foreground text-background" : "text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] uppercase",
                      isSelected ? "text-background/70" : "text-muted-foreground",
                    )}
                  >
                    {DAYS_ES[d.getDay()]}
                  </span>
                  <span className="text-sm font-semibold">{d.getDate()}</span>
                  <span
                    className={cn(
                      "text-[10px] leading-none h-3",
                      count === 0 && "invisible",
                      isSelected ? "text-background/70" : "text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Compact totals for the selected day */}
      <p className="text-xs text-muted-foreground px-1">
        <span className="font-semibold text-foreground">{activeRows.length}</span>{" "}
        reservas · <span className="font-semibold text-foreground">{totalGuests}</span>{" "}
        personas
      </p>

      {/* Chronological list */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : dayRows.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-5 text-center">
          <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sin reservas para este día</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dayRows.map((r) => {
            const people = [
              r.user ? { id: r.user.id, ...r.user } : null,
              ...(r.guests || []).map((g) => (g.user ? { id: g.user.id, ...g.user } : null)),
            ].filter(Boolean) as {
              id: string;
              username: string;
              full_name: string | null;
              avatar_url: string | null;
            }[];
            const extra = Math.max(0, people.length - 3);

            return (
              <button
                key={r.id}
                onClick={() => openDetail(r)}
                className={cn(
                  "w-full text-left p-3 rounded-2xl bg-card border border-border flex items-center gap-3 select-none [-webkit-tap-highlight-color:transparent] active:opacity-70",
                  r.status === "cancelled" && "opacity-60",
                )}
              >
                {/* Stacked avatars (max 3, then +N) */}
                <div className="flex -space-x-2 shrink-0">
                  {people.slice(0, 3).map((p) => (
                    <img
                      key={p.id}
                      src={p.avatar_url || DEFAULT_AVATAR}
                      alt={p.username}
                      className="w-8 h-8 rounded-full border-2 border-background object-cover bg-secondary"
                    />
                  ))}
                  {extra > 0 && (
                    <span className="w-8 h-8 rounded-full border-2 border-background bg-secondary text-[10px] font-semibold text-muted-foreground flex items-center justify-center">
                      +{extra}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {r.user?.full_name || r.user?.username || "Usuario"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{r.reservation_time.slice(0, 5)}</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {r.party_size}
                    </span>
                  </p>
                  {r.notes && (
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <StickyNote className="w-3 h-3 shrink-0" />
                      {r.notes}
                    </p>
                  )}
                </div>

                {r.status !== "confirmed" && (
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <ReservationDetailSheet
        reservation={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
};
