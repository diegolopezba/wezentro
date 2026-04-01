import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useDeleteEvent } from "@/hooks/useEventMutations";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface DeleteEventDialogProps {
  eventId: string;
  eventTitle?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPost?: boolean;
}

export function DeleteEventDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
  isPost = false,
}: DeleteEventDialogProps) {
  const navigate = useNavigate();
  const deleteEvent = useDeleteEvent();

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync(eventId);
      toast.success(isPost ? "Post eliminado exitosamente" : "Evento eliminado exitosamente");
      onOpenChange(false);
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || (isPost ? "Error al eliminar post" : "Error al eliminar evento"));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar evento</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que quieres eliminar{" "}
            <span className="font-semibold">{eventTitle || "este evento"}</span>?
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteEvent.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteEvent.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Eliminar evento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
