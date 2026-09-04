import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onBoostClick?: () => void;
}

export const QuickActions = ({ onBoostClick }: QuickActionsProps) => {
  return (
    <div className="flex gap-2 pb-1">
      <span className="glow-border glow-border-aurora">
        <Button
          variant="outline" size="sm" className="flex-shrink-0 gap-1.5 rounded-full border-0 text-primary bg-background hover:bg-background/90" onClick={onBoostClick}>
          <Zap className="w-4 h-4" />
          Impulsar Publicación
        </Button>
      </span>
    </div>
  );
};
