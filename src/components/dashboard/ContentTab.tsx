import { Suspense, lazy, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Eye, Heart, Share2, Users, UserCheck, Megaphone } from "lucide-react";
import { EventPerformance, useEventPerformance } from "@/hooks/useBusinessAnalytics";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const EngagementChart = lazy(() => import("@/components/dashboard/EngagementChart").then(m => ({ default: m.EngagementChart })));

const EventCard = ({ event }: { event: EventPerformance }) => {
  const [expanded, setExpanded] = useState(false);
  const reach = event.views_count; // unique in future, for now total
  const engagementActions = event.likes_count + event.guestlist_requests + (event as any).shares_count || 0;
  const engagementRate = reach > 0 ? Math.round((engagementActions / reach) * 100) : 0;

  return (
    <m.div layout className="rounded-2xl bg-card border border-border overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-3 text-left">
        {event.image_url ? (
          <img src={event.image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-secondary flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            {event.start_datetime ? format(new Date(event.start_datetime), "d MMM yyyy", { locale: es }) : "—"}
          </p>
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{reach}</span>
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{event.likes_count}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.guestlist_requests}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-foreground">{engagementRate}%</p>
          <p className="text-[10px] text-muted-foreground">engagement</p>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground mx-auto mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mx-auto mt-1" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 grid grid-cols-2 gap-2">
              <Stat label="Alcance" value={reach} icon={Eye} />
              <Stat label="Likes" value={event.likes_count} icon={Heart} />
              <Stat label="Guestlist" value={event.guestlist_requests} icon={Users} />
              <Stat label="Check-ins" value={event.checked_in} icon={UserCheck} />
              <Stat label="Aprobados" value={event.approved_guests} icon={UserCheck} />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
};

const Stat = ({ label, value, icon: Icon }: { label: string; value: number; icon: any }) => (
  <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
    <Icon className="w-3.5 h-3.5 text-primary" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

export const ContentTab = () => {
  const { data: events, isLoading } = useEventPerformance();

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <h2 className="font-brand text-lg font-semibold text-foreground">Rendimiento de Contenido</h2>

      {!events || events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aún no has creado eventos</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {events && events.length > 1 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Comparación de Eventos</h3>
          <Suspense fallback={<Skeleton className="h-64" />}>
            <EngagementChart events={events} isLoading={false} />
          </Suspense>
        </div>
      )}
    </div>
  );
};
