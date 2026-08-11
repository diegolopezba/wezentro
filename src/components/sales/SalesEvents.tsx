import { useNavigate } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreatorSalesByEvent } from "@/hooks/usePromoters";
import { supabase } from "@/integrations/supabase/client";
import { formatBs } from "./salesUtils";
import { EmptyChart } from "./SalesSummary";

export const SalesEvents = () => {
  const { data, isLoading } = useCreatorSalesByEvent();
  const navigate = useNavigate();

  const eventIds = (data || []).map((e) => e.event_id);

  // Detail views per event → conversion (vistas → compras) on each card.
  const { data: viewsByEvent } = useQuery({
    queryKey: ["sales-events-views", eventIds],
    enabled: eventIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: stats } = await supabase
        .from("event_stats")
        .select("event_id, view_count")
        .in("event_id", eventIds);
      const map: Record<string, number> = {};
      (stats || []).forEach((s) => { map[s.event_id] = Number(s.view_count || 0); });
      return map;
    },
  });


  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="rounded-2xl bg-card border border-border p-4">
        <EmptyChart text="Aún no tienes eventos con entradas pagadas." />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((e) => {
        const pct = e.capacity > 0 ? Math.min(100, (e.tickets_sold / e.capacity) * 100) : 0;
        const views = viewsByEvent?.[e.event_id] || 0;
        const conv = views > 0 ? (e.tickets_sold / views) * 100 : null;
        return (
          <button
            key={e.event_id}
            onClick={() => navigate(`/business/event/${e.event_id}/promoters`)}
            className="w-full text-left rounded-2xl bg-card border border-border p-3 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              {e.image_url ? (
                <img src={e.image_url} alt={e.title} loading="lazy" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-secondary flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{e.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(e.start_datetime).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p className="font-brand text-sm font-bold text-foreground mt-0.5">{formatBs(e.revenue)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>

            <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" /> {e.tickets_sold}{e.capacity > 0 ? `/${e.capacity}` : ""} vendidos
              </span>
              <span>{e.checked_in} check-in</span>
              {e.attributed_tickets > 0 && <span>{e.attributed_tickets} vía promotores</span>}
            </div>

            {e.capacity > 0 && (
              <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
