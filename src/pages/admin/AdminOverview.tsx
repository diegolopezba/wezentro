import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminOverview, type AdminPeriod } from "@/hooks/useAdminApi";
import { PeriodPills, Section, Stat, bs } from "./adminUi";

const AdminOverview = () => {
  const [period, setPeriod] = useState<AdminPeriod>("30d");
  const { data, isLoading, isError, error } = useAdminOverview(period);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium">Overview</h1>
        <PeriodPills value={period} onChange={setPeriod} />
      </header>

      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      {isError && <p className="text-sm text-destructive">{(error as Error)?.message}</p>}

      {data && (
        <>
          <Section title="Usuarios">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Total" value={data.users.total.toLocaleString()} />
              <Stat label="Hoy" value={data.users.today} />
              <Stat label="Últimos 7 días" value={data.users.last7d} />
              <Stat label="Últimos 30 días" value={data.users.last30d} />
              <Stat label="Cuentas negocio" value={data.users.businesses} />
            </div>
          </Section>

          <Section title="Ingresos del periodo">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Volumen bruto (ventas)" value={bs(data.sales.gross)} />
              <Stat label="Comisión Zentro (6%)" value={bs(data.sales.commission)} />
              <Stat label="Órdenes confirmadas" value={data.sales.orders} />
              <Stat
                label="Suscripciones (100%)"
                value={bs(data.sales.subscriptionRevenue)}
                hint={`${data.sales.subscriptionPayments} pagos`}
              />
              <Stat
                label="Ingreso total Zentro"
                value={bs(data.sales.totalRevenue)}
                hint="Comisión + suscripciones"
              />
            </div>
            <div className="rounded-2xl border border-border p-4 h-64">
              {data.trend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trend} margin={{ left: -14, right: 8, top: 8 }}>
                    <CartesianGrid strokeOpacity={0.12} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number, k) => [bs(v), k === "gross" ? "Bruto" : "Comisión"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="gross"
                      stroke="hsl(var(--foreground))"
                      fill="hsl(var(--foreground))"
                      fillOpacity={0.08}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="commission"
                      stroke="hsl(var(--muted-foreground))"
                      fill="transparent"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Sin ventas en este periodo.</p>
              )}
            </div>
          </Section>

          <Section title="Contenido creado">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Eventos" value={data.content.events} />
              <Stat label="Posts" value={data.content.posts} />
              <Stat label="Experiencias" value={data.content.experiences} />
            </div>
          </Section>

          <Section title="Engagement">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Likes" value={data.engagement.likes} />
              <Stat label="Comentarios" value={data.engagement.comments} />
              <Stat label="Guardados" value={data.engagement.saves} />
              <Stat label="Reservas" value={data.engagement.reservations} />
              <Stat label="Experiencias reservadas" value={data.engagement.bookings} />
            </div>
          </Section>
        </>
      )}
    </div>
  );
};

export default AdminOverview;
