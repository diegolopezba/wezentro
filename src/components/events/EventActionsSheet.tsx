import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  EyeOff,
  Flag,
  Link as LinkIcon,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useDeleteEvent } from "@/hooks/useEventMutations";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { useAuth } from "@/contexts/AuthContext";
import { EditEventSheet } from "@/components/events/EditEventSheet";
import { ReportSheet } from "@/components/moderation/ReportSheet";

type Step = "root" | "edit" | "delete";

interface EventActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  isOwner: boolean;
  onClosed?: () => void;
}

/**
 * Single vaul bottom sheet that swaps between root actions, inline edit form,
 * and inline delete confirmation. Report is delegated to ReportSheet
 * (a separate portal sheet) to keep this file focused.
 */
export function EventActionsSheet({
  open,
  onOpenChange,
  event,
  isOwner,
  onClosed,
}: EventActionsSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("root");
  const [showReport, setShowReport] = useState(false);
  const deleteEvent = useDeleteEvent();
  const isPost = !!event?.is_post;

  // Always reset to the root step whenever the sheet closes so re-opens start clean.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setStep("root"), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const close = () => onOpenChange(false);

  const handleCopyLink = async () => {
    try {
      const url = getEventShareUrl(event.id);
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
      close();
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const handleNotInterested = () => {
    if (!user) return;
    trackPreferenceSignal(user.id, event.id, "not_interested");
    toast("Se mostrará menos contenido como este", { duration: 2000 });
    close();
    onClosed?.();
  };

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync(event.id);
      toast.success(isPost ? "Post eliminado exitosamente" : "Evento eliminado exitosamente");
      close();
      // Navigate back after the sheet begins closing.
      setTimeout(() => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
      }, 150);
    } catch (error: any) {
      toast.error(error.message || (isPost ? "Error al eliminar post" : "Error al eliminar evento"));
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={
            step === "edit"
              ? "h-[90dvh] max-h-[90dvh] rounded-t-3xl flex flex-col p-0"
              : "rounded-t-3xl flex flex-col p-0"
          }
        >
          {step === "root" && (
            <div className="flex flex-col px-2 pb-6 pt-4">
              <SheetHeader className="px-4 pb-2">
                <SheetTitle className="text-left">Acciones</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col">
                {isOwner && (
                  <>
                    <ActionRow
                      icon={<Pencil className="w-5 h-5" />}
                      label={isPost ? "Editar post" : "Editar evento"}
                      onClick={() => setStep("edit")}
                    />
                    <ActionRow
                      icon={<Trash2 className="w-5 h-5" />}
                      label={isPost ? "Eliminar post" : "Eliminar evento"}
                      destructive
                      onClick={() => setStep("delete")}
                    />
                  </>
                )}

                {!isOwner && user && (
                  <>
                    <ActionRow
                      icon={<Flag className="w-5 h-5" />}
                      label="Reportar"
                      onClick={() => {
                        close();
                        // Open the report sheet after the actions sheet begins
                        // closing so vaul can settle before the next portal mounts.
                        setTimeout(() => setShowReport(true), 150);
                      }}
                    />
                    <ActionRow
                      icon={<EyeOff className="w-5 h-5" />}
                      label="No me interesa"
                      onClick={handleNotInterested}
                    />
                  </>
                )}

                <ActionRow
                  icon={<LinkIcon className="w-5 h-5" />}
                  label="Copiar enlace"
                  onClick={handleCopyLink}
                />
              </div>
            </div>
          )}

          {step === "edit" && isOwner && (
            <div className="flex flex-col h-full px-6 pt-4 pb-4 overflow-hidden">
              <div className="flex items-center gap-2 shrink-0 mb-2">
                <button
                  aria-label="Volver"
                  onClick={() => setStep("root")}
                  className="w-9 h-9 rounded-full flex items-center justify-center -ml-2 active:bg-muted"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              {/* Reuses the existing form via `embedded` — no nested drawer. */}
              <EditEventSheet
                event={event}
                open={open && step === "edit"}
                onOpenChange={(o) => {
                  if (!o) close();
                }}
                isPost={isPost}
                embedded
              />
            </div>
          )}

          {step === "delete" && isOwner && (
            <div className="flex flex-col px-6 pb-6 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  aria-label="Volver"
                  onClick={() => setStep("root")}
                  className="w-9 h-9 rounded-full flex items-center justify-center -ml-2 active:bg-muted"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <SheetTitle className="text-base">
                  {isPost ? "Eliminar post" : "Eliminar evento"}
                </SheetTitle>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                ¿Estás seguro de que quieres eliminar{" "}
                <span className="font-semibold text-foreground">
                  {event?.title || (isPost ? "este post" : "este evento")}
                </span>
                ? Esta acción no se puede deshacer.
              </p>

              <div className="flex flex-col gap-2 safe-bottom">
                <Button
                  variant="destructive"
                  className="w-full rounded-full"
                  onClick={handleDelete}
                  disabled={deleteEvent.isPending}
                >
                  {deleteEvent.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {isPost ? "Eliminar post" : "Eliminar evento"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full rounded-full"
                  onClick={() => setStep("root")}
                  disabled={deleteEvent.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {event?.id && (
        <ReportSheet
          open={showReport}
          onOpenChange={setShowReport}
          targetType={isPost ? "post" : "event"}
          targetId={event.id}
        />
      )}
    </>
  );
}

function ActionRow({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-4 rounded-2xl active:bg-muted text-left ${
        destructive ? "text-destructive" : "text-foreground"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-base font-medium">{label}</span>
    </button>
  );
}
