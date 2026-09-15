import { ReactNode, forwardRef, createContext, useContext, useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { DesktopNavRail } from "./DesktopNavRail";
import { OfflineBanner } from "@/components/OfflineBanner";
import { cn } from "@/lib/utils";

export interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

/**
 * Nesting support: pages render their own <AppLayout>, but routes are also
 * wrapped in a route-level AppLayout (MainAppLayout in App.tsx) so the
 * DesktopNavRail persists across every normal app page (Settings included).
 *
 * When an AppLayout detects it is nested inside another AppLayout, it renders
 * its children only — the outermost instance owns the single BottomNav /
 * DesktopNavRail pair. A nested layout can still request `hideNav` (e.g.
 * Settings pages hide the mobile BottomNav); the request is forwarded to the
 * outer layout so mobile behavior stays exactly as before.
 */
const AppLayoutNestedContext = createContext(false);
const AppLayoutHideNavSetterContext = createContext<(hide: boolean) => void>(() => {});

export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(
  ({ children, hideNav = false }, ref) => {
    const isNested = useContext(AppLayoutNestedContext);
    const setInnerHideNav = useContext(AppLayoutHideNavSetterContext);
    const [innerHideNav, setInnerHideNav] = useState(false);

    useEffect(() => {
      if (!isNested) return;
      setInnerHideNav(hideNav);
      return () => setInnerHideNav(false);
    }, [isNested, hideNav, setInnerHideNav]);

    if (isNested) {
      return <>{children}</>;
    }

    const effectiveHideNav = hideNav || innerHideNav;

    // The document is the single scroll owner — no nested scroll container
    // here, otherwise scroll listeners and virtualization bind to an element
    // that never scrolls.
    return (
      <AppLayoutNestedContext.Provider value={true}>
        <AppLayoutHideNavSetterContext.Provider value={setInnerHideNav}>
          <div ref={ref} className={cn("min-h-[100dvh] bg-background", !effectiveHideNav && "lg:pl-20")}>
            <OfflineBanner />

            {/* Main content */}
            <main className={effectiveHideNav ? "" : "pb-24 lg:pb-8"}>
              {children}
            </main>

            {/* Navigation: bottom bar on mobile, left rail on desktop */}
            {!effectiveHideNav && (
              <>
                <div className="lg:hidden">
                  <BottomNav />
                </div>
                <DesktopNavRail />
              </>
            )}

            {/* Desktop rail must persist even when mobile nav is hidden */}
            {effectiveHideNav && <DesktopNavRail />}
            {effectiveHideNav && <div className="hidden lg:block fixed inset-y-0 left-0 w-20 pointer-events-none" aria-hidden />}
          </div>
        </AppLayoutHideNavSetterContext.Provider>
      </AppLayoutNestedContext.Provider>
    );
  }
);

AppLayout.displayName = "AppLayout";
