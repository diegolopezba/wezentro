import { Sheet, SheetContent } from "@/components/ui/bottom-sheet";
import { CheckoutSteps, type CheckoutStepsProps } from "./CheckoutSteps";

type PaymentQRModalProps = Omit<CheckoutStepsProps, "active" | "onClose" | "onBack"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Standalone checkout sheet (special invites and events without venue areas).
 * Events with areas use the same steps inside `PurchaseFlow`'s single sheet.
 */
export function PaymentQRModal({ open, onOpenChange, ...rest }: PaymentQRModalProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="light-sheet rounded-t-3xl border-border bg-background p-0 h-[85dvh] flex flex-col overflow-hidden"
      >
        <CheckoutSteps active={open} onClose={() => onOpenChange(false)} {...rest} />
      </SheetContent>
    </Sheet>
  );
}
