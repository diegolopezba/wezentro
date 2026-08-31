import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAdminBusinesses } from "@/hooks/useAdminApi";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Section, bs } from "./adminUi";

const AdminBusinesses = () => {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error } = useAdminBusinesses(search);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium">Negocios</h1>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o usuario"
          className="w-full md:w-72"
        />
      </header>

      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      {isError && <p className="text-sm text-destructive">{(error as Error)?.message}</p>}

      {data && (
        <Section title={`${data.businesses.length} cuentas de negocio`}>
          <div className="rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  {["Negocio", "Ciudad", "Tipo", "Plan", "Cobros", "Ventas", "Comisión", "Desde"].map((h) => (
                    <th key={h} className="text-left font-normal px-3 py-2 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.businesses.map((b) => (
                  <tr key={b.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 max-w-[200px] truncate">
                      {b.name ?? "—"}
                      {b.username && <span className="text-muted-foreground"> · {b.username}</span>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{b.city ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{b.type ?? (b.isFood ? "comida" : "—")}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {b.tier ? `${b.tier}${b.subscriptionStatus ? ` (${b.subscriptionStatus})` : ""}` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs",
                          b.payoutsReady ? "bg-muted text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {b.payoutsReady ? "Listo" : "Sin datos"}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">{bs(b.gross)}</td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap text-muted-foreground">
                      {bs(b.commission)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(b.created_at).toLocaleDateString("es-BO")}
                    </td>
                  </tr>
                ))}
                {data.businesses.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-muted-foreground">
                      Sin resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
};

export default AdminBusinesses;
