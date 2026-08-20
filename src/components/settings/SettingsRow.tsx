import { ReactNode } from "react";
import { m } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsGroupProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const SettingsGroup = ({ title, children, className }: SettingsGroupProps) => (
  <div className={className}>
    {title && (
      <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
        {title}
      </p>
    )}
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {children}
    </div>
  </div>
);

interface SettingsRowProps {
  icon?: React.ElementType;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  /** Replaces the chevron (e.g. a Switch). */
  right?: ReactNode;
  /** Custom left slot (e.g. an avatar). Overrides icon. */
  left?: ReactNode;
  destructive?: boolean;
  delay?: number;
  disabled?: boolean;
}

export const SettingsRow = ({
  icon: Icon,
  label,
  sublabel,
  onClick,
  right,
  left,
  destructive,
  delay = 0,
  disabled,
}: SettingsRowProps) => {
  const interactive = !!onClick;
  const Wrapper: any = interactive ? "button" : "div";

  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Wrapper
        {...(interactive ? { type: "button", onClick, disabled } : {})}
        className={cn(
          "flex w-full items-center gap-3.5 px-4 py-3.5 text-left [-webkit-tap-highlight-color:transparent]",
          interactive ? "active:bg-muted/40" : "cursor-default",
        )}
      >
        {left ?? (
          Icon && (
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                destructive ? "text-destructive" : "text-muted-foreground",
              )}
              strokeWidth={1.75}
            />
          )
        )}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-sm font-medium",
              destructive ? "text-destructive" : "text-foreground",
            )}
          >
            {label}
          </span>
          {sublabel && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{sublabel}</span>
          )}
        </span>
        {right ?? (interactive && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />)}
      </button>
    </m.div>
  );
};
