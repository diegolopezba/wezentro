import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Users, Ticket, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  usePromoterStats,
  useTicketBreakdown,
  usePromoterTotals,
  useCreatePromoter,
} from "@/hooks/usePromoters";
import { PromoterCard } from "@/components/promoters/PromoterCard";

const formatBs = (n: number) => `Bs. ${Math.round(Number(n) || 0)}`;

const EventPromoterDashboard = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user, profile } = useAuth();
  useSwipeBack();

  const [name, setName] = useState("");
  const create = useCreatePromoter();

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event-meta", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, creator_id")
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const stats = usePromoterStats(eventId);
  const tiers = useTicketBreakdown(eventId);
  const totals = usePromoterTotals(eventId);

  const isOwner = !!user && event?.creator_id === user.id;
  const isBusiness = profile?.is_business === true;

  if (!eventLoading && (!event || !isOwner || !isBusiness)) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground mb-4">
          Solo cuentas business pueden gestionar promotores de sus eventos.
        </p>
        <Button onClick={() => navigate(-1)} variant="secondary" className="rounded-full">
          Volver
        </Button>
      </div>
    );
  }

  const handleCreate = () => {
    if (!eventId || !name.trim()) return;
    create.mutate({ eventId, name }, { onSuccess: () => setName("") });
  };

  const t = totals.data;
  const organicTickets = t ? t.total_tickets - t.attributed_tickets : 0;
  const organicRevenue = t ? t.total_revenue - t.attributed_revenue : 0;

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-brand text-lg font-bold text-foreground truncate">Promotores</h1>
            {event?.title && (
              <p className="text-xs text-muted-foreground truncate">{event.title}</p>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 py-5 space-y-6">
        {/* Totals */}
        <section className="grid grid-cols-2 gap-3">
          <SummaryCard
            icon={Ticket}
            label="Tickets vendidos"
            primary={t ? `${t.total_tickets}` : "—"}
            secondary={t ? `${t.attributed_tickets} por promotor · ${organicTickets} orgánico` : ""}
          />
          <SummaryCard
            icon={TrendingUp}
            label="Ingresos"
            primary={t ? formatBs(t.total_revenue) : "—"}
            secondary={t ? `${formatBs(t.attributed_revenue)} promotor · ${formatBs(organicRevenue)} orgánico` : ""}
          />
        </section>

        {/* Ticket tiers */}
        <section className="space-y-2">
          <h2 className="font-brand text-sm font-semibold text-foreground">Ventas por tier</h2>
          {tiers.isLoading ? (
            <Skeleton className="h-20 rounded-2xl" />
          ) : tiers.data && tiers.data.length > 0 ? (
            <div className="space-y-2">
              {tiers.data.map((t) => {
                const cap = t.capacity ?? null;
                const pct = cap ? Math.min(100, Math.round((t.sold / cap) * 100)) : null;
                return (
                  <div key={t.tier_id} className="rounded-2xl bg-card border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.sold}{cap ? ` / ${cap}` : ""} vendidos · {formatBs(t.price)}
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">{formatBs(t.revenue_bs)}</p>
                    </div>
                    {pct !== null && (
                      <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Este evento no tiene tiers de ticket configurados.</p>
          )}
        </section>

        {/* Create promoter */}
        <section className="space-y-2">
          <h2 className="font-brand text-sm font-semibold text-foreground">Nuevo promotor</h2>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del promotor (ej. Carlos)"
              maxLength={40}
              className="rounded-full"
            />
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || create.isPending}
              className="rounded-full gap-1.5"
            >
              <Plus className="w-4 h-4" /> Crear
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Generamos un enlace único que el promotor comparte. Cada click, guestlist y ticket vendido se le atribuye automáticamente.
          </p>
        </section>

        {/* Leaderboard */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-brand text-sm font-semibold text-foreground">Tus promotores</h2>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> {stats.data?.length ?? 0}
            </span>
          </div>
          {stats.isLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
          ) : stats.data && stats.data.length > 0 ? (
            <div className="space-y-3">
              {[...stats.data]
                .sort((a, b) => b.tickets_sold - a.tickets_sold || b.clicks - a.clicks)
                .map((p) => (
                  <PromoterCard key={p.promoter_id} eventId={eventId!} row={p} />
                ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">
              Aún no tienes promotores. Crea el primero arriba.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

const SummaryCard = ({
  icon: Icon, label, primary, secondary,
}: {
  icon: any; label: string; primary: string; secondary: string;
}) => (
  <div className="rounded-2xl bg-card border border-border p-3">
    <div className="flex items-center gap-2 text-muted-foreground mb-1">
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs">{label}</span>
    </div>
    <p className="font-brand text-lg font-bold text-foreground">{primary}</p>
    {secondary && <p className="text-[10px] text-muted-foreground mt-0.5">{secondary}</p>}
  </div>
);

export default EventPromoterDashboard;
