import { Slider } from "@/components/ui/slider";

interface ExperienceGoalPickerProps {
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}

const CHIPS = [10, 25, 50, 100];

export const ExperienceGoalPicker = ({ value, onChange, hint }: ExperienceGoalPickerProps) => {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
              value === n
                ? "gradient-red text-white"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="text-center">
          <span className="font-brand text-4xl font-bold text-foreground">{value}</span>
          <span className="text-sm text-muted-foreground ml-2">
            {value === 1 ? "experiencia" : "experiencias"}
          </span>
        </div>
        <Slider
          min={1}
          max={365}
          step={1}
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>365</span>
        </div>
      </div>

      {hint && (
        <p className="text-xs text-muted-foreground text-center px-2">{hint}</p>
      )}
    </div>
  );
};
