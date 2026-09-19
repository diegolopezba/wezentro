import { useState } from "react";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/600.css";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  CalendarCheck,
  ChartNoAxesCombined,
  Check,
  Clock3,
  MapPin,
  Martini,
  QrCode,
  Store,
  Ticket,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { setBusinessIntent } from "@/lib/businessIntent";
import { SUBSCRIPTION_TIERS } from "@/lib/subscriptionTiers";
import { haptic } from "@/lib/haptics";

type VisualKey = "discover" | "publish" | "tickets" | "reservations" | "insights" | "pricing";

const STEPS: ReadonlyArray<{
  key: VisualKey;
  title: string;
  subtitle: string;
}> = [
  {
    key: "discover",
    title: "Hacé que encuentren tu negocio",
    subtitle: "Mostrá dónde estás, tus horarios y cómo contactarte.",
  },
  {
    key: "publish",
    title: "Publicá lo que está por pasar",
    subtitle: "Creá eventos y experiencias que la gente quiera vivir.",
  },
  {
    key: "tickets",
    title: "Vendé entradas sin complicarte",
    subtitle: "Cobrá online y validá cada ingreso con QR.",
  },
  {
    key: "reservations",
    title: "Recibí reservas mientras atendés",
    subtitle: "Activá menú, horarios y reservas con uno de nuestros planes.",
  },
  {
    key: "insights",
    title: "Entendé qué hace crecer tu negocio",
    subtitle: "Mirá ventas, audiencia y rendimiento desde un solo lugar.",
  },
  {
    key: "pricing",
    title: "Empezá con un modelo claro",
    subtitle: `Eventos: 6% por venta. Menú y reservas: desde Bs. ${SUBSCRIPTION_TIERS.basico.price_bob} al mes.`,
  },
];

