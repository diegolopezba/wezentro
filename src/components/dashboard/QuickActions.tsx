import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onBoostClick?: () => void;
}

export const QuickActions = ({ onBoostClick }: QuickActionsProps) => {
  return (
    <div className="flex gap-2 pb-1">
      <Button
        variant="outline" size="sm" className="flex-shrink-0 gap-1.5 rounded-full border-primary/30 text-primary overflow-hidden relative bg-transparent boost-glow-btn" onClick={onBoostClick}>
        <Zap className="w-4 h-4" />
        Boost
      </Button>
    </div>
  );
};
