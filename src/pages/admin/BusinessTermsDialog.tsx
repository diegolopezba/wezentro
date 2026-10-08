import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminBusinessUpdate, type AdminBusiness } from "@/hooks/useAdminApi";

type Tier = "keep" | "free" | "basico" | "profesional" | "elite";
const TIERS: { v: Tier; l: string }[] = [
  { v: "keep", l: "Sin cambios" },
  { v: "free", l: "Gratis" },
  { v: "basico", l: "Básico" },
  { v: "profesional", l: "Profesional" },
  { v: "elite", l: "Elite" },
];

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-full text-sm border whitespace-nowrap",
      active ? "bg-foreground text-background border-transparent" : "border-border text-muted-foreground",
    )}
  >
    {children}
  </button>
);

export const BusinessTermsDialog = ({ business, onClose }: { business: AdminBusiness | null; onClose: () => void }) => {
  const update = useAdminBusinessUpdate();
  const [tier, setTier] = useState<Tier>("keep");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [days, setDays] = useState("30");
  const [feePct, setFeePct] = useState("");
  const [paidBy, setPaidBy] = useState<"organizer" | "buyer">("organizer");

  useEffect(() => {
    if (!business) return;
    setTier("keep");
    setInterval("month");
    setDays("30");
    setFeePct(business.feeBps != null ? String(business.feeBps / 100) : "");
    setPaidBy(business.feePaidBy ?? "organizer");
  }, [business]);

  if (!business) return null;
  const pct = feePct.trim() === "" ? 6 : Number(feePct);
  const sample = 100;
  const fee = Math.round(sample * pct) / 100;

  const save = async () => {
    const bps = feePct.trim() === "" ? null : Math.round(Number(feePct) * 100);
    if (bps !== null && (!Number.isFinite(bps) || bps < 0 || bps > 3000)) {
      toast.error("La comisión debe estar entre 0% y 30%");
      return;
    }
    try {
      await update.mutateAsync({
        businessId: business.id,
        plan: tier === "keep" ? undefined : { tier, interval, days: Number(days) || 30 },
        fee: { bps, paidBy },
      });
      toast.success("Condiciones guardadas");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={!!business} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{business.name ?? business.username}</DialogTitle>
        </DialogHeader>

        <section className="space-y-2">
          <p className="text-sm font-medium">Plan</p>
          <p className="text-xs text-muted-foreground">
            Actual: {business.planLabel}
            {business.periodEnd && ` · vence ${new Date(business.periodEnd).toLocaleDateString("es-BO")}`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TIERS.map((t) => (
              <Pill key={t.v} active={tier === t.v} onClick={() => setTier(t.v)}>{t.l}</Pill>
            ))}
          </div>
          {tier !== "keep" && tier !== "free" && (
            <div className="flex items-center gap-2 pt-1">
              <Pill active={interval === "month"} onClick={() => { setInterval("month"); setDays("30"); }}>Mensual</Pill>
              <Pill active={interval === "year"} onClick={() => { setInterval("year"); setDays("365"); }}>Anual</Pill>
              <Input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className="w-20" />
              <span className="text-xs text-muted-foreground">días desde hoy</span>
            </div>
          )}
        </section>

        <section className="space-y-2 pt-2">
          <p className="text-sm font-medium">Comisión Zentro</p>
          <div className="flex items-center gap-2">
            <Input value={feePct} onChange={(e) => setFeePct(e.target.value)} placeholder="6" inputMode="decimal" className="w-24" />
            <span className="text-sm text-muted-foreground">% (vacío = 6% estándar)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill active={paidBy === "organizer"} onClick={() => setPaidBy("organizer")}>Descontar al organizador</Pill>
            <Pill active={paidBy === "buyer"} onClick={() => setPaidBy("buyer")}>Recargar al comprador</Pill>
          </div>
          <p className="text-xs text-muted-foreground">
            Entrada de Bs. {sample}:{" "}
            {paidBy === "organizer"
              ? `comprador paga Bs. ${sample}, organizador recibe Bs. ${(sample - fee).toFixed(2)}`
              : `comprador paga Bs. ${(sample + fee).toFixed(2)}, organizador recibe Bs. ${sample}`}
            {" "}(+ comisión bancaria). Solo aplica a compras nuevas.
          </p>
        </section>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full" onClick={save} disabled={update.isPending}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
