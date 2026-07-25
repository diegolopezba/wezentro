import { useMemo, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreatorPromoterLeaderboard } from "@/hooks/usePromoters";
import { formatBs } from "./salesUtils";
import { EmptyChart } from "./SalesSummary";

type SortKey = "revenue_bs" | "tickets_sold" | "clicks";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "revenue_bs", label: "Ingresos" },
  { key: "tickets_sold", label: "Tickets" },
  { key: "clicks", label: "Clicks" },
];

export const SalesPromoters = () => {
  const { data, isLoading } = useCreatorPromoterLeaderboard();
  const [sort, setSort] = useState<SortKey>("revenue_bs");

  const rows = useMemo(
    () => [...(data || [])].sort((a, b) => Number(b[sort]) - Number(a[sort])),
    [data, sort]
  );

  const chartData = useMemo(
    () => rows.slice(0, 6).map((r) => ({ name: r.name, value: Number(r[sort]) })).reverse(),
    [rows, sort]
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl bg-card border border-border p-4">
        <EmptyChart text="Todavía no creaste promotores para tus eventos." />
      </div>
    );
  }

  const totalClicks = rows.reduce((s, r) => s + Number(r.clicks), 0);
  const totalTickets = rows.reduce((s, r) => s + Number(r.tickets_sold), 0);
  const conv = totalClicks ? (totalTickets / totalClicks) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Promotores" value={`${rows.length}`} />
        <Stat label="Clicks" value={`${totalClicks}`} />
        <Stat label="Conversión" value={`${conv.toFixed(1)}%`} />
      </div>

      <div className="flex gap-1 bg-secondary rounded-full p-0.5 w-fit">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sort === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl bg-card border border-border p-4">
        <h2 className="font-brand text-sm font-semibold text-foreground mb-3">Top promotores</h2>
        <ResponsiveContainer width="100%" height={Math.max(140, chartData.length * 34)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={84}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--secondary))" }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v: any) => [sort === "revenue_bs" ? formatBs(v) : v, SORTS.find((s) => s.key === sort)?.label]}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.promoter_id} className="rounded-2xl bg-card border border-border p-3">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-secondary text-[11px] font-bold text-foreground grid place-items-center flex-shrink-0">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{r.event_title}</p>
              </div>
              <p className="font-brand text-sm font-bold text-foreground flex-shrink-0">{formatBs(r.revenue_bs)}</p>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              <span>{r.clicks} clicks</span>
              <span>{r.tickets_sold} tickets</span>
              <span>{r.gl_approved} en lista</span>
              <span className="ml-auto font-mono">{r.short_code}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-card border border-border p-3">
    <p className="font-brand text-base font-bold text-foreground leading-tight">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
  </div>
);
