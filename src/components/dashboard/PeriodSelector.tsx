import { cn } from "@/lib/utils";

export type Period = "7d" | "30d" | "all";

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
}

const options: { value: Period; label: string }[] = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "all", label: "Todo" },
];

export const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => {
  return (
    <div className="inline-flex rounded-lg bg-muted p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn( "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            value === opt.value
              ? "bg-background text-foreground shadow-sm" : "text-muted-foreground " )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
