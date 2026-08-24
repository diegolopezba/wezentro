import { useMemo, useState } from "react";
import { Ticket, TrendingUp, CalendarDays, Coins, Info } from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreatorSalesByEvent, useCreatorSalesMonthly } from "@/hooks/usePromoters";
import { formatBs, formatMonth } from "./salesUtils";
import { feeOf, netOf } from "@/lib/platformFee";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/bottom-sheet";

const PILL = "px-3 py-1.5 rounded-full text-xs font-medium transition-colors";

export const SalesSummary = () => {
  const events = useCreatorSalesByEvent();
  const monthly = useCreatorSalesMonthly();
  const [range, setRange] = useState<"all" | "6m">("all");
  const [infoOpen, setInfoOpen] = useState(false);

  const totals = useMemo(() => {
    const rows = events.data || [];
    const revenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const tickets = rows.reduce((s, r) => s + Number(r.tickets_sold || 0), 0);
    const attributed = rows.reduce((s, r) => s + Number(r.attributed_revenue || 0), 0);
    const net = netOf(revenue);
    const fee = feeOf(revenue);
    return {
      revenue,
      tickets,
      attributed,
      organic: Math.max(0, revenue - attributed),
      events: rows.length,
      avgTicket: tickets ? revenue / tickets : 0,
      netAvgTicket: tickets ? netOf(revenue) / tickets : 0,
      avgEvent: rows.length ? revenue / rows.length : 0,
      netAvgEvent: rows.length ? netOf(revenue) / rows.length : 0,
      net,
      fee,
    };
  }, [events.data]);

  const chartData = useMemo(() => {
    const rows = (monthly.data || []).map((r) => ({
      label: formatMonth(r.bucket),
      revenue: Number(r.revenue || 0),
      net: netOf(r.revenue),
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
      {/* Hero — net */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">Neto estimado · histórico</p>
          <button
            onClick={() => setInfoOpen(true)}
            aria-label="¿Cómo se calcula el neto?"
            className="w-7 h-7 rounded-full grid place-items-center active:bg-secondary transition-colors"
          >
            <Info className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="font-brand text-4xl font-medium text-foreground">{formatBs(totals.net)}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Bruto {formatBs(totals.revenue)} · Comisión total (6%) −{formatBs(totals.fee)}
        </p>
      </div>

      {/* Secondary */}
      <div className="grid grid-cols-3 gap-2">
        <MiniCard icon={CalendarDays} label="Eventos" value={`${totals.events}`} />
        <MiniCard icon={Ticket} label="Ticket prom. neto" value={formatBs(totals.netAvgTicket)} sub={`Bruto ${formatBs(totals.avgTicket)}`} />
        <MiniCard icon={Coins} label="Por evento neto" value={formatBs(totals.netAvgEvent)} sub={`Bruto ${formatBs(totals.avgEvent)}`} />
      </div>

      {/* Revenue over time */}
      <section className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-brand text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" /> Neto en el tiempo
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
                <linearGradient id="salesNet" x1="0" y1="0" x2="0" y2="1">
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
                formatter={(v: any, key: any) => {
                  if (key === "net") return [formatBs(v), "Neto"];
                  if (key === "revenue") return [formatBs(v), "Bruto"];
                  return [v, "Tickets"];
                }}
              />
              <Area type="monotone" dataKey="net" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salesNet)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Attribution donut */}
      <section className="rounded-2xl bg-card border border-border p-4">
        <h2 className="font-brand text-sm font-semibold text-foreground mb-2">Origen de los ingresos</h2>
        <p className="text-[11px] text-muted-foreground mb-2">Montos brutos</p>
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

      {/* Info sheet */}
      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="bottom" className="light-sheet rounded-t-3xl pb-6">
          <SheetTitle className="sr-only">¿Cómo se calcula el neto?</SheetTitle>
          <SheetDescription className="sr-only">Desglose de la comisión y el neto estimado.</SheetDescription>
          <div className="pt-2">
            <h2 className="font-brand text-[26px] font-medium leading-tight text-foreground">¿Cómo se calcula el neto?</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              De cada cobro que recibís, el <strong>6% es la comisión total</strong>. El resto, el <strong>94%, es el monto estimado que llega a tu cuenta</strong>.
            </p>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Ejemplo: si vendés una entrada de Bs. 100, el neto estimado es Bs. 94.
            </p>
            <button
              onClick={() => setInfoOpen(false)}
              className="mt-6 w-full h-12 rounded-full bg-foreground text-background text-base font-medium active:scale-[0.98] transition-transform"
            >
              Entendido
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const MiniCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
  <div className="rounded-2xl bg-card border border-border p-3">
    <Icon className="w-3.5 h-3.5 text-muted-foreground mb-1" />
    <p className="font-brand text-base font-medium text-foreground leading-tight">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
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