const Orb = ({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) => (
  <m.div
    className={cn(
      "absolute flex items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-card",
      className,
    )}
    initial={{ opacity: 0, scale: 0.72 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 250, damping: 22 }}
  >
    {children}
  </m.div>
);

const VisualStage = ({ visual }: { visual: VisualKey }) => {
  const reduceMotion = useReducedMotion();
  const float = reduceMotion ? undefined : { y: [0, -6, 0] };

  return (
    <div className="relative mx-auto flex h-full w-full max-w-[390px] items-center justify-center overflow-hidden" aria-hidden="true">
      <div className="absolute h-72 w-72 rounded-full border border-border/70" />
      <div className="absolute h-52 w-52 rounded-full border border-border" />

      {visual === "discover" && (
        <>
          <div className="absolute h-48 w-48 rotate-12 rounded-[36px] bg-muted/70">
            <div className="absolute left-8 top-0 h-full w-px -rotate-12 bg-border" />
            <div className="absolute right-10 top-0 h-full w-px rotate-[28deg] bg-border" />
            <div className="absolute left-0 top-16 h-px w-full -rotate-12 bg-border" />
            <div className="absolute left-0 bottom-12 h-px w-full rotate-[18deg] bg-border" />
          </div>
          <m.div animate={float} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} className="relative z-10 flex h-28 w-28 flex-col items-center justify-center rounded-[28px] bg-brand-red text-brand-red-foreground shadow-elevated">
            <Store className="h-9 w-9" />
            <span className="mt-2 text-xs font-semibold">Tu negocio</span>
          </m.div>
          <Orb className="left-[8%] top-[22%] h-14 w-14 -rotate-6"><MapPin className="h-6 w-6 text-brand-red" /></Orb>
          <Orb className="right-[8%] top-[28%] h-16 w-16 rotate-6"><Clock3 className="h-7 w-7" /></Orb>
          <Orb className="bottom-[16%] left-[18%] h-14 w-14 rotate-6"><BadgeCheck className="h-6 w-6 text-brand-red" /></Orb>
        </>
      )}

      {visual === "publish" && (
        <>
          <m.div animate={float} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }} className="relative z-10 w-48 -rotate-3 overflow-hidden rounded-[28px] border border-border bg-card shadow-elevated">
            <div className="flex h-32 items-center justify-center bg-foreground text-background">
              <Martini className="h-12 w-12" />
            </div>
            <div className="space-y-2 p-4">
              <div className="h-3 w-3/4 rounded-full bg-foreground" />
              <div className="h-2 w-1/2 rounded-full bg-muted" />
            </div>
          </m.div>
          <Orb className="left-[3%] top-[20%] h-16 w-16 -rotate-12"><CalendarCheck className="h-7 w-7 text-brand-red" /></Orb>
          <Orb className="right-[5%] top-[24%] h-20 w-20 rotate-12"><Ticket className="h-8 w-8" /></Orb>
          <Orb className="bottom-[11%] right-[14%] h-14 w-14 -rotate-6"><Users className="h-6 w-6 text-brand-red" /></Orb>
        </>
      )}

      {visual === "tickets" && (
        <>
          <m.div animate={float} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="relative z-10 flex h-56 w-44 flex-col items-center rounded-[28px] border border-border bg-card p-5 shadow-elevated">
            <div className="flex w-full items-center justify-between">
              <Ticket className="h-5 w-5 text-brand-red" />
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Entrada</span>
            </div>
            <QrCode className="mt-6 h-24 w-24" />
            <div className="mt-4 h-2 w-20 rounded-full bg-muted" />
          </m.div>
          <Orb className="right-[5%] top-[22%] h-16 w-16 rotate-12"><Check className="h-8 w-8 text-brand-red" /></Orb>
          <Orb className="bottom-[14%] left-[6%] h-16 w-20 -rotate-6"><span className="text-sm font-bold">Bs.</span></Orb>
        </>
      )}

      {visual === "reservations" && (
        <>
          <m.div animate={float} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-brand-red text-brand-red-foreground shadow-elevated">
            <UtensilsCrossed className="h-11 w-11" />
          </m.div>
          <Orb className="left-[5%] top-[20%] h-20 w-20 -rotate-12"><CalendarCheck className="h-8 w-8" /></Orb>
          <Orb className="right-[3%] top-[28%] h-16 w-16 rotate-12"><Clock3 className="h-7 w-7 text-brand-red" /></Orb>
          <Orb className="bottom-[10%] left-[17%] h-16 w-24 rotate-6"><span className="text-xs font-bold">Mesa 12</span></Orb>
          <Orb className="bottom-[14%] right-[10%] h-14 w-14 -rotate-6"><Check className="h-7 w-7 text-brand-red" /></Orb>
        </>
      )}

      {visual === "insights" && (
        <>
          <m.div animate={float} transition={{ duration: 3.3, repeat: Infinity, ease: "easeInOut" }} className="relative z-10 w-48 rounded-[28px] border border-border bg-card p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Esta semana</span>
              <BarChart3 className="h-5 w-5 text-brand-red" />
            </div>
            <div className="mt-3 text-3xl font-bold">+24%</div>
            <div className="mt-5 flex h-20 items-end gap-2">
              {["h-7", "h-12", "h-9", "h-16", "h-20"].map((height, index) => (
                <div key={height} className={cn("flex-1 rounded-t-md", height, index === 4 ? "bg-brand-red" : "bg-muted")} />
              ))}
            </div>
          </m.div>
          <Orb className="left-[3%] top-[23%] h-16 w-16 -rotate-12"><Users className="h-7 w-7" /></Orb>
          <Orb className="bottom-[12%] right-[5%] h-16 w-16 rotate-12"><ChartNoAxesCombined className="h-7 w-7 text-brand-red" /></Orb>
        </>
      )}

      {visual === "pricing" && (
        <>
          <div className="relative z-10 flex w-full items-center justify-center gap-4 px-8">
            <m.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} className="flex h-44 w-36 flex-col items-center justify-center rounded-[28px] border border-border bg-card p-4 text-center shadow-card">
              <Ticket className="h-8 w-8 text-brand-red" />
              <span className="mt-4 text-2xl font-bold">6%</span>
              <span className="mt-1 text-[11px] leading-tight text-muted-foreground">solo cuando vendés</span>
            </m.div>
            <m.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className="flex h-44 w-36 flex-col items-center justify-center rounded-[28px] bg-foreground p-4 text-center text-background shadow-elevated">
              <UtensilsCrossed className="h-8 w-8" />
              <span className="mt-4 text-2xl font-bold">Bs. {SUBSCRIPTION_TIERS.basico.price_bob}</span>
              <span className="mt-1 text-[11px] leading-tight opacity-70">por mes desde</span>
            </m.div>
          </div>
          <div className="absolute bottom-[9%] rounded-full bg-muted px-4 py-2 text-xs font-semibold text-foreground">Activación gratis</div>
        </>
      )}
    </div>
  );
};

