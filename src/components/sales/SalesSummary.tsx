import { useMemo, useState } from "react";
import { Ticket, TrendingUp, CalendarDays, Coins } from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreatorSalesByEvent, useCreatorSalesMonthly } from "@/hooks/usePromoters";
import { formatBs, formatMonth } from "./salesUtils";

const PILL = "px-3 py-1.5 rounded-full text-xs font-medium transition-colors";

export const SalesSummary = () => {
  const events = useCreatorSalesByEvent();
  const monthly = useCreatorSalesMonthly();
  const [range, setRange] = useState<"all" | "6m">("all");

  const totals = useMemo(() => {
    const rows = events.data || [];
    const revenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const tickets = rows.reduce((s, r) => s + Number(r.tickets_sold || 0), 0);
    const attributed = rows.reduce((s, r) => s + Number(r.attributed_revenue || 0), 0);
    return {
      revenue,
      tickets,
      attributed,
      organic: Math.max(0, revenue - attributed),
      events: rows.length,
      avgTicket: tickets ? revenue / tickets : 0,
      avgEvent: rows.length ? revenue / rows.length : 0,
    };
  }, [events.data]);

  const chartData = useMemo(() => {
    const rows = (monthly.data || []).map((r) => ({
      label: formatMonth(r.bucket),
      revenue: Number(r.revenue || 0),
      tickets: Number(r.tickets || 0),
    }));
    return range === "6m" ? rows.slice(-6) : rows;
  }, [monthly.data, range]);

  const donut = [
    { name: "Promotores", value: totals.attributed },
    { name: "Orgánico", value: totals.organic },
  ];

  if (events.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 p-5">
        <p className="text-xs text-muted-foreground mb-1">Ingresos totales · histórico</p>
        <p className="font-brand text-4xl font-bold text-foreground">{formatBs(totals.revenue)}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {totals.tickets} {totals.tickets === 1 ? "ticket vendido" : "tickets vendidos"}
        </p>
      </div>

      {/* Secondary */}
      <div className="grid grid-cols-3 gap-2">
        <MiniCard icon={CalendarDays} label="Eventos" value={`${totals.events}`} />
        <MiniCard icon={Ticket} label="Ticket prom." value={formatBs(totals.avgTicket)} />
        <MiniCard icon={Coins} label="Por evento" value={formatBs(totals.avgEvent)} />
      </div>

      {/* Revenue over time */}
      <section className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-brand text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" /> Ingresos en el tiempo
          </h2>
          <div className="flex gap-1 bg-secondary rounded-full p-0.5">
            {(["all", "6m"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`${PILL} ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {r === "all" ? "Todo" : "6 meses"}
              </button>
            ))}
          </div>
        </div>
        {monthly.isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : chartData.length === 0 ? (
          <EmptyChart text="Todavía no hay ventas registradas." />
        ) : (
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="salesRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: any, key: any) => (key === "revenue" ? [formatBs(v), "Ingresos"] : [v, "Tickets"])}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salesRev)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Attribution donut */}
      <section className="rounded-2xl bg-card border border-border p-4">
        <h2 className="font-brand text-sm font-semibold text-foreground mb-2">Origen de los ingresos</h2>
        {totals.revenue === 0 ? (
          <EmptyChart text="Sin ingresos para atribuir todavía." />
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={2} stroke="none">
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--muted-foreground))" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              <Legend color="bg-primary" label="Por promotores" value={formatBs(totals.attributed)} pct={totals.revenue ? (totals.attributed / totals.revenue) * 100 : 0} />
              <Legend color="bg-muted-foreground" label="Orgánico" value={formatBs(totals.organic)} pct={totals.revenue ? (totals.organic / totals.revenue) * 100 : 0} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

const MiniCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-2xl bg-card border border-border p-3">
    <Icon className="w-3.5 h-3.5 text-muted-foreground mb-1" />
    <p className="font-brand text-base font-bold text-foreground leading-tight">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
  </div>
);

const Legend = ({ color, label, value, pct }: { color: string; label: string; value: string; pct: number }) => (
  <div className="flex items-center gap-2">
    <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
    <div className="min-w-0">
      <p className="text-xs text-foreground font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground">{value} · {Math.round(pct)}%</p>
    </div>
  </div>
);

export const EmptyChart = ({ text }: { text: string }) => (
  <p className="text-xs text-muted-foreground text-center py-10">{text}</p>
);
