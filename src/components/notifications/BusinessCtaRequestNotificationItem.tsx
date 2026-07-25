import { useState } from "react";
import { m } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Sparkles, Check, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvent } from "@/hooks/useEvents";
import {
  usePendingCtaRequestForOwner,
  useRespondToBusinessCta,
} from "@/hooks/useBusinessCtaRequest";
import { Notification } from "@/hooks/useNotifications";
import { toast } from "sonner";

interface Props {
  notification: Notification;
  index: number;
  onRead: () => void;
  onClick: () => void;
}

export const BusinessCtaRequestNotificationItem = ({
  notification,
  index,
  onRead,
  onClick,
}: Props) => {
  const { data: event } = useEvent(notification.entity_id || undefined);
  const { data: pending } = usePendingCtaRequestForOwner(
    notification.entity_id || undefined
  );
  const respond = useRespondToBusinessCta();
  const [busy, setBusy] = useState(false);

  const handle = async (status: "accepted" | "declined") => {
    if (!pending) return;
    setBusy(true);
    try {
      await respond.mutateAsync({
        requestId: pending.id,
        eventId: pending.event_id,
        status,
      });
      toast.success(status === "accepted" ? "Botones activados" : "Solicitud rechazada");
      if (!notification.is_read) onRead();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
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
              <Sparkles className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm ${
              notification.is_read ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {notification.body || "Solicitud de botones de menú y reserva"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>

        {!notification.is_read && !pending && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onRead();
              }}
            >
              <Check className="w-4 h-4" />
            </Button>
            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          </>
        )}
      </div>

      {pending && (
        <div className="flex gap-2 ml-13">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl border-destructive/30 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              handle("declined");
            }}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-1.5" />
            )}
            Rechazar
          </Button>
          <Button
            size="sm"
            className="flex-1 rounded-xl"
            onClick={(e) => {
              e.stopPropagation();
              handle("accepted");
            }}
            disabled={busy}
          >
            {busy ? (
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
