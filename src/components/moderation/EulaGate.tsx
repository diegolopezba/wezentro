import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/**
 * EULA gate (Apple Guideline 1.2). Shown once after sign-up if not accepted.
 * Records acceptance to eula_acceptances table. No moderation tolerance clause.
 */
export const EulaGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [needsAccept, setNeedsAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("eula_acceptances")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNeedsAccept(true);
      }
      setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleAccept = async () => {
    if (!user) return;
    setSubmitting(true);
    await (supabase as any)
      .from("eula_acceptances")
      .insert({ user_id: user.id, version: "1.1" });
    setNeedsAccept(false);
    setSubmitting(false);
  };

  if (!checked) return <>{children}</>;

  if (needsAccept && user) {
    return (
      <>
        {children}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[9998] bg-background/95 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        >
          <m.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-md rounded-3xl bg-card border border-border p-6 space-y-4"
          >
            <h2 className="font-brand text-xl font-semibold text-foreground">
              Reglas de la comunidad
            </h2>
            <div className="text-sm text-muted-foreground space-y-3 max-h-[40vh] overflow-y-auto">
              <p>
                Zentro tiene <span className="text-foreground font-medium">tolerancia cero al contenido y comportamiento abusivo</span>.
                Esto incluye spam, acoso, discurso de odio, desnudez, violencia, contenido ilegal y suplantación de identidad.
              </p>
              <p>
                Al usar la aplicación, aceptas:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>No publicar contenido objetable.</li>
                <li>Usar la función <span className="text-foreground">Reportar</span> para alertarnos sobre contenido que viole estas reglas.</li>
                <li>Usar <span className="text-foreground">Bloquear</span> para evitar interacciones no deseadas.</li>
              </ul>
              <p>
                Revisamos los reportes en menos de 24 horas y removemos el contenido que viole estas normas.
                Las cuentas que reincidan serán suspendidas permanentemente.
              </p>
              <p className="text-xs">
                Lee nuestros{" "}
                <button className="underline" onClick={() => navigate("/terms")}>Términos de Uso</button> y{" "}
                <button className="underline" onClick={() => navigate("/privacy-policy")}>Política de Privacidad</button>.
              </p>
            </div>
            <Button variant="hero" className="w-full" disabled={submitting} onClick={handleAccept}>
              {submitting ? "Guardando..." : "Acepto y entiendo"}
            </Button>
          </m.div>
        </m.div>
      </>
    );
  }

  return <>{children}</>;
};
