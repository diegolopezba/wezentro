import { useState } from "react";
import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AtSign, Check, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvent } from "@/hooks/useEvents";
import { usePendingTags, useRespondToTag } from "@/hooks/useEventTags";
import { Notification } from "@/hooks/useNotifications";
import { toast } from "sonner";

interface PostTagNotificationItemProps {
  notification: Notification;
  index: number;
  onRead: () => void;
  onClick: () => void;
}

export const PostTagNotificationItem = ({
  notification,
  index,
  onRead,
  onClick,
}: PostTagNotificationItemProps) => {
  const navigate = useNavigate();
  const { data: event } = useEvent(notification.entity_id || undefined);
  const { data: pendingTags } = usePendingTags();
  const respondToTag = useRespondToTag();
  const [isResponding, setIsResponding] = useState(false);

  const extractedUsername = notification.body?.match(/@(\w+)/)?.[1];
  const tag = pendingTags?.find((t) => t.event_id === notification.entity_id);

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tag) return;
    setIsResponding(true);
    try {
      await respondToTag.mutateAsync({ tagId: tag.id, status: "accepted" });
      toast.success("¡Etiqueta aceptada! La publicación aparecerá en tu perfil.");
      if (!notification.is_read) onRead();
    } catch (error: any) {
      toast.error(error.message || "Error al aceptar");
    } finally {
      setIsResponding(false);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tag) return;
    setIsResponding(true);
    try {
      await respondToTag.mutateAsync({ tagId: tag.id, status: "declined" });
      toast.success("Etiqueta rechazada");
      if (!notification.is_read) onRead();
    } catch (error: any) {
      toast.error(error.message || "Error al rechazar");
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.02 }}
      className={`flex flex-col gap-3 p-4 rounded-2xl cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-secondary">
          {event?.image_url ? (
            <img src={event.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <AtSign className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm ${
              notification.is_read ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            <span className="font-semibold">@{extractedUsername || "alguien"}</span>
            {" te etiquetó en "}
            <span className="font-semibold">{event?.title || "una publicación"}</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>

        {!notification.is_read && !tag && (
          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
        )}
      </div>

      {tag && (
        <div className="flex gap-2 ml-13">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl border-destructive/30 text-destructive"
            onClick={handleDecline}
            disabled={isResponding}
          >
            {isResponding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-1.5" />
            )}
            Rechazar
          </Button>
          <Button
            size="sm"
            className="flex-1 rounded-xl"
            onClick={handleAccept}
            disabled={isResponding}
          >
            {isResponding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-1.5" />
            )}
            Aceptar
          </Button>
        </div>
      )}
    </m.div>
  );
};
