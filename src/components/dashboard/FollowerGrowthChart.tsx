import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useFollowerGrowthChart } from "@/hooks/useBusinessAnalytics";

export const FollowerGrowthChart = () => {
  const { data, isLoading } = useFollowerGrowthChart(30);

  if (isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Crecimiento de Seguidores</h3>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data}>
          <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis hide />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
          <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
