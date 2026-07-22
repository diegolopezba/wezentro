import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

interface PressableProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Emit a light haptic tick on pointerdown (native only). Default: false. */
  haptic?: boolean;
  /** Render as a plain span (no button semantics) — for wrapping cards. Default: false. */
  asDiv?: boolean;
  className?: string;
}

/**
 * Native-feel tap primitive — Pinterest Gestalt `TapArea` equivalent.
 *
 * - `touch-action: manipulation` removes the 300ms tap delay on iOS Safari
 * - transparent `-webkit-tap-highlight-color` kills the gray flash on Android
 * - crisp 100ms `scale(0.97)` on `:active` for tactile feedback matching
 *   native cell highlighting on both platforms
 * - optional light haptic on pointerdown for extra polish on native builds
 *
 * Adopt this instead of ad-hoc `active:scale-95` sprinkled across cards.
 */
export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(
  ({ children, className, haptic = false, asDiv = false, onPointerDown, ...rest }, ref) => {
    const cls = cn(
      "inline-block select-none [touch-action:manipulation]",
      "[-webkit-tap-highlight-color:transparent]",
      "transition-transform duration-100 ease-out",
      "active:scale-[0.97]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      className,
    );

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (haptic) {
        void haptics.light?.();
      }
      onPointerDown?.(e);
    };

    if (asDiv) {
      return (
        <span
          className={cls}
          onPointerDown={handlePointerDown as unknown as React.PointerEventHandler<HTMLSpanElement>}
          {...(rest as unknown as React.HTMLAttributes<HTMLSpanElement>)}
        >
          {children}
        </span>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cls}
        onPointerDown={handlePointerDown}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
Pressable.displayName = "Pressable";
