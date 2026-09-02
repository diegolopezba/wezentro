import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  isTomorrow,
  isSameDay,
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
import { useBusinessReservationsByDate, useReservationRealtime, type ReservationWithGuests } from "@/hooks/useReservations";
import { ReservationDetailSheet } from "@/components/reservations/ReservationDetailSheet";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { DayPill, STATUS_LABEL, STATUS_STYLE, TimelineSlot, dayLabel } from "./gestionShared";

type StatusFilter = "active" | "seated" | "completed" | "no_show" | "cancelled";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "active", label: "Activas" },
  { key: "seated", label: "Sentadas" },
  { key: "completed", label: "Completadas" },
  { key: "no_show", label: "No-shows" },
  { key: "cancelled", label: "Canceladas" },
];

const matchesFilter = (status: string, f: StatusFilter) =>
  f === "active" ? status === "confirmed" || status === "seated" : status === f;



export const ReservasGestionTab = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Date>(new Date());
  const [detail, setDetail] = useState<ReservationWithGuests | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("active");
  const [showPast, setShowPast] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  // One generous range covers both the week strip indicators and any month jumps.
  const rangeFrom = format(startOfWeek(startOfMonth(selected), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const rangeTo = format(endOfWeek(endOfMonth(selected), { weekStartsOn: 0 }), "yyyy-MM-dd");

  const { data: reservations, isLoading } = useBusinessReservationsByDate(
    user?.id,
    rangeFrom,
    rangeTo,
  );

  // New guest bookings appear instantly without manual refresh.
  useReservationRealtime(user?.id);

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

  const filterCounts = useMemo(() => {
    const counts = {} as Record<StatusFilter, number>;
    FILTERS.forEach((f) => {
      counts[f.key] = dayRows.filter((r) => matchesFilter(r.status, f.key)).length;
    });
    return counts;
  }, [dayRows]);

  const visibleRows = dayRows.filter((r) => matchesFilter(r.status, filter));

  // Group by time slot; empty slots are never rendered.
  const slots = useMemo(() => {
    const map = new Map<string, ReservationWithGuests[]>();
    visibleRows.forEach((r) => {
      const t = r.reservation_time.slice(0, 5);
      const arr = map.get(t) || [];
      arr.push(r);
      map.set(t, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, selectedKey, filter]);

  const viewingToday = isToday(selected);
  const nowHHmm = format(new Date(), "HH:mm");
  const pastSlots = viewingToday ? slots.filter(([t]) => t < nowHHmm) : [];
  const upcomingSlots = viewingToday ? slots.filter(([t]) => t >= nowHHmm) : slots;

  // Reset the collapsed-past toggle when the context changes.
  useEffect(() => setShowPast(false), [selectedKey, filter]);


  const weekStart = startOfWeek(selected, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Keep the selected day visible in the horizontal strip.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>("[data-selected]");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  // Both views show 7 days, so arrows always move by week.
  const shift = (dir: 1 | -1) => setSelected((d) => addWeeks(d, dir));

  const openDetail = (r: ReservationWithGuests) => {
    setDetail(r);
    setDetailOpen(true);
  };

  const renderCard = (r: ReservationWithGuests) => {
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
          <span
            className={cn(
              "shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium",
              STATUS_STYLE[r.status] ?? "bg-secondary text-muted-foreground",
            )}
          >
            {STATUS_LABEL[r.status] ?? r.status}
          </span>
        )}
      </button>
    );
  };

  const renderSlot = (time: string, rows: ReservationWithGuests[], past: boolean) => (
    <TimelineSlot key={time} time={time} past={past}>
      {rows.map(renderCard)}
    </TimelineSlot>
  );

  return (
    <div className="space-y-4">
      {/* Header: title + view toggle + jump-to-date */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-brand text-lg font-semibold text-foreground">Reservas</h2>
        <div className="flex items-center gap-2">
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
          aria-label="Semana anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-medium text-foreground capitalize">{dayLabel(selected)}</p>
        <button
          onClick={() => shift(1)}
          className="p-2 rounded-full text-muted-foreground active:opacity-60 [-webkit-tap-highlight-color:transparent]"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Horizontal day-picker strip */}
      <div
        ref={stripRef}
        className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {weekDays.map((d) => (
          <DayPill
            key={format(d, "yyyy-MM-dd")}
            date={d}
            selected={isSameDay(d, selected)}
            count={activeCountFor(format(d, "yyyy-MM-dd"))}
            onSelect={setSelected}
          />
        ))}
      </div>

      {/* Compact totals for the selected day */}
      <p className="text-xs text-muted-foreground px-1">
        <span className="font-semibold text-foreground">{activeRows.length}</span>{" "}
        reservas · <span className="font-semibold text-foreground">{totalGuests}</span>{" "}
        personas
      </p>

      {/* Status filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium select-none [-webkit-tap-highlight-color:transparent] active:scale-95 transition-colors",
              filter === f.key
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border",
            )}
          >
            {f.label} {filterCounts[f.key] ?? 0}
          </button>
        ))}
      </div>

      {/* Vertical timeline, only slots that have reservations */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-5 text-center">
          <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sin reservas para este filtro</p>
        </div>
      ) : (
        <div className="space-y-4">
          {viewingToday && pastSlots.length > 0 && (
            <>
              {showPast && pastSlots.map(([time, rows]) => renderSlot(time, rows, true))}
              <button
                onClick={() => setShowPast((v) => !v)}
                className="text-xs text-muted-foreground underline underline-offset-2 active:opacity-60 [-webkit-tap-highlight-color:transparent]"
              >
                {showPast
                  ? "Ocultar horas anteriores"
                  : `Ver ${pastSlots.length} horas anteriores`}
              </button>
            </>
          )}

          {viewingToday && upcomingSlots.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                Ahora {nowHHmm}
              </span>
              <span className="flex-1 h-px bg-primary/40" />
            </div>
          )}

          {upcomingSlots.map(([time, rows]) => renderSlot(time, rows, false))}
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
