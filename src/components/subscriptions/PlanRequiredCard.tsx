import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_TIERS } from "@/lib/subscriptionTiers";

interface Props {
  title: string;
  description?: string;
}

/**
 * Upgrade block shown where a food-business tool (menu, reservations) needs an
 * active plan. Creating the Business account stays free; tools are gated.
 */
export const PlanRequiredCard = ({ title, description }: Props) => {
  const navigate = useNavigate();
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <h2 className="font-brand text-base font-medium text-foreground">{title}</h2>
      <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
        {description ? `${description} ` : ""}
        Desde Bs. {SUBSCRIPTION_TIERS.basico.price_bob}/mes.
      </p>
      <Button
        variant="sheet-action"
        className="mt-4 h-11 w-full rounded-full"
        onClick={() => navigate("/settings/business/plans")}
      >
        Ver planes
      </Button>
    </m.div>
  );
};
