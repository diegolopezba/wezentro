import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessAllEvents } from "@/hooks/useEvents";
import { EventDetailPanel } from "@/components/business/EventDetailPanel";
import { haptic } from "@/lib/haptics";

const pillDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-BO", { day: "numeric", month: "short" }) : "—";

export const EventosGestionTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useBusinessAllEvents(user?.id);
  const events = data?.events || [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current || events.length === 0) return;
    const idx = Math.min(data?.firstUpcomingIndex ?? 0, events.length - 1);
    setSelectedId(events[idx].id);
    didInit.current = true;
  }, [events, data?.firstUpcomingIndex]);

  useEffect(() => {
    if (!selectedId || !activeRef.current || !scrollerRef.current) return;
    const el = activeRef.current;
    scrollerRef.current.scrollLeft = el.offsetLeft - 8;
  }, [selectedId]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-28 rounded-full" />)}
        </div>
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">No tenés eventos todavía.</p>
        <button
          onClick={() => navigate("/create")}
          className="mt-4 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-foreground text-background text-sm font-medium active:scale-[0.98] transition-transform"
        >
          <CalendarPlus className="w-4 h-4" /> Crear evento
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={scrollerRef}
        className="-mx-4 px-4 flex gap-2 overflow-x-auto scrollbar-hide snap-x"
      >
        {events.map((e) => {
          const active = e.id === selectedId;
          return (
            <button
              key={e.id}
              ref={active ? activeRef : undefined}
              onClick={() => { haptic("light"); setSelectedId(e.id); }}
              className={`flex-shrink-0 snap-start max-w-[60vw] h-9 px-3.5 rounded-full border text-left transition-colors active:scale-[0.98] ${
                active
                  ? "bg-foreground text-background border-transparent"
                  : "bg-card text-foreground border-border"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {!e.is_public && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
                <span className="text-xs font-medium truncate max-w-[38vw]">{e.title}</span>
                <span className={`text-[10px] ${active ? "opacity-70" : "text-muted-foreground"}`}>
                  {pillDate(e.start_datetime)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selectedId && <EventDetailPanel key={selectedId} eventId={selectedId} />}
    </div>
  );
};
