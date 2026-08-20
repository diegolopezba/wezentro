import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let recovered = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recovered = true;
        setReady(true);
      }
    });

    // Fallback: if Supabase already exchanged the token, a session exists.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      } else {
        // Give the SDK a moment to process the recovery hash
        setTimeout(() => {
          if (!recovered) {
            supabase.auth.getSession().then(({ data: d2 }) => {
              if (d2.session) setReady(true);
              else setInvalid(true);
            });
          }
        }, 1500);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Contraseña muy corta", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast({ title: "No se pudo actualizar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contraseña actualizada", description: "Inicia sesión con tu nueva contraseña." });
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  if (invalid) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6 bg-background">
        <div className="max-w-sm w-full text-center space-y-6">
          <h1 className="text-2xl font-semibold text-foreground">Enlace inválido o expirado</h1>
          <p className="text-muted-foreground text-sm">
            El enlace para restablecer tu contraseña ya no es válido. Solicita uno nuevo desde el inicio de sesión.
          </p>
          <Button
            variant="sheet-action"
            className="w-full rounded-full"
            onClick={() => navigate("/auth", { replace: true })}
          >
            Volver al inicio de sesión
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6 bg-background">
      <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Nueva contraseña</h1>
          <p className="text-sm text-muted-foreground">Elige una contraseña para tu cuenta.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            required
          />
        </div>

        <Button type="submit" variant="sheet-action" className="w-full rounded-full" disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Actualizar contraseña"}
        </Button>
      </form>
    </div>
  );
}
