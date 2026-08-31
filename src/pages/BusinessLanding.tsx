import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  MapPin,
  QrCode,
  Sparkles,
  Store,
  Ticket,
  UtensilsCrossed,
  Users,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { setBusinessIntent } from "@/lib/businessIntent";
import { SUBSCRIPTION_TIERS } from "@/lib/subscriptionTiers";
import { haptic } from "@/lib/haptics";

const STEPS = [
  {
    key: "profile",
    title: "Tu perfil, el de tu negocio",
    subtitle: "Dejá de ser un perfil más: convertite en un lugar que la gente encuentra.",
    items: [
      { icon: Store, label: "Perfil de negocio", desc: "Dirección, horarios y teléfono siempre visibles." },
      { icon: MapPin, label: "En el mapa y en Discover", desc: "Aparecés donde la gente busca qué hacer hoy." },
      { icon: BadgeCheck, label: "Verificado como local", desc: "Tu cuenta se muestra como negocio real." },
    ],
  },
  {
    key: "tools",
    title: "Herramientas para llenar tu local",
    subtitle: "Todo lo que necesitás para vender, organizar y entender a tu público.",
    items: [
      { icon: Ticket, label: "Entradas con QR", desc: "Vendé online y cobrá directo a tu cuenta." },
      { icon: QrCode, label: "Control de ingreso", desc: "Escaneá y validá entradas en la puerta." },
      { icon: Users, label: "Guestlists", desc: "Invitados y accesos especiales sin planillas." },
      { icon: UtensilsCrossed, label: "Menú digital", desc: "Tu carta publicada en tu perfil." },
      { icon: CalendarCheck, label: "Reservas y experiencias", desc: "Sin llamadas ni WhatsApp." },
      { icon: BarChart3, label: "Dashboard", desc: "Ventas, audiencia y rendimiento." },
    ],
  },
  {
    key: "pricing",
    title: "Cuánto cuesta",
    subtitle: "Dos modelos claros. Sin sorpresas ni contratos.",
    items: [
      {
        icon: Ticket,
        label: "Eventos y entradas: 6% por ticket",
        desc: "Sin mensualidad. Discotecas, venues, productoras y experiencias: solo pagás cuando vendés.",
      },
      {
        icon: UtensilsCrossed,
        label: `Restaurante, café o bar: desde Bs. ${SUBSCRIPTION_TIERS.basico.price_bob}/mes`,
        desc: "Reservas online, menú digital y analíticas. Sin comisión por reserva.",
      },
      {
        icon: Sparkles,
        label: "Activación gratis",
        desc: "Crear tu cuenta Business no cuesta nada y toma menos de un minuto.",
      },
    ],
  },
] as const;

const BusinessLanding = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const go = (next: number) => {
    if (next < 0 || next >= STEPS.length) return;
    setDir(next > step ? 1 : -1);
    setStep(next);
    haptic("light");
  };

  const handleStart = () => {
    haptic("medium");
    if (!user) {
      setBusinessIntent();
      navigate("/auth", { state: { mode: "signup", businessIntent: true } });
      return;
    }
    if (profile?.is_business) {
      navigate("/settings/business");
      return;
    }
    navigate("/business/setup");
  };

  return (
    <div className="light-sheet min-h-[100dvh] bg-background text-foreground flex flex-col">
      {/* Progress */}
      <div className="safe-top px-5 pt-4">
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
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-foreground" : "w-2 bg-foreground/20",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-6">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <m.div
            key={current.key}
            custom={dir}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(step + 1);
              else if (info.offset.x > 60) go(step - 1);
            }}
            initial={{ opacity: 0, x: dir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -24 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="max-w-md mx-auto"
          >
            <h1 className="font-brand text-[32px] leading-tight font-medium text-foreground">
              {current.title}
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">{current.subtitle}</p>

            <div className="mt-5 space-y-2 pb-8">
              {current.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <m.div
                    key={item.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i, type: "spring", stiffness: 300, damping: 28 }}
                    className="flex items-start gap-3 rounded-2xl bg-muted/70 p-4"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
                      <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </m.div>
                );
              })}

              {isLast && (
                <button
                  type="button"
                  onClick={() => navigate("/settings/business/plans")}
                  className="mt-1 text-sm font-medium text-foreground underline underline-offset-4"
                >
                  Ver planes en detalle
                </button>
              )}
            </div>
          </m.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="px-5 pt-2 pb-[max(env(safe-area-inset-bottom),16px)] bg-background">
        <div className="max-w-md mx-auto">
          <Button
            variant="sheet-action"
            className="h-12 w-full rounded-full text-base"
            onClick={() => (isLast ? handleStart() : go(step + 1))}
          >
            {isLast ? "Crear mi cuenta Business" : "Siguiente"}
          </Button>
          {!isLast && (
            <button
              type="button"
              onClick={handleStart}
              className="mt-2 w-full py-2 text-sm font-medium text-muted-foreground active:opacity-60"
            >
              Saltar y crear mi cuenta
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessLanding;
