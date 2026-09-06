import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { LANDING_COPY, type LandingCopy, type LandingLang } from "@/lib/landingContent";

const STORAGE_KEY = "zentro_landing_lang";

interface LandingCtx {
  lang: LandingLang;
  setLang: (l: LandingLang) => void;
  t: LandingCopy;
}

const Ctx = createContext<LandingCtx | null>(null);

const readLang = (): LandingLang => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") return stored;
    return navigator.language?.toLowerCase().startsWith("en") ? "en" : "es";
  } catch {
    return "es";
  }
};

export const LandingProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<LandingLang>(readLang);

  const setLang = useCallback((l: LandingLang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: LANDING_COPY[lang] }), [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useLanding = (): LandingCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLanding must be used inside LandingProvider");
  return ctx;
};
