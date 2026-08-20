import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, MailX, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "invalid" | "used" | "done" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: ANON_KEY } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setState("invalid");
        if (data?.used || data?.already_unsubscribed) return setState("used");
        setState("valid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    setSubmitting(false);
    setState(error ? "error" : "done");
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-8 text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
        {state === "done" ? (
          <CheckCircle2 className="w-8 h-8 text-primary" />
        ) : (
          <MailX className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      {state === "loading" && <Loader2 className="w-6 h-6 animate-spin text-primary" />}

      {state === "valid" && (
        <>
          <h1 className="font-brand text-xl font-bold text-foreground">
            Cancelar suscripción
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            Ya no recibirás más correos de Zentro en esta dirección.
          </p>
          <Button variant="sheet-action" onClick={confirm} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
          </Button>
        </>
      )}

      {state === "done" && (
        <>
          <h1 className="font-brand text-xl font-bold text-foreground">Listo</h1>
          <p className="text-sm text-muted-foreground">
            Cancelaste tu suscripción a los correos de Zentro.
          </p>
        </>
      )}

      {state === "used" && (
        <>
          <h1 className="font-brand text-xl font-bold text-foreground">
            Ya estabas dado de baja
          </h1>
          <p className="text-sm text-muted-foreground">
            Esta dirección ya no recibe correos de Zentro.
          </p>
        </>
      )}

      {(state === "invalid" || state === "error") && (
        <>
          <h1 className="font-brand text-xl font-bold text-foreground">
            Enlace no válido
          </h1>
          <p className="text-sm text-muted-foreground">
            Este enlace expiró o no es correcto.
          </p>
        </>
      )}
    </div>
  );
};

export default Unsubscribe;
