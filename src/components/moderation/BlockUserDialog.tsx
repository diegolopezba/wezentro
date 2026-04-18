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
import { useBlockUser } from "@/hooks/useBlockedUsers";

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  onBlocked?: () => void;
}

export const BlockUserDialog = ({ open, onOpenChange, userId, username, onBlocked }: BlockUserDialogProps) => {
  const blockUser = useBlockUser();

  const handleConfirm = async () => {
    await blockUser.mutateAsync(userId);
    onOpenChange(false);
    onBlocked?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Bloquear a @{username}?</AlertDialogTitle>
          <AlertDialogDescription>
            No verás su contenido y no podrá enviarte mensajes. Tampoco verá tus publicaciones.
            Puedes desbloquearlo en cualquier momento desde Configuración.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={blockUser.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Bloquear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
