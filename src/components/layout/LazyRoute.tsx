import { Suspense, type ReactNode } from "react";
import { PageLoader } from "@/components/PageLoader";
import { PageTransition } from "@/components/layout/PageTransition";

/**
 * Wraps a lazy route element with Suspense + entrance transition so every
 * secondary page inherits the iOS-push-curve fade/slide without repeating
 * boilerplate in App.tsx.
 */
export const LazyRoute = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<PageLoader />}>
    <PageTransition>{children}</PageTransition>
  </Suspense>
);
