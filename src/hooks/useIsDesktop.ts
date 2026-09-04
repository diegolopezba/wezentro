import { useEffect, useState } from "react";

/**
 * Desktop breakpoint used by the web-only desktop shell.
 *
 * Mobile (and the Capacitor native builds, which always run at phone widths)
 * never match this, so the mobile experience is untouched.
 */
export const DESKTOP_BREAKPOINT = 1024;

const query = `(min-width: ${DESKTOP_BREAKPOINT}px)`;

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
