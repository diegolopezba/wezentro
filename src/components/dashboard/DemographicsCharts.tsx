import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

interface DemographicsChartsProps {
  demographics: {
    ageBuckets: { name: string; count: number }[];
    genderSplit: { name: string; count: number }[];
    topCities: { name: string; count: number }[];
  } | undefined;
  isLoading: boolean;
}

const GENDER_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--muted-foreground))"];

export const DemographicsCharts = ({ demographics, isLoading }: DemographicsChartsProps) => {
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;

  if (!demographics) return <p className="text-sm text-muted-foreground text-center py-4">No hay suficientes datos demográficos</p>;

  const totalGender = demographics.genderSplit.reduce((s, g) => s + g.count, 0);

  return (
    <div className="space-y-6">
      {/* Age Distribution */}
      {demographics.ageBuckets.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Distribución de Edad</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={demographics.ageBuckets} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gender Split */}
      {demographics.genderSplit.length > 0 && totalGender > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Género</h3>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={demographics.genderSplit} dataKey="count" innerRadius={25} outerRadius={40} paddingAngle={2}>
                    {demographics.genderSplit.map((_, i) => (
                      <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {demographics.genderSplit.map((g, i) => (
                <div key={g.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GENDER_COLORS[i % GENDER_COLORS.length] }} />
                    <span className="text-foreground capitalize">{g.name}</span>
                  </div>
                  <span className="text-muted-foreground">{Math.round((g.count / totalGender) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Cities */}
      {demographics.topCities.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Ciudades principales</h3>
          <div className="space-y-2">
            {demographics.topCities.slice(0, 5).map((city) => (
              <div key={city.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground">{city.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{city.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
