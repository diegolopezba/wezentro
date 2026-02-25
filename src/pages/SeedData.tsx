import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ADMIN_PASSWORD = "Zentro@Admin2025";

export default function SeedData() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const unlock = () => {
    if (password === ADMIN_PASSWORD) setUnlocked(true);
    else alert("Contraseña incorrecta");
  };

  const runSeed = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("seed-mock-data");
      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-foreground text-center">🌱 Seed Mock Data</h1>
        <p className="text-muted-foreground text-center text-sm">Crea 100 cuentas de negocios + 50 usuarios reales para demo.</p>

        {!unlocked ? (
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Contraseña de administrador"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlock()}
            />
            <Button className="w-full" onClick={unlock}>Desbloquear</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground space-y-1">
              <p>✅ <strong>100 negocios</strong> con logos reales de Unsplash</p>
              <p>✅ <strong>50 usuarios bolivianos</strong> con fotos de avatar</p>
              <p>✅ <strong>~200 eventos</strong> por cada negocio</p>
              <p>✅ <strong>Menús</strong> para negocios de comida</p>
              <p>🔑 Password de todas las cuentas: <code className="bg-background px-1 rounded">Zentro2025!</code></p>
              <p className="text-yellow-500">⚠️ Idempotente — puedes correrlo múltiples veces sin duplicados.</p>
            </div>

            <Button className="w-full" onClick={runSeed} disabled={loading}>
              {loading ? "Sembrando datos... (puede tardar 2-3 min)" : "🚀 Crear 150 Cuentas Mock"}
            </Button>

            {result && (
              <div className={`rounded-lg p-4 text-sm ${result.error ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                {result.error ? (
                  <p>Error: {result.error}</p>
                ) : (
                  <div className="space-y-1">
                    <p>✅ Negocios creados: <strong>{result.businesses}</strong></p>
                    <p>✅ Usuarios creados: <strong>{result.users}</strong></p>
                    <p>✅ Eventos creados: <strong>{result.events}</strong></p>
                    <p>✅ Menús creados: <strong>{result.menus}</strong></p>
                    {result.errors?.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-yellow-400">⚠️ {result.errors.length} advertencias</summary>
                        <ul className="mt-1 space-y-1 text-xs">{result.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
