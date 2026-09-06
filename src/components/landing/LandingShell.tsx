import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanding } from "@/components/landing/LandingContext";
import { setBusinessIntent } from "@/lib/businessIntent";
import { useAuth } from "@/contexts/AuthContext";

export interface LandingSection {
  id: string;
  /** Light blocks (plans, comparisons, FAQ) read better when projected. */
  tone?: "dark" | "light";
  content: ReactNode;
}

/** Scroll-triggered entrance used across the landing. */
export const Reveal = ({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      )}
    >
      {children}
    </div>
  );
};

/** Shared CTA pair: create a Business account, or book a demo. */
export const LandingCTAs = ({
  primaryLabel,
  secondaryLabel,
  className,
}: {
  primaryLabel: string;
  secondaryLabel: string;
  className?: string;
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const start = () => {
    if (!user) {
      setBusinessIntent();
      navigate("/auth", { state: { mode: "signup", businessIntent: true } });
      return;
    }
    navigate(profile?.is_business ? "/settings/business" : "/business");
  };

  const scrollToLead = () => {
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <Button className="h-12 rounded-full px-7 text-base font-semibold" onClick={start}>
        {primaryLabel}
      </Button>
      <Button
        variant="outline"
        className="h-12 rounded-full px-7 text-base font-semibold"
        onClick={scrollToLead}
      >
        {secondaryLabel}
      </Button>
    </div>
  );
};

const NAV = [
  { to: "/landing", key: "home" as const },
  { to: "/landing/eventos", key: "events" as const },
  { to: "/landing/restaurantes", key: "restaurants" as const },
  { to: "/landing/experiencias", key: "experiences" as const },
];

export const LandingShell = ({ sections }: { sections: LandingSection[] }) => {
  const { t, lang, setLang } = useLanding();
  const { pathname } = useLocation();
  const [presenting, setPresenting] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    setPresenting(false);
    setSlide(0);
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown")
        setSlide((s) => Math.min(s + 1, sections.length - 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setSlide((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [presenting, sections.length]);

  const touchX = useRef<number | null>(null);

  if (presenting) {
    const section = sections[Math.min(slide, sections.length - 1)];
    return (
      <div
        className={cn(
          "fixed inset-0 z-[100] flex flex-col overflow-hidden",
          section.tone === "light" ? "light-surface" : "bg-background text-foreground",
        )}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (dx < -60) setSlide((s) => Math.min(s + 1, sections.length - 1));
          if (dx > 60) setSlide((s) => Math.max(s - 1, 0));
          touchX.current = null;
        }}
      >
        <div className="flex-1 overflow-y-auto px-6 py-10 sm:px-12 sm:py-16">
          <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center">
            {section.content}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {t.nav.slide} {slide + 1} / {sections.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Anterior"
              disabled={slide === 0}
              onClick={() => setSlide((s) => Math.max(s - 1, 0))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Siguiente"
              disabled={slide === sections.length - 1}
              onClick={() => setSlide((s) => Math.min(s + 1, sections.length - 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              className="ml-2 h-9 rounded-full px-4 text-sm"
              onClick={() => setPresenting(false)}
            >
              <X className="mr-1 h-4 w-4" />
              {t.nav.exitPresent}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
          <Link to="/landing" className="font-brand text-xl font-semibold tracking-tight">
            zentro
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname === item.to
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {t.nav[item.key]}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center rounded-full border border-border p-0.5">
              {(["es", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold uppercase",
                    lang === l ? "bg-foreground text-background" : "text-muted-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              className="hidden h-9 rounded-full px-3 text-sm lg:inline-flex"
              onClick={() => {
                setSlide(0);
                setPresenting(true);
              }}
            >
              <Play className="mr-1.5 h-4 w-4" />
              {t.nav.present}
            </Button>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto px-5 pb-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
                pathname === item.to ? "bg-secondary text-foreground" : "text-muted-foreground",
              )}
            >
              {t.nav[item.key]}
            </Link>
          ))}
        </nav>
      </header>

      <main>
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className={cn(
              "px-5 py-16 sm:py-24",
              section.tone === "light" ? "light-surface" : "bg-background",
            )}
          >
            <div className="mx-auto max-w-6xl">{section.content}</div>
          </section>
        ))}
      </main>
    </div>
  );
};
