import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { haptic } from "@/lib/haptics";
import { useIsBusinessAccount } from "@/hooks/useIsBusinessAccount";

interface TourStep {
  path: string;
  target: string;
  progress: string;
  title: string;
  body: string;
}

const stepsFor = (businessType?: string | null): TourStep[] => {
  const food = ["restaurant", "bar", "coffee"].includes(businessType ?? "");
  const experience = ["gym", "gallery"].includes(businessType ?? "");
  const tab = food ? "reservas" : experience ? "experiencias" : "eventos";
  return [
    { path: "/", target: "home-feed", progress: "1/5", title: "El homepage", body: "Aquí encontrás todo lo que está pasando alrededor tuyo. Cada publicación es un evento, experiencia o lugar nuevo por conocer." },
    { path: "/create", target: "create-types", progress: "2/5", title: "Crear eventos o publicaciones", body: "Desde aquí publicás todos tus eventos, publicaciones o experiencias." },
    { path: `/gestion?tab=${tab}`, target: `gestion-${tab}`, progress: "3/5", title: "Página de Gestión", body: food ? "Desde aquí gestionás y visualizás todas tus reservas, mesas, usuarios, etc." : experience ? "Desde aquí gestionás y visualizás todos tus bookings, fechas, etc." : "Desde aquí gestionás y visualizás todos tus eventos, ventas, RRPPs, invitaciones, etc." },
    { path: "/profile", target: "profile-posts", progress: "4.1/5", title: "Tu perfil", body: "Este es tu perfil, aquí aparecen todas tus publicaciones en orden cronológico. Mientras más usuarios te sigan, mejor. ¡Así que empezá a publicar!" },
    { path: "/profile", target: "profile-info", progress: "4.2/5", title: "Botón de info", body: "Las personas pueden saber más sobre tu negocio, como horarios, ubicación y contacto, a través de este botón." },
    { path: "/settings/business", target: "business-settings", progress: "5/5", title: "Configuraciones Business", body: "Desde aquí podés configurar pagos, establecer mesas, ver analíticas, agregar tu menú, reservas y configurar experiencias. ¡Bienvenido al mundo Zentro!" },
  ];
};

const tourKey = (id: string) => `business-tour:v2:${id}`;

