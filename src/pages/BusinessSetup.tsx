import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Phone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BusinessHoursEditor,
  DaySchedule,
  DEFAULT_SCHEDULE,
  parseSchedule,
  serializeSchedule,
} from "@/components/profile/BusinessHoursEditor";
import { LocationPicker } from "@/components/map/LocationPicker";
import { BeneficiaryForm } from "@/components/business/BeneficiaryForm";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BUSINESS_TYPES, isFoodBusinessType } from "@/lib/businessTypes";
import { SUBSCRIPTION_TIERS } from "@/lib/subscriptionTiers";
import { clearBusinessIntent } from "@/lib/businessIntent";
import { haptic } from "@/lib/haptics";

const TITLES = [
  { title: "¿Qué tipo de negocio tenés?", subtitle: "Con esto sabemos qué herramientas mostrarte." },
  { title: "Información de tu negocio", subtitle: "Así te encuentran y saben cuándo estás abierto." },
  { title: "¿Dónde recibís tu dinero?", subtitle: "Necesario para vender entradas. Podés hacerlo después." },
];

const BusinessSetup = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<string>("");
  const [businessHours, setBusinessHours] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessLocation, setBusinessLocation] = useState<{
    address: string;
    latitude: number | null;
    longitude: number | null;
  }>({ address: "", latitude: null, longitude: null });

  const isFood = isFoodBusinessType(type);

  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    if (p.business_type) setType((prev) => prev || p.business_type);
    const parsed = parseSchedule(p.business_hours || "");
    if (parsed) setBusinessHours(parsed);
    if (p.business_phone) setBusinessPhone((prev) => prev || p.business_phone);
    if (p.business_address) {
      setBusinessLocation((prev) =>
        prev.address
          ? prev
          : {
              address: p.business_address || "",
              latitude: p.business_latitude ?? null,
              longitude: p.business_longitude ?? null,
            },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
    haptic("light");
  };

  const saveType = async () => {
    if (!user || !type) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_business: true, business_type: type, is_food_business: isFood } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      go(1);
    } catch (e: any) {
      toast.error(e.message || "No pudimos guardar tu tipo de negocio");
    } finally {
      setSaving(false);
    }
  };

  const saveInfo = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          business_hours: serializeSchedule(businessHours),
          business_phone: businessPhone.trim() || null,
          business_address: businessLocation.address.trim() || null,
          business_latitude: businessLocation.latitude,
          business_longitude: businessLocation.longitude,
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      go(2);
    } catch (e: any) {
      toast.error(e.message || "No pudimos guardar tu información");
    } finally {
      setSaving(false);
    }
  };

  const finish = () => {
    clearBusinessIntent();
    haptic("success");
    toast.success("¡Tu cuenta Business está lista!");
    navigate(isFood ? "/settings/business/plans" : "/settings/business", { replace: true });
  };

  const skipAll = () => {
    clearBusinessIntent();
    navigate("/settings/business", { replace: true });
  };

  const current = TITLES[step];

  return (
    <div className="light-sheet min-h-[100dvh] bg-background text-foreground flex flex-col">
      {/* Header + progress */}
      <div className="safe-top px-5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Volver"
              onClick={() => (step === 0 ? navigate(-1) : go(step - 1))}
              className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-foreground active:opacity-60"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5">
              {TITLES.map((t, i) => (
                <span
                  key={t.title}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i === step ? "w-6 bg-foreground" : i < step ? "w-2 bg-foreground/60" : "w-2 bg-foreground/20",
                  )}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={skipAll}
            className="text-sm font-medium text-muted-foreground active:opacity-60"
          >
            Completar después
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-6">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={step}
            initial={{ opacity: 0, x: dir * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -20 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="max-w-md mx-auto"
          >
            <h1 className="font-brand text-[28px] leading-tight font-medium text-foreground">
              {current.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{current.subtitle}</p>

            {/* Step 1 — category */}
            {step === 0 && (
              <>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {BUSINESS_TYPES.map((t) => {
                    const active = type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className={cn(
                          "flex items-center gap-2 rounded-2xl border p-3.5 text-left transition-colors",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-muted/50 text-foreground",
                        )}
                      >
                        <span className="text-lg">{t.emoji}</span>
                        <span className="text-sm font-medium">{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {type && (
                  <p className="mt-4 rounded-2xl bg-muted/60 p-4 text-[13px] leading-snug text-muted-foreground">
                    {isFood
                      ? `Reservas y menú van con un plan desde Bs. ${SUBSCRIPTION_TIERS.basico.price_bob}/mes. Sin comisión por reserva.`
                      : "Tu cuenta Business es gratis: ganás vendiendo entradas y con posts patrocinados."}
                  </p>
                )}
              </>
            )}

            {/* Step 2 — info */}
            {step === 1 && (
              <div className="mt-5 space-y-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> Dirección
                  </Label>
                  <LocationPicker value={businessLocation} onChange={setBusinessLocation} />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" /> Horarios de atención
                  </Label>
                  <BusinessHoursEditor value={businessHours} onChange={setBusinessHours} />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="setup-phone"
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Phone className="w-3.5 h-3.5" /> Teléfono de contacto
                  </Label>
                  <Input
                    id="setup-phone"
                    type="tel"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="+591 70000000"
                  />
                </div>
              </div>
            )}

            {/* Step 3 — bank */}
            {step === 2 && (
              <div className="mt-5">
                <BeneficiaryForm allowManage submitLabel="Guardar cuenta bancaria" />
                <p className="mt-3 px-1 text-[12px] leading-relaxed text-muted-foreground">
                  🔒 Tus datos se envían de forma segura a Qhantuy, nuestro procesador de pagos. Sin
                  esta cuenta podés publicar eventos gratuitos, pero no cobrar entradas.
                </p>
              </div>
            )}
          </m.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="px-5 pt-2 pb-[max(env(safe-area-inset-bottom),16px)] bg-background">
        <div className="max-w-md mx-auto">
          {step === 0 && (
            <Button
              variant="sheet-action"
              className="h-12 w-full rounded-full text-base"
              disabled={!type || saving}
              onClick={saveType}
            >
              Continuar
            </Button>
          )}
          {step === 1 && (
            <Button
              variant="sheet-action"
              className="h-12 w-full rounded-full text-base"
              disabled={saving}
              onClick={saveInfo}
            >
              {saving ? "Guardando..." : "Continuar"}
            </Button>
          )}
          {step === 2 && (
            <Button
              variant="sheet-action"
              className="h-12 w-full rounded-full text-base"
              onClick={finish}
            >
              <Check className="w-4 h-4 mr-2" />
              Listo, ir a mi cuenta Business
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessSetup;
