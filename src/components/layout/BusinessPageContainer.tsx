import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  /** Narrow reading width for settings-style pages. */
  size?: "wide" | "narrow";
  className?: string;
}

/**
 * Centers business-side content on desktop so it does not stretch edge to edge
 * next to the nav rail. Mobile keeps the original full-bleed padding.
 */
export const BusinessPageContainer = ({ children, size = "wide", className }: Props) => (
  <div
    className={cn(
      "lg:mx-auto lg:px-8",
      size === "wide" ? "lg:max-w-[1400px]" : "lg:max-w-3xl",
      className,
    )}
  >
    {children}
  </div>
);
