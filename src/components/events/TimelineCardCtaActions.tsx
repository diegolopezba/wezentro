import { useState } from "react";
import { MoreHorizontal, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAcceptedBusinessCtas,
  useMyBusinessCtaRequest,
  useRequestBusinessCta,
  useRevokeBusinessCta,
} from "@/hooks/useBusinessCtaRequest";

interface Props {
  eventId: string;
  creatorId: string;
}

/**
 * Small contextual menu shown on TimelineCards for managing business CTA
 * requests (menu / reservation buttons attached to a post).
 *
 * Visible when the logged-in viewer is either:
 *  - the post owner (can revoke an accepted business's buttons), or
 *  - a business viewer (can request, see pending, or revoke their own buttons).
 */
export const TimelineCardCtaActions = ({ eventId, creatorId }: Props) => {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);

  const isOwner = !!(user && user.id === creatorId);
  const isBusinessViewer = !!(user && (profile as any)?.is_business && user.id !== creatorId);

  // Only enable network calls when the menu is opened — keeps the masonry grid cheap.
  const { data: myRequest } = useMyBusinessCtaRequest(eventId, isBusinessViewer && open);
  const { data: accepted } = useAcceptedBusinessCtas(isOwner && open ? eventId : undefined);

  const request = useRequestBusinessCta();
  const revoke = useRevokeBusinessCta();

  // Don't render the trigger at all if there's nothing this viewer could ever do.
  if (!isOwner && !isBusinessViewer) return null;

  const handleRequest = async () => {
    try {
      await request.mutateAsync(eventId);
      toast.success("Solicitud enviada al autor de la publicación");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar la solicitud");
    }
  };

  const handleRevokeMine = async () => {
    if (!myRequest) return;
    try {
      await revoke.mutateAsync({ requestId: myRequest.id, eventId, by: "business" });
      toast.success("Botones removidos");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo remover");
    }
  };

  const handleRevokeByOwner = async (requestId: string) => {
    try {
      await revoke.mutateAsync({ requestId, eventId, by: "user" });
      toast.success("Botones removidos");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo remover");
    }
  };

  const isBusy = request.isPending || revoke.isPending;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          aria-label="Acciones"
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-white" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
        className="z-50"
      >
        {/* Business viewer actions */}
        {isBusinessViewer && !myRequest && (
          <DropdownMenuItem
            disabled={isBusy}
            onClick={(e) => {
              e.stopPropagation();
              handleRequest();
            }}
            className="gap-2"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Solicitar botones de menú/reserva
          </DropdownMenuItem>
        )}

        {isBusinessViewer && myRequest?.status === "pending" && (
          <DropdownMenuItem disabled className="gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4" />
            Solicitud pendiente…
          </DropdownMenuItem>
        )}

        {isBusinessViewer && myRequest?.status === "accepted" && (
          <DropdownMenuItem
            disabled={isBusy}
            onClick={(e) => {
              e.stopPropagation();
              handleRevokeMine();
            }}
            className="gap-2 text-destructive"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Quitar mis botones
          </DropdownMenuItem>
        )}

        {/* Owner actions */}
        {isOwner && accepted && accepted.length > 0 &&
          accepted.map((r) => (
            <DropdownMenuItem
              key={r.id}
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation();
                handleRevokeByOwner(r.id);
              }}
              className="gap-2 text-destructive"
            >
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Quitar botones de {r.business?.full_name || r.business?.username || "el negocio"}
            </DropdownMenuItem>
          ))}

        {isOwner && accepted && accepted.length === 0 && (
          <DropdownMenuItem disabled className="text-muted-foreground text-xs">
            Sin botones de negocios activos
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
