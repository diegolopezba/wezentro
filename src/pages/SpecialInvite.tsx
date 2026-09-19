import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, TicketX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicInvite, setPendingSpecialInvite } from "@/hooks/useSpecialInvites";

/**
 * Landing page for a special invitation link: /i/:token
 * Account required: signed-out guests are sent to sign up / sign in and come
 * back to the event, where they accept the invitation and get their ticket.
 */
const SpecialInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: invite, isLoading, isError } = usePublicInvite(token);

  useEffect(() => {
    if (authLoading || !token || isLoading || !invite) return;
    if (invite.status === "revoked") return;

    if (!user) {
      setPendingSpecialInvite(token);
      navigate("/auth", { replace: true, state: { returnTo: `/i/${token}` } });
      return;
    }

    navigate(`/event/${invite.event_id}?invite=${invite.token}`, { replace: true });
  }, [authLoading, user, token, invite, isLoading, navigate]);

  const unavailable = !isLoading && (isError || !invite || invite.status === "revoked");

  if (unavailable) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-8 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <TicketX className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="font-brand text-xl font-medium text-foreground">
          Invitación no disponible
        </h1>
        <p className="text-sm text-muted-foreground">
          Este enlace ya fue usado o el organizador lo canceló.
        </p>
        <Button variant="sheet-action" onClick={() => navigate("/", { replace: true })}>
          Ir al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
    </div>
  );
};

export default SpecialInvite;
