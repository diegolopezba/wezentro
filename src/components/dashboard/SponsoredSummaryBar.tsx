import { Eye, MousePointerClick, DollarSign, Target } from "lucide-react";

interface SponsoredSummaryBarProps {
  sponsoredPosts: any[];
}

export const SponsoredSummaryBar = ({ sponsoredPosts }: SponsoredSummaryBarProps) => {
  if (!sponsoredPosts || sponsoredPosts.length === 0) return null;

  const totalImpressions = sponsoredPosts.reduce((s, p) => s + (p.impressions || 0), 0);
  const totalClicks = sponsoredPosts.reduce((s, p) => s + (p.clicks || 0), 0);
  const totalSpent = sponsoredPosts.reduce((s, p) => s + Number(p.spent || 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  const stats = [
    { icon: Eye, label: "Impresiones", value: totalImpressions.toLocaleString() },
    { icon: MousePointerClick, label: "Clicks", value: totalClicks.toLocaleString() },
    { icon: Target, label: "CTR", value: `${ctr}%` },
    { icon: DollarSign, label: "Gastado", value: `$${totalSpent.toFixed(2)}` },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-3">
      {stats.map((s) => (
        <div key={s.label} className="text-center p-2 rounded-xl bg-secondary/50">
          <s.icon className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
          <p className="text-sm font-bold text-foreground">{s.value}</p>
          <p className="text-[10px] text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
};
