import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { m } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { haptic } from "@/lib/haptics";

interface TourStep {
  target?: string;
  title: string;
  body: string;
  cta?: { label: string; to: string };
}

const STEPS: TourStep[] = [
  { target: "nav-home", title: "Inicio", body: "Así ven tu contenido las personas cerca tuyo." },
  {
    target: "nav-create",
    title: "Tu primer paso",
    body: "Con el + publicás un evento o un post.",
    cta: { label: "Crear mi primera publicación", to: "/create" },
  },
  { target: "nav-gestion", title: "Gestión", body: "Acá manejás tus eventos, entradas, invitados y reservas." },
  { target: "nav-profile", title: "Tu perfil", body: "Tu página pública: lo que ven tus clientes." },
  {
    title: "Configurá tu negocio",
    body: "Completá tu información, pagos y plan cuando quieras desde Perfil > Configuración > Business.",
  },
];

const tourKey = (id: string) => `business-tour:${id}`;

/** Returns the visible element for a tour target (bottom nav or desktop rail). */
const findTarget = (id?: string): HTMLElement | null => {
  if (!id) return null;
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`));
  return els.find((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0) ?? null;
};

export const BusinessHomeTour = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!user) return;
    try {
      if (localStorage.getItem(tourKey(user.id)) === "1") return;
    } catch {
      return;
    }
    const t = setTimeout(() => setOpen(true), (location.state as any)?.businessTour ? 500 : 900);
    return () => clearTimeout(t);
  }, [user, location.state]);

  const current = STEPS[step];

  const measure = useCallback(() => {
    const el = findTarget(current?.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [current?.target]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, measure]);

  const close = useCallback(() => {
    if (user) {
      try {
        localStorage.setItem(tourKey(user.id), "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }, [user]);

  if (!open || !current) return null;

  const isLast = step === STEPS.length - 1;
  const next = () => {
    void haptic("light");
    if (isLast) close();
    else setStep((s) => s + 1);
  };

  const pad = 6;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(320, vw - 32);
  let cardStyle: React.CSSProperties = { left: (vw - cardW) / 2, top: vh / 2 - 110, width: cardW };
  if (rect) {
    const isRail = rect.left < 120 && rect.top < vh - 120;
    if (isRail) {
      cardStyle = { left: rect.right + 16, top: Math.max(16, rect.top - 20), width: cardW };
    } else {
      const center = rect.left + rect.width / 2;
      const left = Math.min(Math.max(16, center - cardW / 2), vw - cardW - 16);
      cardStyle = { left, bottom: vh - rect.top + 16, width: cardW };
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Recorrido de tu cuenta Business">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-primary transition-all duration-300"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px hsl(var(--background) / 0.72)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-background/70" />
      )}
      <button aria-label="Cerrar recorrido" className="absolute inset-0 cursor-default" onClick={close} />

      <m.div
        key={step}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="light-sheet absolute rounded-3xl bg-background p-5 text-foreground shadow-2xl"
        style={cardStyle}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {step + 1} de {STEPS.length}
          </span>
          <button
            onClick={close}
            aria-label="Omitir"
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-1 font-brand text-lg font-semibold">{current.title}</h3>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">{current.body}</p>

        {current.cta && (
          <Button
            variant="sheet-action"
            className="mt-4 h-11 w-full rounded-full"
            onClick={() => {
              close();
              navigate(current.cta!.to);
            }}
          >
            {current.cta.label}
          </Button>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Button variant="ghost" className="h-10 rounded-full px-4" onClick={close}>
            Omitir
          </Button>
          <Button
            variant={current.cta ? "secondary" : "sheet-action"}
            className="h-10 flex-1 rounded-full"
            onClick={next}
          >
            {isLast ? "Empezar" : "Siguiente"}
          </Button>
        </div>
      </m.div>
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
