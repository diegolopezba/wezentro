import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  CalendarCheck,
  Store,
  Ticket,
  UtensilsCrossed,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUBSCRIPTION_TIERS } from "@/lib/subscriptionTiers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user confirms they want a Business account. */
  onActivate: () => void | Promise<void>;
  isActivating?: boolean;
}

const STEPS = [
  {
    title: "Tu perfil, ahora el de tu negocio",
    subtitle:
      "Mostrá dirección, horarios y contacto. La gente te encuentra en el mapa y en Discover.",
    items: [
      { icon: Store, label: "Perfil de negocio", desc: "Dirección, horarios y teléfono visibles." },
      { icon: Briefcase, label: "Verificado como local", desc: "Tu cuenta deja de ser un perfil personal." },
    ],
  },
  {
    title: "Todo lo que podés hacer",
    subtitle: "Las herramientas para llenar tu local, en un solo lugar.",
    items: [
      { icon: Ticket, label: "Entradas y guestlists", desc: "Vendé entradas con QR y controlá el ingreso." },
      { icon: UtensilsCrossed, label: "Menú digital", desc: "Publicá tu carta directo en tu perfil." },
      { icon: CalendarCheck, label: "Reservas online", desc: "Recibí reservas sin llamadas ni WhatsApp." },
      { icon: BarChart3, label: "Dashboard", desc: "Ventas, audiencia y rendimiento de tu contenido." },
    ],
  },
  {
    title: "Cuánto cuesta",
    subtitle: "Sin sorpresas: depende del tipo de negocio que tengas.",
    items: [
      {
        icon: Ticket,
        label: "Eventos y entradas: gratis",
        desc: "Discotecas, venues y productores no pagan mensualidad.",
      },
      {
        icon: UtensilsCrossed,
        label: `Restaurante, café o bar: desde Bs. ${SUBSCRIPTION_TIERS.basico.price_bob}/mes`,
        desc: "Incluye reservas online, menú y analíticas. Sin comisión por reserva.",
      },
    ],
  },
];

/**
 * Value-first explainer shown BEFORE the business account is enabled.
 * Three steps: what it is, what you get, what it costs.
 */
export const BusinessIntroSheet = ({ open, onOpenChange, onActivate, isActivating }: Props) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleOpenChange = (v: boolean) => {
    if (!v) setStep(0);
    onOpenChange(v);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="light-sheet rounded-t-3xl pb-0">
        <SheetTitle className="sr-only">Cuenta Business</SheetTitle>

        <div className="flex flex-col">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5 px-1 pt-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === step ? "w-6 bg-foreground" : "w-2 bg-muted-foreground/30",
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="pt-5"
            >
              <h2 className="font-brand text-[26px] font-medium leading-tight text-foreground">
                {current.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{current.subtitle}</p>

              <div className="mt-4 space-y-2">
                {current.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 rounded-2xl bg-muted/60 p-4"
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isLast && (
                <button
                  type="button"
                  onClick={() => {
                    handleOpenChange(false);
                    navigate("/settings/business/plans");
                  }}
                  className="mt-3 text-sm font-medium text-foreground underline underline-offset-4"
                >
                  Ver planes
                </button>
              )}
            </m.div>
          </AnimatePresence>

          {/* Sticky CTA */}
          <div className="mt-5 pb-[max(env(safe-area-inset-bottom),12px)]">
            <Button
              variant="sheet-action"
              className="h-12 w-full rounded-full text-base"
              disabled={isActivating}
              onClick={() => (isLast ? onActivate() : setStep((s) => s + 1))}
            >
              {isLast ? "Activar cuenta Business" : "Siguiente"}
            </Button>
            <button
              type="button"
              onClick={() => (step === 0 ? handleOpenChange(false) : setStep((s) => s - 1))}
              className="mt-2 w-full py-2 text-sm font-medium text-muted-foreground active:opacity-60"
            >
              {step === 0 ? "Ahora no" : "Atrás"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