const BusinessLanding = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [separateOpen, setSeparateOpen] = useState(false);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const go = (next: number) => {
    if (next < 0 || next >= STEPS.length) return;
    setDir(next > step ? 1 : -1);
    setStep(next);
    void haptic("light");
  };

  const handleStart = () => {
    void haptic("medium");
    if (!user) {
      setBusinessIntent();
      navigate("/auth", { state: { mode: "signup", businessIntent: true } });
      return;
    }
    if (profile?.is_business || (profile as { account_type?: string } | null)?.account_type === "business") {
      navigate("/settings/business");
      return;
    }
    setSeparateOpen(true);
  };

  const startSeparateAccount = async () => {
    setBusinessIntent();
    await signOut();
    navigate("/auth", { state: { mode: "signup", businessIntent: true } });
  };

  return (
    <main className="light-sheet min-h-[100dvh] overflow-hidden bg-muted text-foreground [font-family:Figtree,sans-serif] lg:flex lg:items-center lg:justify-center lg:p-6">
      <div className="relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-background lg:h-[min(844px,calc(100dvh-48px))] lg:rounded-[32px] lg:shadow-elevated">
        <header className="safe-top z-20 flex shrink-0 items-center justify-between px-5 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Volver"
            onClick={() => (step === 0 ? navigate(-1) : go(step - 1))}
            className="-ml-2 h-10 w-10 text-foreground active:opacity-60"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleStart}
            className="h-9 px-4 text-sm font-semibold text-brand-red active:bg-muted"
          >
            Omitir
          </Button>
        </header>

        <section className="relative min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <m.div
              key={current.key}
              custom={dir}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.14}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(step + 1);
                else if (info.offset.x > 60) go(step - 1);
              }}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir * -28 }}
              transition={reduceMotion ? { duration: 0.08 } : { type: "spring", stiffness: 300, damping: 31 }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="min-h-0 flex-[1.15] px-3">
                <VisualStage visual={current.key} />
              </div>

              <div className="shrink-0 px-7 pb-3 text-center">
                <div className="mb-5 flex items-center justify-center gap-1.5" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
                  {STEPS.map((item, index) => (
                    <span
                      key={item.key}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        index === step ? "w-6 bg-brand-red" : "w-1.5 bg-muted",
                      )}
                    />
                  ))}
                </div>
                <h1 className="mx-auto max-w-[340px] text-[29px] font-bold leading-[1.08] text-foreground [font-family:Outfit,sans-serif]">
                  {current.title}
                </h1>
                <p className="mx-auto mt-3 min-h-10 max-w-[320px] text-[15px] leading-snug text-muted-foreground">
                  {current.subtitle}
                </p>
              </div>
            </m.div>
          </AnimatePresence>
        </section>

        <footer className="z-20 shrink-0 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-2">
          <Button
            type="button"
            className="h-14 w-full bg-brand-red text-base font-semibold text-brand-red-foreground active:scale-[0.98]"
            onClick={() => (isLast ? handleStart() : go(step + 1))}
          >
            {isLast ? "Crear mi cuenta Business" : "Siguiente"}
          </Button>
        </footer>

        {separateOpen && (
          <div className="absolute inset-0 z-[60] flex items-end justify-center bg-foreground/40 px-4 pb-6">
            <div className="light-sheet w-full rounded-3xl bg-background p-5 text-foreground shadow-elevated">
              <h2 className="text-lg font-semibold [font-family:Outfit,sans-serif]">Tu cuenta Business es aparte</h2>
              <p className="mt-2 text-sm leading-snug text-muted-foreground">
                Vas a cerrar sesión en tu cuenta personal para crear la cuenta de tu negocio con otro email.
              </p>
              <div className="mt-5 space-y-2">
                <Button className="h-12 w-full bg-brand-red text-base text-brand-red-foreground" onClick={startSeparateAccount}>
                  Cerrar sesión y continuar
                </Button>
                <Button variant="ghost" className="h-11 w-full" onClick={() => setSeparateOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default BusinessLanding;