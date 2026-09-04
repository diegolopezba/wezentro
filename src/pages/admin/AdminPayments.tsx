import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useAdminPayments, type AdminPeriod, type AdminTransaction } from "@/hooks/useAdminApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PeriodPills, Section, Stat, bs } from "./adminUi";

const STATUSES = ["all", "confirmed", "pending", "failed", "cancelled"];

const toCsv = (rows: AdminTransaction[]) => {
  const head = [
    "id", "fecha", "estado", "tipo", "monto", "comision", "neto_organizador",
    "cantidad", "comprador", "negocio", "evento", "transaccion",
  ];
  const body = rows.map((r) =>
    [
      r.id, r.created_at, r.status, r.kind, r.amount, r.fee, r.payout, r.quantity,
      r.buyer ?? "", r.business ?? "", r.event ?? "", r.transaction_id ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [head.join(","), ...body].join("\n");
};

const AdminPayments = () => {
  const [period, setPeriod] = useState<AdminPeriod>("30d");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error } = useAdminPayments(period, status, search);

  const download = () => {
    if (!data) return;
    const blob = new Blob([toCsv(data.transactions)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zentro-pagos-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium">Pagos y finanzas</h1>
        <PeriodPills value={period} onChange={setPeriod} />
      </header>

      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      {isError && <p className="text-sm text-destructive">{(error as Error)?.message}</p>}

      {data && (
        <>
          <Section title="Ingreso total Zentro">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat
                label="Ingreso total Zentro"
                value={bs(data.summary.totalRevenue)}
                hint="Comisión 6% + suscripciones"
              />
              <Stat label="Comisión ventas (6%)" value={bs(data.summary.commission)} />
              <Stat label="Suscripciones (100%)" value={bs(data.summary.subscriptionRevenue)} />
            </div>
          </Section>

          <Section title="Canal 1 · Ventas con comisión Zentro (6%)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Comisión Zentro" value={bs(data.summary.commission)} hint="6% del bruto" />
              <Stat label="Volumen bruto" value={bs(data.summary.gross)} />
              <Stat label="Pagado a organizadores" value={bs(data.summary.payouts)} hint="94%" />
              <Stat label="Ticket promedio" value={bs(data.summary.avgOrder)} />
              <Stat label="Órdenes" value={data.summary.orders} />
              <Stat label="Entradas / cupos" value={data.summary.units} />
              <Stat label="Comisión entradas" value={bs(data.summary.ticketsCommission)} />
              <Stat label="Comisión lounges" value={bs(data.summary.areasCommission)} />
              <Stat label="Comisión experiencias" value={bs(data.summary.experiencesCommission)} />
            </div>
          </Section>

          <Section title="Canal 2 · Suscripciones de negocios (100% Zentro)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat
                label="Ingreso suscripciones"
                value={bs(data.summary.subscriptionRevenue)}
                hint="Sin comisión ni reparto"
              />
              <Stat label="Pagos de suscripción" value={data.summary.subscriptionPayments} />
              <Stat label="Pago promedio" value={bs(data.summary.subscriptionAvg)} />
            </div>
            <p className="text-xs text-muted-foreground">
              El detalle por negocio está en la pestaña Suscripciones.
            </p>
          </Section>

          {data.stuck.length > 0 && (
            <Section title={`Pagos atascados (${data.summary.stuck})`}>
              <div className="rounded-2xl border border-border divide-y divide-border">
                {data.stuck.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground truncate">{s.id.slice(0, 8)}</span>
                    <span>{new Date(s.created_at).toLocaleString("es-BO")}</span>
                    <span className="text-muted-foreground">{s.status}</span>
                    <span className="tabular-nums">{bs(s.amount)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Top negocios">
            <div className="rounded-2xl border border-border divide-y divide-border">
              {data.topBusinesses.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground">Sin ventas en este periodo.</p>
              )}
              {data.topBusinesses.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3 text-sm gap-3">
                  <span className="truncate flex-1">{b.name}</span>
                  <span className="text-muted-foreground">{b.orders} órdenes</span>
                  <span className="tabular-nums w-28 text-right">{bs(b.gross)}</span>
                  <span className="tabular-nums w-28 text-right text-muted-foreground">{bs(b.commission)}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Transacciones de ventas (sin suscripciones)">
            <div className="flex flex-wrap items-center gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border",
                    status === s
                      ? "bg-foreground text-background border-transparent"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {s === "all" ? "Todos" : s}
                </button>
              ))}
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar comprador, negocio, evento o ID"
                className="w-full md:w-72 ml-auto"
              />
              <Button variant="outline" className="rounded-full" onClick={download}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>

            <div className="rounded-2xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    {["Fecha", "Estado", "Tipo", "Comprador", "Negocio", "Evento", "Cant.", "Monto", "Comisión", "Neto"].map(
                      (h) => (
                        <th key={h} className="text-left font-normal px-3 py-2 whitespace-nowrap">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString("es-BO")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs",
                            t.status === "confirmed" ? "bg-muted text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {t.kind === "experience" ? "Experiencia" : t.kind === "area" ? "Lounge" : "Entrada"}
                      </td>
                      <td className="px-3 py-2 max-w-[160px] truncate">{t.buyer ?? "—"}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate">{t.business ?? "—"}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate">{t.event ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{t.quantity}</td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">{bs(t.amount)}</td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">{bs(t.fee)}</td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap text-muted-foreground">
                        {bs(t.payout)}
                      </td>
                    </tr>
                  ))}
                  {data.transactions.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-4 text-muted-foreground">
                        Sin transacciones.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
};

export default AdminPayments;
