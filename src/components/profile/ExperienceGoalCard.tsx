import { m } from "framer-motion";
import { Sparkles, Ticket, MapPin, PenLine } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useExperienceProgress } from "@/hooks/useExperienceProgress";
import { Button } from "@/components/ui/button";
import { ExperienceGoalSheet } from "./ExperienceGoalSheet";

const paceLabel = (pace: string) => {
  switch (pace) {
    case "complete":
      return "¡Meta cumplida! 🎉";
    case "ahead":
      return "Vas adelantado";
    case "behind":
      return "Vas atrasado";
    default:
      return "Vas en ritmo";
  }
};

const paceColor = (pace: string) => {
  switch (pace) {
    case "complete":
    case "ahead":
      return "text-primary";
    case "behind":
      return "text-muted-foreground";
    default:
      return "text-foreground/70";
  }
};

const Ring = ({ percent, pace }: { percent: number; pace: string }) => {
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;
  const isActive = pace === "ahead" || pace === "on_track" || pace === "complete";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-brand text-lg font-bold text-foreground leading-none">
          {percent}%
        </span>
      </div>
    </div>
  );
};

export const ExperienceGoalCard = () => {
  const { user, profile } = useAuth();
  const goal = (profile as any)?.experience_goal as number | null | undefined;
  const goalYear = (profile as any)?.experience_goal_year as number | null | undefined;
  const currentYear = new Date().getFullYear();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data } = useExperienceProgress(user?.id, goal, goalYear);

  // No goal set or stale year → CTA banner
  if (!goal || !goalYear || goalYear !== currentYear) {
    return (
      <>
        <m.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setSheetOpen(true)}
          className="w-full mt-4 p-4 rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">
              {goalYear && goalYear !== currentYear
                ? `Define tu meta para ${currentYear}`
                : "Define tu meta del año"}
            </h3>
            <p className="text-xs text-muted-foreground">
              ¿Cuántas experiencias nuevas quieres vivir este año?
            </p>
          </div>
        </m.button>
        <ExperienceGoalSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      <m.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setSheetOpen(true)}
        className="w-full mt-4 p-4 rounded-2xl bg-card border border-border flex items-center gap-4 text-left active:scale-[0.99] transition-transform"
      >
        <Ring percent={data.percent} pace={data.pace} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-brand text-xl font-bold text-foreground">
              {data.count}
            </span>
            <span className="text-sm text-muted-foreground">
              / {data.goal}
            </span>
          </div>
          <p className={`text-xs font-medium mt-0.5 ${paceColor(data.pace)}`}>
            {paceLabel(data.pace)}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Ticket className="w-3 h-3" />
              {data.breakdown.checkIns}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {data.breakdown.reservations}
            </span>
            <span className="flex items-center gap-1">
              <PenLine className="w-3 h-3" />
              {data.breakdown.posts}
            </span>
          </div>
        </div>
      </m.button>
      <ExperienceGoalSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
};
