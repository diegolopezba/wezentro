import { cn } from "@/lib/utils";
import { BUSINESS_CATEGORIES } from "@/lib/businessTypes";

/** Business type pills grouped by the three categories. */
export const BusinessTypeGrid = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="mt-5 space-y-4">
    {BUSINESS_CATEGORIES.map((c) => (
      <div key={c.id}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
        <div className="grid grid-cols-2 gap-2">
          {c.types.map((t) => {
            const active = value === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onChange(t.value)}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border p-3.5 text-left transition-colors active:scale-[0.98]",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-muted/50 text-foreground",
                )}
              >
                <span className="text-lg">{t.emoji}</span>
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);
