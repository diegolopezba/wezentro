import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

const DAY_MS = 86_400_000;

const daysUntil = (iso: string): number =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS);

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-BO", { day: "numeric", month: "short" });

/**
 * Compact "Tu plan" card for Business settings: current tier plus a
 * renewal countdown. Only rendered for food businesses with an active
 * (or in-grace) subscription row.
 */
export const PlanStatusCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    tierConfig,
    status,
    renewsOn,
    billingInterval,
    inGracePeriod,
    graceUntil,
    isLoading,
  } = useSubscriptionTier(user?.id);

  if (isLoading || (status !== "active" && status !== "past_due")) return null;

  let countdownText: string | null = null;
  let urgent = false;

  if (inGracePeriod && graceUntil) {
    const days = Math.max(0, daysUntil(graceUntil));
    countdownText = `Venció — te quedan ${days} día${days === 1 ? "" : "s"} de gracia`;
    urgent = true;
  } else if (renewsOn) {
    const days = Math.max(0, daysUntil(renewsOn));
    if (days <= 7) {
      countdownText = `Vence en ${days} día${days === 1 ? "" : "s"} — renová para no perder funciones`;
      urgent = true;
    } else {
      countdownText = `Se renueva en ${days} días · ${formatDate(renewsOn)}`;
    }
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border bg-card p-4 ${
        urgent ? "border-destructive/40" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <CreditCard className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-brand text-base font-medium text-foreground">
            Plan {tierConfig.name}
            {billingInterval === "year" && (
              <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                anual
              </span>
            )}
          </p>
          {countdownText && (
            <p
              className={`mt-0.5 text-[13px] leading-snug ${
                urgent ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {countdownText}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => navigate("/settings/business/plans")}
        className="mt-3 w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background active:opacity-80"
      >
        {urgent ? "Renovar plan" : "Ver planes"}
      </button>
    </m.div>
  );
};
