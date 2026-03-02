import { Suspense, lazy } from "react";
import { CompetitiveBenchmark } from "./CompetitiveBenchmark";
import { ReservationsSummary } from "./ReservationsSummary";
import { PromocionesSection } from "./PromocionesSection";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestlistFunnel, useProfileVisits } from "@/hooks/useBusinessAnalytics";
import { CalendarCheck, Eye, MousePointerClick, UtensilsCrossed } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Period } from "./PeriodSelector";

const GuestlistFunnel = lazy(() => import("@/components/dashboard/GuestlistFunnel").then(m => ({ default: m.GuestlistFunnel })));

interface ActionsTabProps {
  period: Period;
  openBoostWizard?: boolean;
}

const FunnelStep = ({ label, value, prevValue }: { label: string; value: number; prevValue?: number }) => {
  const dropOff = prevValue && prevValue > 0 ? Math.round(((prevValue - value) / prevValue) * 100) : null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {dropOff !== null && dropOff > 0 && (
          <span className="text-[10px] text-red-500">-{dropOff}%</span>
        )}
      </div>
    </div>
  );
};

export const ActionsTab = ({ period, openBoostWizard }: ActionsTabProps) => {
  const { profile } = useAuth();
  const { data: funnelData, isLoading: funnelLoading } = useGuestlistFunnel();
  const { data: profileVisits } = useProfileVisits(period);

  return (
    <div className="space-y-6">
      <h2 className="font-brand text-lg font-semibold text-foreground">Acciones y Conversiones</h2>

      {/* Conversion Funnel */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Funnel de Conversión</h3>
        {funnelLoading ? (
          <Skeleton className="h-32" />
        ) : funnelData ? (
          <div>
            <FunnelStep label="Views" value={funnelData.guestlistJoins + funnelData.invitationsSent} />
            <FunnelStep label="Guestlist Requests" value={funnelData.guestlistJoins} prevValue={funnelData.guestlistJoins + funnelData.invitationsSent} />
            <FunnelStep label="Aprobados" value={funnelData.approved} prevValue={funnelData.guestlistJoins} />
            <FunnelStep label="Check-ins" value={funnelData.checkedIn} prevValue={funnelData.approved} />
          </div>
        ) : null}
      </div>

      {/* Profile Actions */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Acciones en Perfil</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Visitas al perfil</span>
            <span className="text-sm font-semibold text-foreground">{profileVisits?.count || 0}</span>
          </div>
        </div>
      </div>

      {/* Reservations Module - only if enabled */}
      {profile?.reservations_enabled && (
        <section>
          <h3 className="font-brand text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-primary" />
            Reservas
          </h3>
          <ReservationsSummary />
        </section>
      )}

      {/* Competitive Benchmark */}
      <CompetitiveBenchmark />

      {/* Sponsored */}
      <PromocionesSection openWizardOnMount={openBoostWizard} />
    </div>
  );
};
