import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Copy, Share2, Check, Ban, Gift, Upload, Mail, Download, Zap, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  useEventSpecialInvites,
  useCreateSpecialInvite,
  useRevokeSpecialInvite,
  useSendSpecialInviteEmails,
  useSetInviteDeliveryMode,
  getSpecialInviteUrl,
} from "@/hooks/useSpecialInvites";
import { BulkInviteImportSheet } from "@/components/events/BulkInviteImportSheet";
import { buildInvitesXlsx, downloadXlsx } from "@/lib/inviteImport";
import { cn } from "@/lib/utils";

interface SpecialInvitesPanelProps {
  eventId: string;
}

/** Owner tool: create single-use "invitado especial" links that grant a free ticket. */
export function SpecialInvitesPanel({ eventId }: SpecialInvitesPanelProps) {
  const [label, setLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string>("__all__");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: invites = [], isLoading } = useEventSpecialInvites(eventId);
  const createInvite = useCreateSpecialInvite();
  const revokeInvite = useRevokeSpecialInvite();
  const sendEmails = useSendSpecialInviteEmails();
  const setMode = useSetInviteDeliveryMode();

  const segments = useMemo(() => {
    const set = new Set<string>();
    let hasNone = false;
    invites.forEach((i) => (i.segment ? set.add(i.segment) : (hasNone = true)));
    const list = Array.from(set).sort((a, b) => a.localeCompare(b));
    return { list, hasNone };
  }, [invites]);

  const showPills = segments.list.length > 0;

  const filteredInvites = useMemo(() => {
    if (!showPills || activeSegment === "__all__") return invites;
    if (activeSegment === "__none__") return invites.filter((i) => !i.segment);
    return invites.filter((i) => i.segment === activeSegment);
  }, [invites, activeSegment, showPills]);

  // Drop selections that left the visible segment
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filteredInvites.some((i) => i.id === id)));
  }, [filteredInvites]);

  const selectableInvites = filteredInvites.filter((i) => i.status === "pending");
  const allSelected =
    selectableInvites.length > 0 && selectedIds.length === selectableInvites.length;

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : selectableInvites.map((i) => i.id));

  const handleSetMode = async (ids: string[], mode: "app" | "direct") => {
    if (ids.length === 0) return;
    try {
      await setMode.mutateAsync({ inviteIds: ids, mode, eventId });
      toast.success(
        mode === "direct"
          ? "Estas invitaciones ya no requieren cuenta"
          : "Estas invitaciones se abren en la app"
      );
    } catch {
      toast.error("No se pudo cambiar el modo");
    }
  };

  const handleBulkSend = async () => {
    const withEmail = filteredInvites.filter(
      (i) => selectedIds.includes(i.id) && i.guest_email
    );
    if (withEmail.length === 0) {
      toast.error("Las invitaciones seleccionadas no tienen correo");
      return;
    }
    try {
      const res = await sendEmails.mutateAsync({
        eventId,
        inviteIds: withEmail.map((i) => i.id),
      });
      toast.success(`${res.sent ?? withEmail.length} invitaciones enviadas`);
      setSelectedIds([]);
    } catch {
      toast.error("No se pudieron enviar los correos");
    }
  };


  const handleExport = () => {
    if (filteredInvites.length === 0) {
      toast.error("No hay invitaciones para exportar");
      return;
    }
    const rows = filteredInvites.map((i) => ({
      guest_name: i.rsvp_name || i.guest_name,
      guest_email: i.rsvp_email || i.guest_email,
      segment: i.segment,
      url: getSpecialInviteUrl(i.token),
      status: i.status,
      mode: i.delivery_mode === "direct" ? "Sin cuenta" : "App",
      rsvp: i.rsvp_confirmed_at ? new Date(i.rsvp_confirmed_at).toLocaleString("es-BO") : "",
      check_in: i.checked_in_at ? new Date(i.checked_in_at).toLocaleString("es-BO") : "",
    }));

    const suffix =
      activeSegment === "__all__" ? "todos" : activeSegment === "__none__" ? "sin-segmento" : activeSegment;
    downloadXlsx(
      `invitaciones-${suffix.toLowerCase().replace(/\s+/g, "-")}.xlsx`,
      buildInvitesXlsx(rows)
    );
  };



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

      {showPills && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {[
            { key: "__all__", label: `Todos (${invites.length})` },
            ...segments.list.map((s) => ({
              key: s,
              label: `${s} (${invites.filter((i) => i.segment === s).length})`,
            })),
            ...(segments.hasNone
              ? [{ key: "__none__", label: `Sin segmento (${invites.filter((i) => !i.segment).length})` }]
              : []),
          ].map((pill) => (
            <button
              key={pill.key}
              onClick={() => setActiveSegment(pill.key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors",
                activeSegment === pill.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}

      {!isLoading && selectableInvites.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-foreground"
            >
              <Checkbox checked={allSelected} className="pointer-events-none" />
              {allSelected ? "Quitar selección" : "Seleccionar todas"}
            </button>
            <span className="text-xs text-muted-foreground">
              {selectedIds.length} seleccionadas
            </span>
          </div>

          {selectedIds.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="hero"
                size="sm"
                className="w-full"
                onClick={handleBulkSend}
                disabled={sendEmails.isPending}
              >
                {sendEmails.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-1.5" /> Enviar por correo
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {!isLoading && invites.length > 0 && (
        <Button variant="secondary" className="w-full" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> Descargar Excel
          {showPills && activeSegment !== "__all__" ? " del segmento" : ""}
        </Button>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : invites.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Todavía no creaste invitaciones especiales
        </p>
      ) : filteredInvites.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No hay invitaciones en este segmento
        </p>
      ) : (
        <div className="space-y-2">
          {filteredInvites.map((invite) => (
            <div
              key={invite.id}
              className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3"
            >
              {invite.status === "pending" && (
                <Checkbox
                  checked={selectedIds.includes(invite.id)}
                  onCheckedChange={() => toggleSelect(invite.id)}
                  aria-label="Seleccionar invitación"
                  className="shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {invite.rsvp_name || invite.guest_name || invite.label || "Invitación especial"}
                  </p>
                  {invite.segment && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {invite.segment}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {invite.rsvp_email || invite.guest_email || getSpecialInviteUrl(invite.token)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {invite.checked_in_at
                    ? "Ingresó al evento"
                    : invite.rsvp_confirmed_at
                      ? "Asistencia confirmada"
                      : invite.guest_email
                        ? invite.email_status === "sent"
                          ? "Correo enviado"
                          : invite.email_status === "failed"
                            ? "Envío fallido"
                            : "Sin enviar"
                        : "Enlace listo para compartir"}
                </p>
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
