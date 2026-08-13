import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, TicketX, CalendarDays, MapPin, Check, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePublicInvite,
  useConfirmInviteRsvp,
  getInviteQrImageUrl,
  setPendingSpecialInvite,
} from "@/hooks/useSpecialInvites";

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("es-BO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return null;
  }
};

/**
 * Public landing page for a special invitation link: /i/:token
 * - delivery_mode "direct" → frictionless RSVP: name + email, instant QR ticket, no account.
 * - delivery_mode "app"    → the classic flow (sign in, then the in-app ticket).
 */
const SpecialInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: invite, isLoading, isError } = usePublicInvite(token);
  const confirmRsvp = useConfirmInviteRsvp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const isDirect = invite?.delivery_mode === "direct";
  const confirmed = !!invite?.rsvp_confirmed_at && !!invite?.qr_code_token;
  const eventDate = useMemo(() => formatDate(invite?.event_start ?? null), [invite?.event_start]);

  // Prefill from the invite the host imported (Luma-style one-tap confirm)
  useEffect(() => {
    if (!invite || prefilled) return;
    setName(invite.rsvp_name || invite.guest_name || "");
    setEmail(invite.rsvp_email || invite.guest_email || "");
    setPrefilled(true);
  }, [invite, prefilled]);

  // Classic flow: signed-out users go to auth, signed-in users forward to the event
  useEffect(() => {
    if (authLoading || !token || isLoading || !invite || isDirect) return;
    if (!user) {
      setPendingSpecialInvite(token);
      navigate("/auth", { replace: true, state: { returnTo: `/i/${token}` } });
      return;
    }
    if (invite.status === "pending" || invite.status === "redeemed") {
      navigate(`/event/${invite.event_id}?invite=${invite.token}`, { replace: true });
    }
  }, [authLoading, user, token, invite, isDirect, isLoading, navigate]);

  const unavailable =
    !isLoading && (isError || !invite || (invite.status === "revoked") ||
      (invite.status === "redeemed" && !invite.rsvp_confirmed_at && isDirect));

  const handleConfirm = async () => {
    if (!token) return;
    try {
      const res = await confirmRsvp.mutateAsync({ token, name, email });
      if (!res.already_confirmed) {
        // Fire-and-forget confirmation email with the ticket QR
        supabase.functions
          .invoke("send-transactional-email", {
            body: {
              templateName: "invite-confirmed",
              recipientEmail: email.trim().toLowerCase(),
              idempotencyKey: `invite-confirmed-${res.invite_id}`,
              templateData: {
                guestName: name.trim(),
                eventTitle: invite?.event_title ?? undefined,
                eventDate: eventDate ?? undefined,
                eventLocation: invite?.event_location ?? undefined,
                eventImageUrl: invite?.event_image_url ?? undefined,
                segment: invite?.segment ?? undefined,
                hostName: invite?.host_name ?? undefined,
                ticketUrl: `${window.location.origin}/i/${token}`,
                qrImageUrl: getInviteQrImageUrl(res.qr_code_token),
              },
            },
          })
          .catch(() => undefined);
      }
      toast.success(`Te enviamos la entrada a ${email.trim().toLowerCase()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo confirmar");
    }
  };

  if (unavailable) {
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
        <Button variant="hero" onClick={() => navigate("/", { replace: true })}>
          Ir al inicio
        </Button>
      </div>
    );
  }

  if (isLoading || !invite || !isDirect) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto w-full max-w-md px-4 py-6 space-y-4">
        {/* Event card */}
        <div className="rounded-3xl overflow-hidden bg-card border border-border">
          {invite.event_image_url && (
            <img
              src={invite.event_image_url}
              alt={invite.event_title ?? "Evento"}
              className="w-full aspect-[4/3] object-cover"
              loading="eager"
            />
          )}
          <div className="p-4 space-y-2">
            <p className="text-[11px] font-bold tracking-[0.15em] text-primary">
              {invite.segment
                ? `INVITADO ESPECIAL · ${invite.segment.toUpperCase()}`
                : "INVITADO ESPECIAL"}
            </p>
            <h1 className="font-brand text-xl font-bold text-foreground leading-tight">
              {invite.event_title}
            </h1>
            {eventDate && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="w-4 h-4 shrink-0" /> {eventDate}
              </p>
            )}
            {invite.event_location && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" /> {invite.event_location}
              </p>
            )}
            {invite.host_name && (
              <p className="text-xs text-muted-foreground pt-1">
                Te invita {invite.host_name}
              </p>
            )}
          </div>
        </div>

        {confirmed ? (
          <>
            {/* Ticket */}
            <div className="rounded-3xl bg-card border border-border p-5 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Check className="w-4 h-4 text-primary" /> Asistencia confirmada
              </div>
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG value={invite.qr_code_token!} size={200} level="H" />
              </div>
              <p className="text-base font-semibold text-foreground text-center">
                {invite.rsvp_name || invite.guest_name}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                {invite.checked_in_at
                  ? "Esta entrada ya fue usada en la puerta"
                  : "Mostrá este código en la entrada. Es de un solo uso."}
              </p>
            </div>

            {/* Soft app pitch — never a wall */}
            <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  Sacale más provecho a tu noche
                </p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tu entrada ya es válida. Si querés, creá tu cuenta gratis para recibir
                avisos y mensajes del organizador, ver detalles y beneficios exclusivos,
                guardar tus entradas en un solo lugar y descubrir todo lo que está pasando
                en la ciudad.
              </p>
              {!user && (
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={() => {
                    if (token) setPendingSpecialInvite(token);
                    navigate("/auth", { state: { returnTo: `/event/${invite.event_id}` } });
                  }}
                >
                  Crear mi cuenta gratis
                </Button>
              )}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate(`/event/${invite.event_id}`)}
              >
                Ver el evento
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">Confirmá tu asistencia</p>
            <p className="text-xs text-muted-foreground">
              Confirmá tus datos — te enviamos la entrada a este correo. Sin contraseñas,
              sin códigos ni descargas.
            </p>
            <Input
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="name"
            />
            <Input
              type="email"
              placeholder="Tu correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={160}
              autoComplete="email"
              inputMode="email"
            />
            <Button
              variant="hero"
              className="w-full"
              onClick={handleConfirm}
              disabled={confirmRsvp.isPending || !name.trim() || !email.trim()}
            >
              {confirmRsvp.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirmar asistencia"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecialInvite;
