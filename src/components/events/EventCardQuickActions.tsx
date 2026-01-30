import { motion, AnimatePresence } from "framer-motion";
import { Heart, Bookmark, Send, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { useIsEventLiked, useLikeEvent, useUnlikeEvent } from "@/hooks/useEventLikes";
import { useIsEventSaved, useSaveEvent, useUnsaveEvent } from "@/hooks/useSavedEvents";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EventCardQuickActionsProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onShare: () => void;
  position: { x: number; y: number };
}

export const EventCardQuickActions = ({
  eventId,
  isOpen,
  onClose,
  onShare,
  position,
}: EventCardQuickActionsProps) => {
  const { user } = useAuth();
  const { promptAuth } = useAuthPrompt();
  const isGuest = !user;

  // Like state
  const { data: isLiked } = useIsEventLiked(eventId);
  const likeEvent = useLikeEvent();
  const unlikeEvent = useUnlikeEvent();

  // Save state
  const { data: isSaved } = useIsEventSaved(eventId);
  const saveEvent = useSaveEvent();
  const unsaveEvent = useUnsaveEvent();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      promptAuth({ action: "dar like a eventos" });
      onClose();
      return;
    }

    if (isLiked) {
      unlikeEvent.mutate(eventId);
      toast.success("Like eliminado");
    } else {
      likeEvent.mutate(eventId);
      toast.success("¡Te gustó!");
    }
    onClose();
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      promptAuth({ action: "guardar eventos" });
      onClose();
      return;
    }

    if (isSaved) {
      unsaveEvent.mutate(eventId);
      toast.success("Eliminado de guardados");
    } else {
      saveEvent.mutate(eventId);
      toast.success("¡Guardado!");
    }
    onClose();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      promptAuth({ action: "compartir eventos" });
      onClose();
      return;
    }
    onShare();
    onClose();
  };

  const actions = [
    {
      icon: Heart,
      label: isLiked ? "Quitar like" : "Me gusta",
      onClick: handleLike,
      isActive: isLiked,
      activeClass: "text-red-500 fill-red-500",
    },
    {
      icon: Bookmark,
      label: isSaved ? "Quitar guardado" : "Guardar",
      onClick: handleSave,
      isActive: isSaved,
      activeClass: "text-primary fill-primary",
    },
    {
      icon: Send,
      label: "Enviar",
      onClick: handleShare,
      isActive: false,
      activeClass: "",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />

          {/* Quick actions menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.3 }}
            className="fixed z-50 flex items-center gap-2 p-2 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-xl"
            style={{
              left: Math.max(16, Math.min(position.x - 80, window.innerWidth - 180)),
              top: Math.max(16, Math.min(position.y - 30, window.innerHeight - 80)),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={action.onClick}
                className={cn(
                  "flex flex-col items-center justify-center w-14 h-14 rounded-full",
                  "bg-secondary/50 hover:bg-secondary active:scale-95 transition-all",
                  action.isActive && "bg-secondary"
                )}
              >
                <action.icon
                  className={cn(
                    "w-5 h-5 mb-0.5",
                    action.isActive ? action.activeClass : "text-foreground"
                  )}
                />
                <span className="text-[9px] text-muted-foreground font-medium">
                  {action.isActive && action.label.startsWith("Quitar") 
                    ? action.label.replace("Quitar ", "")
                    : action.label.split(" ")[0]}
                </span>
              </motion.button>
            ))}

            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 active:scale-95 transition-all ml-1"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
