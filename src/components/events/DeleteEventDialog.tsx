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
}

export function DeleteEventDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
}: DeleteEventDialogProps) {
  const navigate = useNavigate();
  const deleteEvent = useDeleteEvent();

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync(eventId);
      toast.success("Event deleted successfully");
      onOpenChange(false);
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete event");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Event</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold">{eventTitle || "this event"}</span>?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteEvent.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteEvent.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Delete Event
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
