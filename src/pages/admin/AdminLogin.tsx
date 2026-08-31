import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callAdminApi } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Standalone admin-only login. Non-admins are signed out immediately. */
const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    document.title = "Zentro Admin";
    callAdminApi({ action: "whoami" })
      .then(() => navigate("/admin", { replace: true }))
      .catch(() => setChecking(false));
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Credenciales incorrectas.");
      setLoading(false);
      return;
    }
    try {
      await callAdminApi({ action: "whoami" });
      navigate("/admin", { replace: true });
    } catch {
      await supabase.auth.signOut();
      setError("Acceso denegado.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="light min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="light min-h-[100dvh] bg-background flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-foreground" />
          </div>
          <h1 className="text-xl font-medium text-foreground">Zentro Admin</h1>
        </div>

        <Input
          type="email"
          autoComplete="username"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <Button type="submit" className="w-full rounded-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
        </Button>
      </form>
    </div>
  );
};

export default AdminLogin;
