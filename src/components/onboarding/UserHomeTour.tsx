import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";

interface TourStep { path: string; target: string; progress: string; title: string; body: string }

const EVENT_PATH = "__event__";
const STEPS: TourStep[] = [
  { path: "/", target: "home-feed-all", progress: "1/4", title: "Descubrí qué hacer", body: "Aquí ves los mejores eventos, fiestas, bares, restaurantes y experiencias activas en tu ciudad." },
  { path: EVENT_PATH, target: "event-cta", progress: "2.1/4", title: "Comprá y reservá desde un mismo lugar", body: "Comprá entradas para eventos y boliches, hacé reservas en restaurantes y booking de experiencias." },
  { path: EVENT_PATH, target: "event-friends", progress: "2.2/4", title: "Mirá quién más va", body: "Mirá quién de tus amigos ya está yendo al evento al que querés ir." },
  { path: "/tickets", target: "nav-tickets", progress: "3/4", title: "Tus entradas y reservas", body: "Tus entradas que compraste, tus reservas en restaurantes y experiencias y todos sus detalles, los ves siempre desde aquí, en tu sección de entradas y reservas." },
  { path: "/profile", target: "nav-profile", progress: "4/4", title: "Tu perfil", body: "Seguí a tus amigos y negocios favoritos, publicá tus mejores momentos y guardá los lugares que querés visitar después." },
];

/** Only accounts created after the tour launched see it (first signup only). */
const TOUR_LAUNCH = Date.parse("2026-10-08T00:00:00Z");
const tourKey = (id: string) => `user-tour:v1:${id}`;

