import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal } from "lucide-react";
import {
  useReservationPolicy,
  useSaveReservationPolicy,
  DEFAULT_POLICY,
} from "@/hooks/useReservationConfig";
import { useDirtyBaseline, saveVariant } from "@/hooks/useDirtyBaseline";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { LockedFeature } from "@/components/subscriptions/LockedFeature";
import type { FeatureKey } from "@/lib/subscriptionTiers";

interface Props {
  businessId: string;
}

export const ReservationRulesEditor = ({ businessId }: Props) => {
  const { data: policy } = useReservationPolicy(businessId);
  const save = useSaveReservationPolicy(businessId);
  const { tier, hasFeature } = useSubscriptionTier(businessId);

  const [form, setForm] = useState({ ...DEFAULT_POLICY });
  const { isDirty, capture } = useDirtyBaseline(form);

  useEffect(() => {
    if (policy) {
      const { business_id, ...rest } = policy;
      const next = { ...DEFAULT_POLICY, ...rest };
      setForm(next);
      capture(next);
    } else {
      capture({ ...DEFAULT_POLICY });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy]);

  const num = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  const fields: {
    key: keyof typeof DEFAULT_POLICY;
    label: string;
    hint: string;
    min: number;
    feature?: FeatureKey;
  }[] = [
    {
      key: "turn_time_minutes",
      label: "Duración de la mesa (min)",
      hint: "Cuánto tiempo ocupa una reserva la mesa.",
      min: 30,
    },
    {
      key: "min_lead_minutes",
      label: "Anticipación mínima (min)",
      hint: "Tiempo mínimo antes del horario para poder reservar.",
      min: 0,
    },
    {
      key: "max_party_size",
      label: "Máximo de personas",
      hint: "Grupos más grandes deben contactarte directamente.",
      min: 1,
    },
    {
      key: "cancellation_window_hours",
      label: "Cancelación (horas antes)",
      hint: "Hasta cuándo el cliente puede cancelar o modificar.",
      min: 0,
      feature: "full_reservation_policy",
    },
    {
      key: "arrival_grace_minutes",
      label: "Tolerancia de llegada (min)",
      hint: "Después de este tiempo puedes marcar no-show.",
      min: 0,
      feature: "full_reservation_policy",
    },
  ];

  return (
    <div className="py-4 px-4 rounded-xl bg-card border border-border space-y-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-amber-500" />
        <Label className="text-foreground font-semibold">Reglas de reserva</Label>
      </div>

      {fields.map((f) => (
        <LockedFeature
          key={f.key}
          feature={f.feature ?? "full_reservation_policy"}
          currentTier={tier}
          locked={!!f.feature && !hasFeature(f.feature)}
        >
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Input
              type="number"
              min={f.min}
              value={String(form[f.key] ?? "")}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  [f.key]: Math.max(f.min, num(e.target.value, f.min)),
                }))
              }
            />
            <p className="text-[11px] text-muted-foreground">{f.hint}</p>
          </div>
        </LockedFeature>
      ))}

      <LockedFeature
        feature="covers_pacing"
        currentTier={tier}
        locked={!hasFeature("covers_pacing")}
      >
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Máx. personas por franja (opcional)
          </Label>
          <Input
            type="number"
            min={1}
            placeholder="Sin límite"
            value={form.max_covers_per_interval ?? ""}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                max_covers_per_interval: e.target.value
                  ? Math.max(1, num(e.target.value, 1))
                  : null,
              }))
            }
          />
          <p className="text-[11px] text-muted-foreground">
            Controla el ritmo de llegadas para no saturar la cocina.
          </p>
        </div>
      </LockedFeature>

      <LockedFeature
        feature="table_joining"
        currentTier={tier}
        locked={!hasFeature("table_joining")}
      >
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm text-foreground">Unir mesas</Label>
            <p className="text-[11px] text-muted-foreground">
              Permite combinar hasta 3 mesas para grupos grandes.
            </p>
          </div>
          <Switch
            checked={form.allow_table_join}
            onCheckedChange={(v) => setForm((p) => ({ ...p, allow_table_join: v }))}
          />
        </div>
      </LockedFeature>

      <Button
        variant={saveVariant(isDirty)}
        className="w-full rounded-full"
        onClick={() => { save.mutate(form); capture(form); }}
        disabled={!isDirty || save.isPending}
      >
        Guardar reglas
      </Button>
    </div>
  );
};
