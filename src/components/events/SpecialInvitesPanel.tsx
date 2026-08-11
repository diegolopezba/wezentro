import { useState } from "react";
import { Loader2, Plus, Copy, Share2, Check, Ban, Gift, Upload, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useEventSpecialInvites,
  useCreateSpecialInvite,
  useRevokeSpecialInvite,
  useSendSpecialInviteEmails,
  getSpecialInviteUrl,
} from "@/hooks/useSpecialInvites";
import { BulkInviteImportSheet } from "@/components/events/BulkInviteImportSheet";

interface SpecialInvitesPanelProps {
  eventId: string;
}

/** Owner tool: create single-use "invitado especial" links that grant a free ticket. */
export function SpecialInvitesPanel({ eventId }: SpecialInvitesPanelProps) {
  const [label, setLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: invites = [], isLoading } = useEventSpecialInvites(eventId);
  const createInvite = useCreateSpecialInvite();
  const revokeInvite = useRevokeSpecialInvite();
  const sendEmails = useSendSpecialInviteEmails();

  const handleResend = async (inviteId: string) => {
    try {
      const res = await sendEmails.mutateAsync({ eventId, inviteIds: [inviteId] });
      toast[res.sent ? "success" : "error"](
        res.sent ? "Invitación enviada" : "No se pudo enviar el correo"
      );
    } catch {
      toast.error("No se pudo enviar el correo");
    }
  };


  const handleCreate = async () => {
    try {
      const invite = await createInvite.mutateAsync({ eventId, label });
      setLabel("");
      const url = getSpecialInviteUrl(invite.token);
      await navigator.clipboard.writeText(url).catch(() => undefined);
      toast.success("Invitación creada y enlace copiado");
    } catch {
      toast.error("No se pudo crear la invitación");
    }
  };

  const handleCopy = async (token: string, id: string) => {
    await navigator.clipboard.writeText(getSpecialInviteUrl(token));
    setCopiedId(id);
    toast.success("Enlace copiado");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (token: string, id: string) => {
    const url = getSpecialInviteUrl(token);
    if (navigator.share) {
      await navigator.share({ title: "Invitación especial", url }).catch(() => undefined);
    } else {
      handleCopy(token, id);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      await revokeInvite.mutateAsync({ inviteId, eventId });
      toast.success("Invitación cancelada");
    } catch {
      toast.error("No se pudo cancelar");
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Invitados especiales</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Creá un enlace de un solo uso. Quien lo abra entra gratis a tu evento como invitado especial.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Nombre o nota (opcional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={40}
          />
          <Button variant="hero" onClick={handleCreate} disabled={createInvite.isPending}>
            {createInvite.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>
        <Button variant="secondary" className="w-full" onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4 mr-2" /> Importar lista (CSV o Excel)
        </Button>
      </div>


      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : invites.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Todavía no creaste invitaciones especiales
        </p>
      ) : (
        <div className="space-y-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {invite.guest_name || invite.label || "Invitación especial"}
                  </p>
                  {invite.segment && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {invite.segment}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {invite.guest_email || getSpecialInviteUrl(invite.token)}
                </p>
                {invite.guest_email && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {invite.email_status === "sent"
                      ? "Correo enviado"
                      : invite.email_status === "failed"
                        ? "Envío fallido"
                        : "Sin enviar"}
                  </p>
                )}
              </div>
              {invite.status === "pending" ? (
                <div className="flex items-center gap-1 shrink-0">
                  {invite.guest_email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResend(invite.id)}
                      disabled={sendEmails.isPending}
                      aria-label="Enviar por email"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(invite.token, invite.id)}
                    aria-label="Copiar enlace"
                  >
                    {copiedId === invite.id ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleShare(invite.token, invite.id)}
                    aria-label="Compartir enlace"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(invite.id)}
                    disabled={revokeInvite.isPending}
                    aria-label="Cancelar invitación"
                  >
                    <Ban className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <Badge variant="secondary" className="shrink-0">
                  {invite.status === "redeemed" ? "Usada" : "Cancelada"}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      <BulkInviteImportSheet eventId={eventId} open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
