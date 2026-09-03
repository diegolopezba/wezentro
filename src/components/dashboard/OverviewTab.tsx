import { m } from "framer-motion";
import { Eye, MousePointerClick, TrendingUp, UserCheck, UsersRound, FileText, MousePointer2, Coins, Ticket, Receipt } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { PeriodSelector, Period } from "./PeriodSelector";
import { SalesPaceSection } from "./SalesPaceSection";
import { ConversionFunnel } from "./ConversionFunnel";
import { useSalesOverview } from "@/hooks/useSalesOverview";
import { formatBs } from "@/components/sales/salesUtils";
import { useAccountsReached, useInteractionSummary, useProfileVisits } from "@/hooks/useBusinessAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";


interface OverviewTabProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
}

export const OverviewTab = ({ period, onPeriodChange }: OverviewTabProps) => {
  const { user } = useAuth();
  const { data: reached, isLoading: reachedLoading } = useAccountsReached(period);
  const { data: interactions, isLoading: interactionsLoading } = useInteractionSummary(period);
  const { data: profileVisits, isLoading: visitsLoading } = useProfileVisits(period);
  const { data: sales, isLoading: salesLoading } = useSalesOverview(period);

  // Followers total + trend
  const { data: followerData, isLoading: followerLoading } = useQuery({
    queryKey: ["overview-followers", user?.id, period],

    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      const { count: total } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);

      const now = new Date();
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 365;
      const periodStart = new Date(now.getTime() - days * 86400000).toISOString();
      const prevStart = new Date(now.getTime() - days * 2 * 86400000).toISOString();

      const [recentRes, prevRes] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id).gte("created_at", periodStart),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id).gte("created_at", prevStart).lt("created_at", periodStart),
      ]);

      const recent = recentRes.count || 0;
      const prev = prevRes.count || 0;
      let trend: { value: number; isPositive: boolean } | null = null;
      if (prev > 0) {
        const change = Math.round(((recent - prev) / prev) * 100);
        trend = { value: Math.abs(change), isPositive: change >= 0 };
      } else if (recent > 0) {
        trend = { value: 100, isPositive: true };
      }

      return { total: total || 0, trend };
    },
    enabled: !!user?.id,
  });

  // Content published in period
  const { data: contentCount, isLoading: contentLoading } = useQuery({
    queryKey: ["overview-content", user?.id, period],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      let query = supabase.from("events").select("*", { count: "exact", head: true }).eq("creator_id", user.id).is("deleted_at", null);
      if (period !== "all") {
        const days = period === "7d" ? 7 : 30;
        query = query.gte("created_at", new Date(Date.now() - days * 86400000).toISOString());
      }
      const { count } = await query;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Daily reached chart
  const { data: chartData } = useQuery({
    queryKey: ["overview-chart", user?.id, period],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const start = new Date(Date.now() - days * 86400000);

      const { data: events } = await supabase.from("events").select("id").eq("creator_id", user.id).is("deleted_at", null);
      const eventIds = events?.map((e) => e.id) || [];
      if (eventIds.length === 0) return [];

      const { data: views } = await supabase
        .from("event_interactions")
        .select("user_id, created_at")
        .in("event_id", eventIds)
        .eq("type", "impression")
        .gte("created_at", start.toISOString());

      // Group by day, count unique users
      const dayMap: Record<string, Set<string>> = {};
      (views || []).forEach((v) => {
        const day = v.created_at?.split("T")[0] || "";
        if (!dayMap[day]) dayMap[day] = new Set();
        if (v.user_id) dayMap[day].add(v.user_id);
      });

      // Fill all days
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().split("T")[0];
        result.push({ day: key.slice(5), value: dayMap[key]?.size || 0 });
      }
      return result;
    },
    enabled: !!user?.id,
  });

  const totalInteractions = interactions ? interactions.views + interactions.shares + interactions.likes + interactions.guestlistJoins : 0;
  const engagementRate = interactions && interactions.impressions > 0 ? Math.round((totalInteractions / interactions.impressions) * 100) : 0;
  const ctr = interactions && interactions.impressions > 0 ? Math.round((interactions.views / interactions.impressions) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="font-brand text-lg font-semibold text-foreground">Resumen</h2>
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard title="Bruto" value={salesLoading ? "..." : formatBs(sales?.revenue || 0)} icon={Coins} delay={0} />
        <StatsCard title="Neto estimado" value={salesLoading ? "..." : formatBs(sales?.netPayout || 0)} icon={Receipt} delay={0.05} />
        <StatsCard title="Tickets vendidos" value={salesLoading ? "..." : sales?.tickets || 0} icon={Ticket} delay={0.1} />
        <StatsCard title="Ticket promedio" value={salesLoading ? "..." : formatBs(sales?.avgTicket || 0)} icon={Receipt} delay={0.15} />
      </div>




      <ConversionFunnel period={period} />

      <SalesPaceSection />

      <div className="grid grid-cols-3 gap-3">

        <StatsCard title="Impresiones" value={interactionsLoading ? "..." : interactions?.impressions || 0} icon={Eye} delay={0} />
        <StatsCard title="Views" value={interactionsLoading ? "..." : interactions?.views || 0} icon={MousePointer2} delay={0.05} />
        <StatsCard title="CTR" value={interactionsLoading ? "..." : `${ctr}%`} icon={TrendingUp} delay={0.1} />
        <StatsCard title="Alcance" value={reachedLoading ? "..." : reached?.count || 0} icon={UsersRound} delay={0.15} trend={reached?.trend || undefined} />
        <StatsCard title="Visitas perfil" value={visitsLoading ? "..." : profileVisits?.count || 0} icon={UserCheck} delay={0.2} trend={profileVisits?.trend || undefined} />
        <StatsCard title="Seguidores" value={followerLoading ? "..." : followerData?.total || 0} icon={MousePointerClick} delay={0.25} trend={followerData?.trend || undefined} />
      </div>

      {/* Mini chart */}
      {chartData && chartData.length > 0 && (
        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-card border border-border p-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Cuentas alcanzadas por día</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis hide />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </m.div>
      )}
    </div>
  );
};
