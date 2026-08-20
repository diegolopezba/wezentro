import { ReactNode, useState } from "react";
import { Lock } from "lucide-react";
import { FeatureKey, TierKey, featureUpgradeLabel, tierForFeature } from "@/lib/subscriptionTiers";
import { PlansSheet } from "./PlansSheet";

interface Props {
  feature: FeatureKey;
  currentTier?: TierKey;
  /** When false the children render normally (feature unlocked). */
  locked?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Renders children visually disabled with an inline upgrade label.
 * Tapping anywhere opens the plans sheet.
 */
export const LockedFeature = ({
  feature,
  currentTier = "basico",
  locked = true,
  children,
  className = "",
}: Props) => {
  const [open, setOpen] = useState(false);

  if (!locked) return <>{children}</>;

  return (
    <>
      <div className={`space-y-1 ${className}`}>
        <div className="relative">
          <div className="opacity-50 pointer-events-none select-none">{children}</div>
          <button
            type="button"
            aria-label={featureUpgradeLabel(feature)}
            onClick={() => setOpen(true)}
            className="absolute inset-0 z-10"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground underline underline-offset-2"
        >
          <Lock className="w-3 h-3" />
          {featureUpgradeLabel(feature)}
        </button>
      </div>

      <PlansSheet
        open={open}
        onOpenChange={setOpen}
        currentTier={currentTier}
        highlightTier={tierForFeature(feature) ?? undefined}
      />
    </>
  );
};
