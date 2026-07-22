/**
 * Drop-in bottom-sheet replacement for shadcn `sheet` (bottom side only).
 *
 * Same named exports as `@/components/ui/sheet` so consumers can swap the
 * import path and get vaul-powered behavior: rubber-band drag, velocity-aware
 * dismiss, background scale, stacked sheets, and iOS-like resistance.
 *
 * The `side` prop on `SheetContent` is accepted for API compatibility and
 * ignored — this component is always a bottom sheet.
 */
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

type SheetRootProps = React.ComponentProps<typeof DrawerPrimitive.Root>;

const Sheet = ({ shouldScaleBackground = false, ...props }: SheetRootProps) => {
  // Safety net: vaul can leave `pointer-events: none` on <body> if a sheet
  // is unmounted mid-transition (Fast Refresh, route change, etc.). That
  // silently kills every subsequent tap and looks exactly like "sheets don't
  // open anymore". Restore it whenever a sheet closes.
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      props.onOpenChange?.(open);
      if (!open) {
        // Next tick, after vaul's own cleanup runs.
        setTimeout(() => {
          if (document.body.style.pointerEvents === "none") {
            document.body.style.pointerEvents = "";
          }
        }, 0);
      }
    },
    [props],
  );
  React.useEffect(() => {
    return () => {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };
  }, []);
  return (
    <DrawerPrimitive.Root
      shouldScaleBackground={shouldScaleBackground}
      {...props}
      onOpenChange={handleOpenChange}
    />
  );
};
Sheet.displayName = "Sheet";

const SheetTrigger = DrawerPrimitive.Trigger;
const SheetPortal = DrawerPrimitive.Portal;
const SheetClose = DrawerPrimitive.Close;

const SHEET_STACK_CLASS = "z-[80]";

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 bg-black/80", SHEET_STACK_CLASS, className)}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  /** Kept for API parity with shadcn sheet. Ignored — always bottom. */
  side?: "top" | "right" | "bottom" | "left";
  /** Hide the drag handle. */
  hideHandle?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  SheetContentProps
>(({ className, children, hideHandle, side: _side, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 flex flex-col border-t border-border/50 bg-background outline-none",
        // Event detail modals and their floating CTA bars sit at z-[60].
        // The sheet portal must stack above them or it appears to freeze taps
        // while rendering invisibly behind the modal route.
        SHEET_STACK_CLASS,
        // Consumers usually pass their own rounded-t-* + height; defaults are
        // conservative so bare usage still looks right.
        "rounded-t-3xl",
        className,
      )}
      {...props}
    >
      {!hideHandle && (
        <div className="mx-auto mt-2 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
      )}
      {children}
    </DrawerPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
