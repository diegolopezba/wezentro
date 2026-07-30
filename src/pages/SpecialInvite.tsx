import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, TicketX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSpecialInvite, setPendingSpecialInvite } from "@/hooks/useSpecialInvites";

/**
 * Landing page for a special invitation link: /i/:token
 * - Signed out → stash the token and send the user to auth (returns here after).
 * - Signed in  → forward to the event with ?invite=<token>.
 */
const SpecialInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: invite, isLoading, isError } = useSpecialInvite(user ? token : undefined);

  useEffect(() => {
    if (loading || !token) return;
    if (!user) {
      setPendingSpecialInvite(token);
      navigate("/auth", { replace: true, state: { returnTo: `/i/${token}` } });
    }
  }, [loading, user, token, navigate]);

  useEffect(() => {
    if (!user || !invite) return;
    if (invite.status === "pending" || invite.redeemed_by === user.id) {
      navigate(`/event/${invite.event_id}?invite=${invite.token}`, { replace: true });
    }
  }, [user, invite, navigate]);

  const invalid =
    !!user &&
    !isLoading &&
    (isError || !invite || (invite.status !== "pending" && invite.redeemed_by !== user.id));

  if (invalid) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-8 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <TicketX className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="font-brand text-xl font-bold text-foreground">
          Invitación no disponible
        </h1>
        <p className="text-sm text-muted-foreground">
          Este enlace ya fue usado o el organizador lo canceló.
        </p>
        {invite?.event_id ? (
          <Button variant="hero" onClick={() => navigate(`/event/${invite.event_id}`, { replace: true })}>
            Ver el evento
          </Button>
        ) : (
          <Button variant="hero" onClick={() => navigate("/", { replace: true })}>
            Ir al inicio
          </Button>
        )}
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
