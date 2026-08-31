import { cn } from "@/lib/utils";
import type { AdminPeriod } from "@/hooks/useAdminApi";

export const bs = (n: number) =>
  `Bs. ${Number(n || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PERIODS: { value: AdminPeriod; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "all", label: "Todo" },
];

export const PeriodPills = ({
  value,
  onChange,
}: {
  value: AdminPeriod;
  onChange: (p: AdminPeriod) => void;
}) => (
  <div className="flex gap-1.5 overflow-x-auto">
    {PERIODS.map((p) => (
      <button
        key={p.value}
        onClick={() => onChange(p.value)}
        className={cn(
          "px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors",
          value === p.value
            ? "bg-foreground text-background border-transparent"
            : "border-border text-muted-foreground",
        )}
      >
        {p.label}
      </button>
    ))}
  </div>
);

export const Stat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) => (
  <div className="rounded-2xl border border-border p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-medium mt-1 tabular-nums">{value}</p>
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
    {children}
  </section>
);
