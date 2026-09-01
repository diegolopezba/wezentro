import { useState } from "react";
import { UtensilsCrossed, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuSheet } from "@/components/menu/MenuSheet";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import { useAcceptedBusinessCtas, type BusinessCtaRequest } from "@/hooks/useBusinessCtaRequest";
import { isFoodBusinessType } from "@/lib/businessTypes";
import { useBusinessPlanAccess } from "@/hooks/useBusinessPlanAccess";

interface Props {
  eventId: string | undefined;
  /** The post's own creator. Skip CTAs whose business == creator (already shown by the event's own flags). */
  excludeBusinessId?: string;
}

const BusinessCtaRow = ({ req }: { req: BusinessCtaRequest }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const biz = req.business;
  const { hasActivePlan } = useBusinessPlanAccess(biz?.id);
  if (!biz) return null;
  const name = biz.full_name || biz.username;
  const isFood = isFoodBusinessType((biz as any).business_type) || !!biz.is_food_business;
  const showMenu = isFood && biz.menu_enabled === true && hasActivePlan;
  const showRes = isFood && biz.reservations_enabled === true && hasActivePlan;
  if (!showMenu && !showRes) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        <span className="text-xs text-muted-foreground">{name}:</span>
        {showRes && (
          <Button variant="sheet-action" size="sm" onClick={() => setResOpen(true)} className="gap-1.5">
            <CalendarCheck className="w-4 h-4" />
            Reservar
          </Button>
        )}
        {showMenu && (
          <Button variant="secondary" size="sm" onClick={() => setMenuOpen(true)} className="gap-1.5">
            <UtensilsCrossed className="w-4 h-4" />
            Menú
          </Button>
        )}
      </div>

      {showMenu && (
        <MenuSheet open={menuOpen} onOpenChange={setMenuOpen} userId={biz.id} businessName={name} />
      )}
      {showRes && (
        <ReservationSheet
          open={resOpen}
          onOpenChange={setResOpen}
          businessId={biz.id}
          businessName={name}
          businessHours={biz.business_hours}
          reservationStartTime={biz.reservation_start_time}
          reservationEndTime={biz.reservation_end_time}
        />
      )}
    </>
  );
};

export const AttachedBusinessCtas = ({ eventId, excludeBusinessId }: Props) => {
  const { data: accepted = [] } = useAcceptedBusinessCtas(eventId);
  const rows = accepted.filter((r) => r.business_id !== excludeBusinessId);
  if (rows.length === 0) return null;
  return (
    <div className="border-t border-border/40">
      {rows.map((r) => (
        <BusinessCtaRow key={r.id} req={r} />
      ))}
    </div>
  );
};
