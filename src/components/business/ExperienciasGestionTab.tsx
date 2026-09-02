import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
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
import {
  useBusinessExperienceBookingsByDate,
  useExperienceBookingsRealtime,
  type ExperienceBookingRow,
} from "@/hooks/useExperiences";
import { ExperienceBookingDetailSheet } from "@/components/experiences/ExperienceBookingDetailSheet";
import { DayPill, EXPERIENCE_STATUS_LABEL, STATUS_STYLE, TimelineSlot, dayLabel } from "./gestionShared";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

/** Operational day view of the business' experience bookings. */
export const ExperienciasGestionTab = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Date>(new Date());
  const [detail, setDetail] = useState<ExperienceBookingRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [experienceFilter, setExperienceFilter] = useState<string>("all");
  const [showPast, setShowPast] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const rangeFrom = format(startOfWeek(startOfMonth(selected), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const rangeTo = format(endOfWeek(endOfMonth(selected), { weekStartsOn: 0 }), "yyyy-MM-dd");

  const { data: bookings, isLoading } = useBusinessExperienceBookingsByDate(
    user?.id,
    rangeFrom,
    rangeTo,
  );

  // Owner-only realtime: new bookings appear without manual refresh.
  useExperienceBookingsRealtime(user?.id);

  const byDate = useMemo(() => {
    const map: Record<string, ExperienceBookingRow[]> = {};
    (bookings || []).forEach((b) => {
      (map[b.booking_date] ||= []).push(b);
    });
    return map;
  }, [bookings]);

  const activeCountFor = (dateStr: string) =>
    (byDate[dateStr] || []).filter((b) => b.status !== "cancelled").length;

  const selectedKey = format(selected, "yyyy-MM-dd");
  const dayRows = byDate[selectedKey] || [];
  const activeRows = dayRows.filter((b) => b.status !== "cancelled");
  const totalPeople = activeRows.reduce((s, b) => s + Number(b.quantity || 0), 0);
  const totalAmount = activeRows.reduce((s, b) => s + Number(b.amount || 0), 0);

  // Filters are the business' own experiences: one business can run several.
  const experienceFilters = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>();
    activeRows.forEach((b) => {
      const id = b.experience?.id;
      if (!id) return;
      const prev = map.get(id);
      map.set(id, {
        id,
        title: b.experience?.title || "Experiencia",
        count: (prev?.count ?? 0) + 1,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [activeRows]);

  // A filter for an experience with no bookings today would strand the view.
  useEffect(() => {
    if (experienceFilter !== "all" && !experienceFilters.some((f) => f.id === experienceFilter)) {
      setExperienceFilter("all");
    }
  }, [experienceFilters, experienceFilter]);

  const visibleRows = activeRows.filter(
    (b) => experienceFilter === "all" || b.experience?.id === experienceFilter,
  );

  // Group by time slot; empty slots are never rendered.
  const slots = useMemo(() => {
    const map = new Map<string, ExperienceBookingRow[]>();
    visibleRows.forEach((b) => {
      const t = b.booking_time.slice(0, 5);
      const arr = map.get(t) || [];
      arr.push(b);
      map.set(t, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, selectedKey, experienceFilter]);

  const viewingToday = isToday(selected);
  const nowHHmm = format(new Date(), "HH:mm");
  const pastSlots = viewingToday ? slots.filter(([t]) => t < nowHHmm) : [];
  const upcomingSlots = viewingToday ? slots.filter(([t]) => t >= nowHHmm) : slots;

  useEffect(() => setShowPast(false), [selectedKey, experienceFilter]);

  const weekStart = startOfWeek(selected, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>("[data-selected]");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  const shift = (dir: 1 | -1) => setSelected((d) => addWeeks(d, dir));

  const openDetail = (b: ExperienceBookingRow) => {
    setDetail(b);
    setDetailOpen(true);
  };

  const renderCard = (b: ExperienceBookingRow) => {
    const people = [
      b.user ? { ...b.user } : null,
      ...(b.guests || []).map((g) => (g.user ? { ...g.user } : null)),
    ].filter(Boolean) as { id: string; username: string; avatar_url: string | null }[];
    const extra = Math.max(0, people.length - 3);

    return (
      <button
        key={b.id}
        onClick={() => openDetail(b)}
        className="w-full text-left p-3 rounded-2xl bg-card border border-border flex items-center gap-3 select-none [-webkit-tap-highlight-color:transparent] active:opacity-70"
      >
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
            {b.user?.full_name || b.user?.username || "Usuario"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {b.experience?.title || "Experiencia"}
            {b.segment?.name ? ` · ${b.segment.name}` : ""}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{b.booking_time.slice(0, 5)}</span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {b.quantity}
            </span>
            <span>{Number(b.amount) > 0 ? `Bs. ${Number(b.amount)}` : "Gratis"}</span>
          </p>
          {b.notes && (
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <StickyNote className="w-3 h-3 shrink-0" />
              {b.notes}
            </p>
          )}
        </div>

        {b.status !== "confirmed" && (
          <span
            className={cn(
              "shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium",
              STATUS_STYLE[b.status] ?? "bg-secondary text-muted-foreground",
            )}
          >
            {EXPERIENCE_STATUS_LABEL[b.status] ?? b.status}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
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

      <p className="text-xs text-muted-foreground px-1">
        <span className="font-semibold text-foreground">{activeRows.length}</span> reservas ·{" "}
        <span className="font-semibold text-foreground">{totalPeople}</span> personas ·{" "}
        <span className="font-semibold text-foreground">Bs. {totalAmount}</span>
      </p>

      {experienceFilters.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ id: "all", title: "Todas", count: activeRows.length }, ...experienceFilters].map((f) => (
            <button
              key={f.id}
              onClick={() => setExperienceFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium select-none [-webkit-tap-highlight-color:transparent] active:scale-95 transition-colors",
                experienceFilter === f.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border",
              )}
            >
              {f.title} {f.count}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-5 text-center">
          <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sin reservas de experiencias este día</p>
        </div>
      ) : (
        <div className="space-y-4">
          {viewingToday && pastSlots.length > 0 && (
            <>
              {showPast &&
                pastSlots.map(([time, rows]) => (
                  <TimelineSlot key={time} time={time} past>
                    {rows.map(renderCard)}
                  </TimelineSlot>
                ))}
              <button
                onClick={() => setShowPast((v) => !v)}
                className="text-xs text-muted-foreground underline underline-offset-2 active:opacity-60 [-webkit-tap-highlight-color:transparent]"
              >
                {showPast ? "Ocultar horas anteriores" : `Ver ${pastSlots.length} horas anteriores`}
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

          {upcomingSlots.map(([time, rows]) => (
            <TimelineSlot key={time} time={time}>
              {rows.map(renderCard)}
            </TimelineSlot>
          ))}
        </div>
      )}

      <ExperienceBookingDetailSheet booking={detail} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};
