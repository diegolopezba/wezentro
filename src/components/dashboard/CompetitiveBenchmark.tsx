import { useCompetitiveBenchmark } from "@/hooks/useBusinessAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const BenchmarkRow = ({ label, yours, avg }: { label: string; yours: number; avg: number }) => {
  const diff = avg > 0 ? Math.round(((yours - avg) / avg) * 100) : 0;
  const isAbove = diff > 0;
  const isEqual = diff === 0;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">{yours.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">Tú</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{avg.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">Promedio</p>
        </div>
        <div className={`flex items-center gap-0.5 text-xs font-medium ${isAbove ? "text-green-500" : isEqual ? "text-muted-foreground" : "text-muted-foreground"}`}>
          {isAbove ? <TrendingUp className="w-3 h-3" /> : isEqual ? <Minus className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isEqual ? "—" : `${Math.abs(diff)}%`}
        </div>
      </div>
    </div>
  );
};

export const CompetitiveBenchmark = () => {
  const { profile } = useAuth();
  const { data, isLoading } = useCompetitiveBenchmark();

  if (!profile?.business_type) return null;
  if (isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (!data) return null;

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <h3 className="text-sm font-medium text-foreground mb-1">Benchmark Competitivo</h3>
      <p className="text-xs text-muted-foreground mb-3">vs. promedio de {profile.business_type}</p>
      <div>
        <BenchmarkRow label="Alcance/evento" yours={data.yourAvgReach} avg={data.platformAvgReach} />
        <BenchmarkRow label="Engagement %" yours={data.yourEngagement} avg={data.platformEngagement} />
        <BenchmarkRow label="Seguidores" yours={data.yourFollowers} avg={data.platformFollowers} />
        <BenchmarkRow label="Guestlist fill %" yours={data.yourGuestlistFill} avg={data.platformGuestlistFill} />
      </div>
    </div>
  );
};
