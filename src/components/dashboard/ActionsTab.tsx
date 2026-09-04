import { PromocionesSection } from "./PromocionesSection";
import { Period } from "./PeriodSelector";

interface ActionsTabProps {
  period: Period;
  openBoostWizard?: boolean;
}

export const ActionsTab = ({ openBoostWizard }: ActionsTabProps) => {
  return (
    <div className="space-y-6">
      <h2 className="font-brand text-lg font-semibold text-foreground">Promociones</h2>
      <PromocionesSection openWizardOnMount={openBoostWizard} />
    </div>
  );
};
