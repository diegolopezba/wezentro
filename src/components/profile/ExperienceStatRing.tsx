interface ExperienceStatRingProps {
  percent: number;
  pace: string;
  size?: number;
}

export const ExperienceStatRing = ({ percent, pace, size = 36 }: ExperienceStatRingProps) => {
  const stroke = Math.max(3, Math.round(size / 14));
  const textClass = size >= 80 ? "text-3xl font-bold" : "text-xs font-normal";
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;
  const isActive = pace === "ahead" || pace === "on_track" || pace === "complete";
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
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
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-brand ${textClass} font-bold text-foreground leading-none`}>
          {percent}%
        </span>
      </div>
    </div>
  );
};
