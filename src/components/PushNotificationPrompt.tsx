import { Bell } from "lucide-react";
import { usePushNotificationPrompt } from "@/hooks/usePushNotificationPrompt";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
}

/**
 * Pre-prompt explainer for push notifications.
 * Required by Apple Guideline 5.1.1(ii): explain WHY we want
 * permission before triggering the native iOS prompt.
 */
export const PushNotificationPrompt = ({ children }: Props) => {
  const { showExplainer, isAccepting, accept, dismiss } = usePushNotificationPrompt();

  return (
    <>
      {children}
      <Sheet open={showExplainer} onOpenChange={(o) => !o && dismiss()}>
        <SheetContent side="bottom" className="light-sheet rounded-t-3xl border-t pb-8">
          <div className="mx-auto max-w-sm pt-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-red">
              <Bell className="h-7 w-7 text-accent-red-foreground" />
            </div>
            <SheetHeader className="text-center">
              <SheetTitle className="font-brand text-xl">Activa las notificaciones</SheetTitle>
              <SheetDescription className="text-sm">
                Te avisamos cuando recibas mensajes, alguien comente tus posts o tus eventos favoritos estén por empezar. Puedes desactivarlas cuando quieras desde Ajustes.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-2">
              <Button variant="sheet-action" className="w-full" onClick={accept} disabled={isAccepting}>
                {isAccepting ? "Activando…" : "Activar notificaciones"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={dismiss} disabled={isAccepting}>
                Ahora no
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