const findTarget = (id: string): HTMLElement | null => {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`));
  return els.find((el) => el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0) ?? null;
};

export const UserHomeTour = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "welcome" | "tour">("idle");
  const [step, setStep] = useState(0);
  const [eventId, setEventId] = useState<string | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const current = STEPS[step];
  const pathFor = (s: TourStep) => (s.path === EVENT_PATH ? (eventId ? `/event/${eventId}` : "/") : s.path);

  // Start only on Inicio, so purchase/reservation/invite flows are never interrupted.
  useEffect(() => {
    if (!user) { setPhase("idle"); return; }
    const isNew = user.created_at && Date.parse(user.created_at) >= TOUR_LAUNCH;
    try {
      const saved = localStorage.getItem(tourKey(user.id));
      if (saved === "done" || (!saved && !isNew)) { setPhase("idle"); return; }
      if (saved?.startsWith("step:")) {
        setStep(Math.min(STEPS.length - 1, Math.max(0, Number(saved.slice(5)) || 0)));
        setPhase((p) => (p === "idle" ? "tour" : p));
      } else if (location.pathname === "/") setPhase((p) => (p === "idle" ? "welcome" : p));
    } catch { /* ignore */ }
  }, [user?.id, location.pathname]);

  // Pick a real upcoming event to demo the detail page.
  useEffect(() => {
    if (phase === "idle" || eventId) return;
    void (async () => {
      const { data } = await supabase.from("events").select("id, guestlist_entries(count)")
        .eq("is_public", true).eq("is_post", false).is("deleted_at", null)
        .gte("start_datetime", new Date().toISOString()).order("start_datetime").limit(20);
      const rows = (data ?? []) as Array<{ id: string; guestlist_entries?: { count: number }[] }>;
      const best = [...rows].sort((a, b) => (b.guestlist_entries?.[0]?.count ?? 0) - (a.guestlist_entries?.[0]?.count ?? 0))[0];
      if (best) setEventId(best.id);
    })();
  }, [phase, eventId]);

  useEffect(() => {
    if (phase !== "tour" || !current) return;
    const p = pathFor(current);
    if (location.pathname !== p) navigate(p, { replace: true });
  }, [phase, step, eventId, location.pathname]);

  const measure = useCallback(() => {
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    const el = current ? findTarget(current.target) : null;
    const b = el?.getBoundingClientRect();
    setRect(b && b.top < window.innerHeight && b.bottom > 0 ? b : null);
  }, [current?.target]);

  useLayoutEffect(() => {
    if (phase !== "tour" || !current) return;
    const t = findTarget(current.target);
    if (t && current.target === "event-friends") t.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    measure();
    const timer = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.clearInterval(timer); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [phase, step, location.pathname, measure]);

  if (phase === "idle" || !current || !user) return null;

  const finish = () => {
    try { localStorage.setItem(tourKey(user.id), "done"); } catch { /* ignore */ }
    setPhase("idle");
    navigate("/");
  };
  const isLast = step === STEPS.length - 1;
  const next = () => {
    void haptic("light");
    if (isLast) return finish();
    const n = step + 1;
    try { localStorage.setItem(tourKey(user.id), `step:${n}`); } catch { /* ignore */ }
    setRect(null);
    setStep(n);
    const p = pathFor(STEPS[n]);
    if (p !== location.pathname) navigate(p);
  };

  const pad = 5, vw = viewport.width, vh = viewport.height;
  const cardW = Math.min(340, vw - 32), cardH = 240;
  let cardStyle: React.CSSProperties = { left: (vw - cardW) / 2, top: Math.max(16, (vh - cardH) / 2), width: cardW };
  let arrow: "top" | "bottom" | "left" | null = null;
  let arrowOffset = cardW / 2;
  if (rect && rect.height < vh * 0.6) {
    if (rect.right + cardW + 24 < vw && rect.left < 130) {
      cardStyle = { left: rect.right + 18, top: Math.max(16, Math.min(rect.top - 18, vh - cardH - 16)), width: cardW };
      arrow = "left";
    } else {
      const center = rect.left + rect.width / 2;
      const left = Math.min(Math.max(16, center - cardW / 2), vw - cardW - 16);
      arrowOffset = Math.max(22, Math.min(cardW - 22, center - left));
      if (vh - rect.bottom > cardH + 28) { cardStyle = { left, top: rect.bottom + 18, width: cardW }; arrow = "top"; }
      else if (rect.top > cardH + 28) { cardStyle = { left, top: rect.top - cardH - 18, width: cardW }; arrow = "bottom"; }
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Recorrido de Zentro">
      {phase === "welcome" ? (
        <>
          <div className="absolute inset-0 bg-background/75" />
          <m.div initial={reducedMotion ? false : { y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.3 }} className="light-sheet absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-card px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-7 text-card-foreground shadow-2xl">
            <div className="mx-auto max-w-md">
              <h2 className="font-brand text-xl font-semibold">Bienvenido a Zentro</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Te mostramos en menos de un minuto todo lo que podés hacer.</p>
              <Button variant="sheet-action" className="mt-6 h-12 w-full rounded-full" onClick={() => {
                try { localStorage.setItem(tourKey(user.id), "step:0"); } catch { /* ignore */ }
                setPhase("tour"); void haptic("light");
              }}>Comenzar</Button>
              <button className="mt-3 w-full py-2 text-sm text-muted-foreground active:opacity-70" onClick={finish}>Omitir</button>
            </div>
          </m.div>
        </>
      ) : (
        <>
          {rect && rect.height < vh * 0.6 ? (
            <m.div className="pointer-events-none absolute rounded-lg ring-2 ring-brand-red" animate={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} style={{ boxShadow: "0 0 0 9999px hsl(var(--background) / 0.78)" }} />
          ) : <div className="absolute inset-0 bg-background/60" />}
          <AnimatePresence mode="wait">
            <m.div key={step} initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: reducedMotion ? 0 : 0.22 }} className="light-sheet absolute rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl" style={cardStyle}>
              {arrow && <span aria-hidden className={`absolute h-3 w-3 rotate-45 border-border bg-card ${arrow === "top" ? "-top-[7px] border-l border-t" : arrow === "bottom" ? "-bottom-[7px] border-b border-r" : "-left-[7px] border-b border-l"}`} style={arrow === "left" ? { top: 30 } : { left: arrowOffset - 6 }} />}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-brand-red">{current.progress}</p>
                {!isLast && <button className="text-xs text-muted-foreground active:opacity-70" onClick={finish}>Omitir</button>}
              </div>
              <h2 className="mt-2 font-brand text-lg font-semibold">{current.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.body}</p>
              <Button variant="sheet-action" className="mt-5 h-11 w-full rounded-full" onClick={next}>{isLast ? "¡Empezar!" : "Continuar"}</Button>
            </m.div>
          </AnimatePresence>
        </>
      )}
    </div>,
    document.body,
  );
};
