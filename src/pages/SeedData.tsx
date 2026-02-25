import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const ADMIN_PASSWORD = "Zentro@Admin2025";
const BATCH_SIZE = 15;
const TOTAL_BUSINESSES = 100;
const TOTAL_USERS = 22;

export default function SeedData() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);

  const runDelete = async () => {
    if (!confirm("¿Eliminar TODOS los datos mock? Esto no se puede deshacer.")) return;
    setLoading(true);
    setResult(null);
    setStatus("Eliminando datos mock...");
    try {
      const { data, error } = await supabase.functions.invoke("seed-mock-data", {
        body: { seedType: "delete" },
      });
      if (error) throw new Error(error.message);
      setResult({ success: true, deleted: data.deleted });
      setStatus("¡Eliminado!");
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const unlock = () => {
    if (password === ADMIN_PASSWORD) setUnlocked(true);
    else alert("Contraseña incorrecta");
  };

  const runSeed = async () => {
    setLoading(true);
    setResult(null);
    setProgress(0);

    const totals = { businesses: 0, users: 0, events: 0, menus: 0, errors: [] as string[] };
    const totalSteps = Math.ceil(TOTAL_BUSINESSES / BATCH_SIZE) + Math.ceil(TOTAL_USERS / BATCH_SIZE);
    let step = 0;

    try {
      // Seed businesses in batches
      let bizIndex = 0;
      while (true) {
        setStatus(`Creando negocios... (${bizIndex}/${TOTAL_BUSINESSES})`);
        const { data, error } = await supabase.functions.invoke("seed-mock-data", {
          body: { seedType: "businesses", startIndex: bizIndex, batchSize: BATCH_SIZE },
        });
        if (error) throw new Error(error.message);
        totals.businesses += data.businesses || 0;
        totals.events += data.events || 0;
        totals.menus += data.menus || 0;
        if (data.errors) totals.errors.push(...data.errors);
        step++;
        setProgress(Math.round((step / totalSteps) * 100));
        if (data.done) break;
        bizIndex = data.nextIndex;
      }

      // Seed users in batches
      let userIndex = 0;
      while (true) {
        setStatus(`Creando usuarios... (${userIndex}/${TOTAL_USERS})`);
        const { data, error } = await supabase.functions.invoke("seed-mock-data", {
          body: { seedType: "users", startIndex: userIndex, batchSize: BATCH_SIZE },
        });
        if (error) throw new Error(error.message);
        totals.users += data.users || 0;
        if (data.errors) totals.errors.push(...data.errors);
        step++;
        setProgress(Math.round((step / totalSteps) * 100));
        if (data.done) break;
        userIndex = data.nextIndex;
      }

      setProgress(100);
      setStatus("¡Completado!");
      setResult({ success: true, ...totals });
    } catch (err: any) {
      setResult({ error: err.message, ...totals });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-foreground text-center">🌱 Seed Mock Data</h1>
        <p className="text-muted-foreground text-center text-sm">Crea 100 cuentas de negocios + 22 usuarios reales para demo.</p>

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
              <p>✅ <strong>22 usuarios bolivianos</strong> con fotos de avatar</p>
              <p>✅ <strong>~200 eventos</strong> por cada negocio</p>
              <p>✅ <strong>Menús</strong> para negocios de comida</p>
              <p>🔑 Password de todas las cuentas: <code className="bg-background px-1 rounded">Zentro2025!</code></p>
              <p className="text-warning">⚠️ Idempotente — puedes correrlo múltiples veces sin duplicados.</p>
            </div>

            <Button className="w-full" onClick={runSeed} disabled={loading}>
              {loading && !status.includes("Eliminando") ? status || "Iniciando..." : "🚀 Crear Cuentas Mock"}
            </Button>

            <Button variant="destructive" className="w-full" onClick={runDelete} disabled={loading}>
              {loading && status.includes("Eliminando") ? "Eliminando..." : "🗑️ Eliminar Datos Mock"}
            </Button>

            {loading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{progress}% — {status}</p>
              </div>
            )}

            {result && (
              <div className={`rounded-lg p-4 text-sm ${result.error ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                {result.error ? (
                  <p>Error: {result.error}</p>
                ) : result.deleted !== undefined ? (
                  <p>🗑️ <strong>{result.deleted}</strong> cuentas mock eliminadas.</p>
                ) : (
                  <div className="space-y-1">
                    <p>✅ Negocios creados: <strong>{result.businesses}</strong></p>
                    <p>✅ Usuarios creados: <strong>{result.users}</strong></p>
                    <p>✅ Eventos creados: <strong>{result.events}</strong></p>
                    <p>✅ Menús creados: <strong>{result.menus}</strong></p>
                    {result.errors?.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-warning">⚠️ {result.errors.length} advertencias</summary>
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
