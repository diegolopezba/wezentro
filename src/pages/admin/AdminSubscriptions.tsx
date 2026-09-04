import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import {
  useAdminSubscriptions,
  type AdminPeriod,
  type AdminSubscription,
} from "@/hooks/useAdminApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PeriodPills, Section, Stat, bs } from "./adminUi";

const STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "pending_activation", label: "Pendientes" },
  { value: "past_due", label: "En mora" },
  { value: "cancelled", label: "Canceladas" },
];

const TIER_FILTERS = [
  { value: "all", label: "Todos los planes" },
  { value: "basico", label: "Básico" },
  { value: "profesional", label: "Profesional" },
  { value: "elite", label: "Elite" },
];

const TIER_LABEL: Record<string, string> = {
  basico: "Básico",
  profesional: "Profesional",
  elite: "Elite",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  pending_activation: "Pendiente",
  past_due: "En mora",
  cancelled: "Cancelada",
};

const date = (v: string | null) => (v ? new Date(v).toLocaleDateString("es-BO") : "—");

const toCsv = (rows: AdminSubscription[]) => {
  const head = [
    "negocio", "usuario", "plan", "estado", "cadencia", "alta", "inicio_periodo",
    "fin_periodo", "dias_restantes", "activacion", "auto_renovacion", "ultimo_pago",
    "monto_ultimo_pago", "total_pagado",
  ];
  const body = rows.map((r) =>
    [
      r.business ?? "", r.username ?? "", TIER_LABEL[r.tier] ?? r.tier,
      STATUS_LABEL[r.status] ?? r.status, r.interval === "year" ? "Anual" : "Mensual",
      r.created_at, r.periodStart ?? "", r.periodEnd ?? "", r.daysLeft ?? "",
      r.activationMethod, r.autoRenew ? "sí" : "no", r.lastPaymentAt ?? "",
      r.lastPaymentAmount ?? "", r.totalPaid,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [head.join(","), ...body].join("\n");
};

const StatusChip = ({ status, daysLeft }: { status: string; daysLeft: number | null }) => {
  const tone =
    status === "active"
      ? daysLeft != null && daysLeft <= 7
        ? "bg-amber-100 text-amber-900"
        : "bg-emerald-100 text-emerald-900"
      : status === "past_due"
        ? "bg-red-100 text-red-900"
        : status === "pending_activation"
          ? "bg-blue-100 text-blue-900"
          : "bg-muted text-muted-foreground";
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs whitespace-nowrap", tone)}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
};

const AdminSubscriptions = () => {
  const [period, setPeriod] = useState<AdminPeriod>("30d");
  const [status, setStatus] = useState("all");
  const [tier, setTier] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, isError, error } = useAdminSubscriptions(period);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.subscriptions ?? []).filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (tier !== "all" && r.tier !== tier) return false;
      if (term && ![r.business, r.username].some((v) => (v ?? "").toLowerCase().includes(term)))
        return false;
      return true;
    });
  }, [data, status, tier, search]);

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zentro-suscripciones-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium">Suscripciones</h1>
        <PeriodPills value={period} onChange={setPeriod} />
      </header>

      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      {isError && <p className="text-sm text-destructive">{(error as Error)?.message}</p>}

      {data && (
        <>
          <Section title="Resumen">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Activas" value={data.summary.active} hint={`${data.summary.total} en total`} />
              <Stat label="Por vencer (30 días)" value={data.summary.expiringSoon} />
              <Stat label="En mora" value={data.summary.pastDue} />
              <Stat label="Canceladas" value={data.summary.cancelled} />
              <Stat
                label="Ingreso del periodo"
                value={bs(data.summary.periodRevenue)}
                hint={`${data.summary.periodPayments} pagos`}
              />
              <Stat label="MRR estimado" value={bs(data.summary.mrr)} />
              <Stat label="Pendientes de activación" value={data.summary.pending} />
              <Stat
                label="Activas por plan"
                value={`${data.summary.byTier.basico} / ${data.summary.byTier.profesional} / ${data.summary.byTier.elite}`}
                hint="Básico / Profesional / Elite"
              />
            </div>
          </Section>

          <Section title="Negocios suscritos">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border",
                    status === s.value
                      ? "bg-foreground text-background border-transparent"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="h-9 rounded-full border border-border bg-background px-3 text-sm"
              >
                {TIER_FILTERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar negocio"
                className="w-full md:w-64 ml-auto"
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
                    {[
                      "Negocio", "Plan", "Cadencia", "Estado", "Alta", "Inicio", "Renueva",
                      "Días", "Activación", "Último pago", "Total", "",
                    ].map((h) => (
                      <th key={h} className="text-left font-normal px-3 py-2 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <Fragment key={r.id}>
                      <tr className="border-b border-border/60">
                        <td className="px-3 py-2 max-w-[200px]">
                          <p className="truncate">{r.business ?? "—"}</p>
                          {r.username && (
                            <p className="text-xs text-muted-foreground truncate">{r.username}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{TIER_LABEL[r.tier] ?? r.tier}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {r.interval === "year" ? "Anual" : "Mensual"}
                        </td>
                        <td className="px-3 py-2">
                          <StatusChip status={r.status} daysLeft={r.daysLeft} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{date(r.created_at)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{date(r.periodStart)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{date(r.periodEnd)}</td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                          {r.daysLeft == null ? "—" : r.daysLeft < 0 ? `Vencida (${-r.daysLeft}d)` : `${r.daysLeft}d`}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {r.activationMethod === "manual" ? "Manual" : "Pago"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.lastPaymentAmount != null ? bs(r.lastPaymentAmount) : "—"}
                          <span className="block text-xs text-muted-foreground">
                            {date(r.lastPaymentAt)}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">{bs(r.totalPaid)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => setOpen(open === r.id ? null : r.id)}
                            className="p-1.5 rounded-full border border-border text-muted-foreground"
                            aria-label="Ver pagos"
                          >
                            <ChevronDown
                              className={cn("w-4 h-4 transition-transform", open === r.id && "rotate-180")}
                            />
                          </button>
                        </td>
                      </tr>
                      {open === r.id && (
                        <tr className="border-b border-border/60 bg-muted/40">
                          <td colSpan={12} className="px-3 py-3">
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Button variant="outline" size="sm" className="rounded-full" disabled>
                                Renovar / extender
                              </Button>
                              <Button variant="outline" size="sm" className="rounded-full" disabled>
                                Cambiar plan
                              </Button>
                              <Button variant="outline" size="sm" className="rounded-full" disabled>
                                Cancelar
                              </Button>
                              <span className="text-xs text-muted-foreground self-center">
                                Acciones por definir
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">Historial de pagos</p>
                            {r.payments.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
                            ) : (
                              <div className="rounded-xl border border-border divide-y divide-border bg-background">
                                {r.payments.map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                                  >
                                    <span className="text-muted-foreground">
                                      {new Date(p.confirmed_at ?? p.created_at).toLocaleString("es-BO")}
                                    </span>
                                    <span>{p.tier ? TIER_LABEL[p.tier] ?? p.tier : "—"}</span>
                                    <span className="text-muted-foreground">
                                      {p.interval === "year" ? "Anual" : "Mensual"}
                                    </span>
                                    <span className="text-muted-foreground">{p.status}</span>
                                    <span className="tabular-nums">{bs(p.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-3 py-4 text-muted-foreground">
                        Sin suscripciones para este filtro.
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

export default AdminSubscriptions;
