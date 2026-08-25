import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Clock, X } from "lucide-react";
import { toast } from "sonner";
import {
  useAnnouncementPreview,
  useEventAnnouncements,
  useSendEventAnnouncement,
  useCancelEventAnnouncement,
} from "@/hooks/useEventAnnouncements";
import { haptic } from "@/lib/haptics";

const MAX_TITLE = 80;
const MAX_BODY = 300;

const PRESETS = [
  {
    key: "antes",
    label: "Antes",
    title: "Recordatorio",
    body: "¡Nos vemos pronto! Recuerda llegar con tiempo y tener tu entrada lista en la app.",
  },
  {
    key: "durante",
    label: "Durante",
    title: "Aviso en vivo",
    body: "¡Ya estamos adentro! Acércate a la entrada principal y muestra tu QR.",
  },
  {
    key: "despues",
    label: "Después",
    title: "¡Gracias por venir!",
    body: "Gracias por acompañarnos. Cuéntanos qué te pareció y no te pierdas lo que viene.",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

export function EventAnnouncementSheet({ open, onOpenChange, eventId }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  const { data: preview, isLoading: previewLoading } = useAnnouncementPreview(eventId, open);
  const { data: history } = useEventAnnouncements(eventId, open);
  const send = useSendEventAnnouncement(eventId);
  const cancel = useCancelEventAnnouncement(eventId);

  const limitReached = (preview?.remaining ?? 1) <= 0;
  const canSend = useMemo(() => {
    if (!title.trim() || !body.trim() || limitReached) return false;
    if (mode === "schedule" && !scheduledAt) return false;
    return true;
  }, [title, body, mode, scheduledAt, limitReached]);

  const reset = () => {
    setTitle("");
    setBody("");
    setMode("now");
    setScheduledAt("");
  };

  const handleSend = async () => {
    try {
      haptic("medium");
      const res = await send.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        scheduledFor: mode === "schedule" ? new Date(scheduledAt).toISOString() : null,
      });
      if (res?.scheduled) {
        toast.success("Mensaje programado");
      } else {
        toast.success(
          res?.recipient_count
            ? `Mensaje enviado a ${res.recipient_count} asistentes`
            : "No hay asistentes confirmados todavía",
        );
      }
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar el mensaje");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="light-sheet rounded-t-3xl flex flex-col p-0 max-h-[90dvh]"
      >
        <div data-vaul-no-drag className="flex flex-col min-h-0 overflow-y-auto px-6 pt-4 pb-6">
          <SheetHeader className="px-0 pb-2">
            <SheetTitle className="text-left">Mensaje a asistentes</SheetTitle>
          </SheetHeader>

          <p className="text-sm text-muted-foreground mb-4">
            {previewLoading
              ? "Calculando audiencia…"
              : `Se enviará a ${preview?.recipient_count ?? 0} asistentes confirmados.`}
          </p>

          {/* Presets */}
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setTitle(p.title);
                  setBody(p.body);
                }}
                className="shrink-0 px-4 py-2 rounded-full text-sm border border-border active:bg-muted"
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="text-xs text-muted-foreground mb-1">Título</label>
          <Input
            value={title}
            maxLength={MAX_TITLE}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Recordatorio"
            className="rounded-2xl mb-1"
          />
          <div className="text-[11px] text-muted-foreground text-right mb-3">
            {title.length}/{MAX_TITLE}
          </div>

          <label className="text-xs text-muted-foreground mb-1">Mensaje</label>
          <Textarea
            value={body}
            maxLength={MAX_BODY}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe tu mensaje…"
            rows={4}
            className="rounded-2xl mb-1 resize-none"
          />
          <div className="text-[11px] text-muted-foreground text-right mb-4">
            {body.length}/{MAX_BODY}
          </div>

          {/* Timing */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMode("now")}
              className={`flex-1 py-2 rounded-full text-sm border ${
                mode === "now" ? "bg-foreground text-background border-foreground" : "border-border"
              }`}
            >
              Enviar ahora
            </button>
            <button
              type="button"
              onClick={() => setMode("schedule")}
              className={`flex-1 py-2 rounded-full text-sm border ${
                mode === "schedule"
                  ? "bg-foreground text-background border-foreground"
                  : "border-border"
              }`}
            >
              Programar
            </button>
          </div>

          {mode === "schedule" && (
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="rounded-2xl mb-4"
            />
          )}

          {limitReached && (
            <p className="text-sm text-destructive mb-3">Ya enviaste 3 mensajes hoy</p>
          )}

          <Button
            variant="sheet-action"
            className="w-full rounded-full h-12"
            disabled={!canSend || send.isPending}
            onClick={handleSend}
          >
            {send.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : mode === "schedule" ? (
              <Clock className="w-4 h-4 mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {mode === "schedule" ? "Programar mensaje" : "Enviar mensaje"}
          </Button>

          {/* History */}
          {!!history?.length && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Mensajes</h3>
              <div className="flex flex-col divide-y divide-border">
                {history.map((a) => (
                  <div key={a.id} className="py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {a.status === "scheduled"
                          ? `Programado · ${new Date(a.scheduled_for!).toLocaleString("es-BO", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : a.status === "cancelled"
                            ? "Cancelado"
                            : a.status === "failed"
                              ? "Falló el envío"
                              : `Enviado a ${a.recipient_count} personas`}
                      </p>
                    </div>
                    {a.status === "scheduled" && (
                      <button
                        type="button"
                        aria-label="Cancelar mensaje programado"
                        onClick={() => cancel.mutate(a.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center active:bg-muted"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