/** Returns the visible element for a tour target (bottom nav or desktop rail). */
const findTarget = (id: string): HTMLElement | null => {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`));
  return els.find((el) => el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0) ?? null;
};

export const BusinessHomeTour = () => {
  const { user, profile } = useAuth();
  const isBusiness = useIsBusinessAccount();
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "welcome" | "tour">("idle");
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const steps = stepsFor((profile as { business_type?: string } | null)?.business_type);
  const current = steps[step];

  useEffect(() => {
    if (!user || !isBusiness) {
      setPhase("idle");
      return;
    }
    try {
      const saved = localStorage.getItem(tourKey(user.id));
      if (saved === "done") { setPhase("idle"); return; }
      if (saved?.startsWith("step:")) {
        setStep(Math.min(steps.length - 1, Math.max(0, Number(saved.slice(5)) || 0)));
        setPhase("tour");
      } else if (location.pathname === "/") {
        setPhase("welcome");
      }
    } catch {
      if (location.pathname === "/") setPhase("welcome");
    }
  }, [user?.id, isBusiness, location.pathname]);

  useEffect(() => {
    if (phase !== "tour" || !current) return;
    if (location.pathname !== current.path.split("?")[0]) navigate(current.path, { replace: true });
  }, [phase, step, location.pathname, current?.path, navigate]);

  const measure = useCallback(() => {
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    const target = current?.target === "profile-info" && !findTarget("profile-info") ? "profile-header" : current?.target;
    const el = target ? findTarget(target) : null;
    const bounds = el?.getBoundingClientRect();
    setRect(bounds && bounds.top < window.innerHeight && bounds.bottom > 0 ? bounds : null);
  }, [current?.target]);

  useLayoutEffect(() => {
    if (phase !== "tour" || location.pathname !== current?.path.split("?")[0]) return;
    const target = findTarget(current.target);
    if (target && current.target !== "home-feed") target.scrollIntoView({ block: "nearest", behavior: "instant" });
    measure();
    const timer = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.clearInterval(timer); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [phase, step, location.pathname, current?.path, measure]);

  if (phase === "idle" || !current || !user) return null;

  const isLast = step === steps.length - 1;
  const next = () => {
    void haptic("light");
    if (isLast) {
      try { localStorage.setItem(tourKey(user.id), "done"); } catch { /* continue */ }
      setPhase("idle");
      navigate("/");
    } else {
      const nextStep = step + 1;
      try { localStorage.setItem(tourKey(user.id), `step:${nextStep}`); } catch { /* continue */ }
      setRect(null);
      setStep(nextStep);
      if (steps[nextStep].path !== current.path) navigate(steps[nextStep].path);
    }
  };

  const pad = 5;
  const vw = viewport.width;
  const vh = viewport.height;
  const cardW = Math.min(340, vw - 32);
  const cardHeight = 230;
  let cardStyle: React.CSSProperties = { left: (vw - cardW) / 2, top: Math.max(16, (vh - cardHeight) / 2), width: cardW };
  let arrow: "top" | "bottom" | "left" | null = null;
  let arrowOffset = cardW / 2;
  if (rect) {
    if (rect.right + cardW + 24 < vw && rect.left < 130) {
      cardStyle = { left: rect.right + 18, top: Math.max(16, Math.min(rect.top - 18, vh - cardHeight - 16)), width: cardW };
      arrow = "left";
    } else {
      const center = rect.left + rect.width / 2;
      const left = Math.min(Math.max(16, center - cardW / 2), vw - cardW - 16);
      arrowOffset = Math.max(22, Math.min(cardW - 22, center - left));
      if (vh - rect.bottom > cardHeight + 28) {
        cardStyle = { left, top: rect.bottom + 18, width: cardW };
        arrow = "top";
      } else if (rect.top > cardHeight + 28) {
        cardStyle = { left, top: rect.top - cardHeight - 18, width: cardW };
        arrow = "bottom";
      }
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Recorrido de tu cuenta Business">
      {phase === "welcome" ? (
        <>
          <div className="absolute inset-0 bg-background/75" />
          <m.div initial={reducedMotion ? false : { y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.3 }} className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-card px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-7 text-card-foreground shadow-2xl">
            <div className="mx-auto max-w-md">
              <h2 className="font-brand text-xl font-semibold">Bienvenidos a Zentro</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Tranqui, te vamos a hacer el tour para que aprendas todo en 5 min.</p>
              <Button variant="sheet-action" className="mt-6 h-12 w-full rounded-full" onClick={() => {
                try { localStorage.setItem(tourKey(user.id), "step:0"); } catch { /* continue */ }
                setPhase("tour");
                void haptic("light");
              }}>Comenzar</Button>
            </div>
          </m.div>
        </>
      ) : (
        <>
          {rect ? (
            <m.div className="pointer-events-none absolute rounded-lg ring-2 ring-brand-red" animate={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} style={{ boxShadow: "0 0 0 9999px hsl(var(--background) / 0.78)" }} />
          ) : <div className="absolute inset-0 bg-background/75" />}
          <AnimatePresence mode="wait">
            <m.div key={step} initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: reducedMotion ? 0 : 0.22 }} className="absolute rounded-lg border border-border bg-card p-5 text-card-foreground shadow-2xl" style={cardStyle}>
              {arrow && <span aria-hidden className={`absolute h-3 w-3 rotate-45 border-border bg-card ${arrow === "top" ? "-top-[7px] border-l border-t" : arrow === "bottom" ? "-bottom-[7px] border-b border-r" : "-left-[7px] border-b border-l"}`} style={arrow === "left" ? { top: 30 } : { left: arrowOffset - 6 }} />}
              <p className="text-xs font-semibold text-brand-red">{current.progress}</p>
              <h2 className="mt-2 font-brand text-lg font-semibold">{current.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.body}</p>
              <Button variant="sheet-action" className="mt-5 h-11 w-full rounded-full" onClick={next}>{isLast ? "Listo" : "Continuar"}</Button>
            </m.div>
          </AnimatePresence>
        </>
      )}
    </div>,
    document.body,
  );
};

/** Dismissible nudge at the top of Inicio while business setup is incomplete. */
export const BusinessSetupReminder = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { hasPayouts, isLoading } = useDashboardAccess() as any;
  const key = user ? `business-setup-reminder:${user.id}` : "";
  const [dismissed, setDismissed] = useState(() => {
    try {
      return !!key && localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });

  const hasInfo = !!(profile as any)?.business_address;
  if (!user || dismissed || isLoading || (hasInfo && hasPayouts)) return null;

  return (
    <div className="px-4 pt-2">
      <div className="flex items-center gap-2 rounded-2xl bg-secondary p-3">
        <button
          className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70"
          onClick={() => navigate("/settings/business")}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Terminá de configurar tu negocio</p>
            <p className="text-xs text-muted-foreground">
              {!hasInfo ? "Dirección, horarios y teléfono" : "Configurá tus pagos para vender entradas"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
        <button
          aria-label="Ocultar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
          onClick={() => {
            try {
              localStorage.setItem(key, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
