import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SetupStep {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  onClick: () => void;
}

interface Props {
  steps: SetupStep[];
}

/**
 * Progress-first setup block: people follow a guided path instead of a flat
 * list of settings. Hidden once every step is done.
 */
export const BusinessSetupChecklist = ({ steps }: Props) => {
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  if (!total || done === total) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-brand text-base font-medium text-foreground">Configurá tu negocio</h2>
        <span className="text-xs text-muted-foreground">
          {done} de {total}
        </span>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
        <m.div
          className="h-full rounded-full bg-foreground"
          initial={{ width: 0 }}
          animate={{ width: `${(done / total) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>

      <div className="mt-3 space-y-1">
        {steps.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={s.onClick}
            className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left active:opacity-70"
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                s.done ? "border-foreground bg-foreground" : "border-border",
              )}
            >
              {s.done && <Check className="h-3.5 w-3.5 text-background" />}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-sm font-medium",
                  s.done ? "text-muted-foreground line-through" : "text-foreground",
                )}
              >
                {s.label}
              </span>
              {!s.done && (
                <span className="block text-xs text-muted-foreground">{s.hint}</span>
              )}
            </span>
            {!s.done && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          </button>
        ))}
      </div>
    </m.div>
  );
};
