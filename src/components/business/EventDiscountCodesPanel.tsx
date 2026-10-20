import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, TicketPercent, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTicketTiers } from "@/hooks/useTicketTiers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/bottom-sheet";
import { formatBs } from "@/components/sales/salesUtils";

interface Code {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  tier_ids: string[];
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

const pill = (on: boolean) =>
  `shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border"}`;

export const EventDiscountCodesPanel = ({ eventId }: { eventId: string }) => {
  const qc = useQueryClient();
  const { data: tiers = [] } = useTicketTiers(eventId);
  const [open, setOpen] = useState(false);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["discount-codes", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_discount_codes" as never).select("*").eq("event_id", eventId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Code[];
    },
  });
  const { data: usage = [] } = useQuery({
    queryKey: ["discount-code-usage", eventId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_event_discount_code_usage" as never, { _event_id: eventId } as never);
      return (data ?? []) as any[];
    },
  });
  const usageOf = (id: string) => usage.find((u) => u.discount_code_id === id);

  const refresh = () => qc.invalidateQueries({ queryKey: ["discount-codes", eventId] });
  const toggle = useMutation({
    mutationFn: async (c: Code) => {
      const { error } = await supabase.from("event_discount_codes" as never).update({ is_active: !c.is_active } as never).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (c: Code) => {
      const { error } = await supabase.from("event_discount_codes" as never).delete().eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: () => toast.error("Este código ya tiene compras; desactivalo en vez de borrarlo"),
  });

  const tierName = (id: string) => tiers.find((t) => t.id === id)?.name ?? "Entrada";

  return (
    <div className="space-y-3">
      <Button className="w-full rounded-full gap-2" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Crear código
      </Button>

      {!isLoading && codes.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-secondary grid place-items-center mx-auto">
            <TicketPercent className="w-6 h-6 text-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Todavía no creaste códigos de descuento.</p>
          <p className="text-xs text-muted-foreground">Cada cuenta puede usar un código una sola vez.</p>
        </div>
      )}

      {codes.map((c) => {
        const u = usageOf(c.id);
        const uses = Number(u?.uses ?? 0);
        return (
          <div key={c.id} className="rounded-2xl bg-card border border-border p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground tracking-wide break-all">{c.code}</p>
                <p className="text-xs text-muted-foreground">
                  {c.discount_type === "percent" ? `${Number(c.discount_value)}% de descuento` : `${formatBs(Number(c.discount_value))} de descuento`}
                </p>
              </div>
              <Switch checked={c.is_active} onCheckedChange={() => toggle.mutate(c)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Usos: <span className="text-foreground font-semibold">{uses}{c.max_uses ? ` / ${c.max_uses}` : " (sin límite)"}</span>
              {u ? ` · Descontado ${formatBs(Number(u.discount_total))}` : ""}
            </p>
            <p className="text-xs text-muted-foreground break-words">
              {c.tier_ids.length ? c.tier_ids.map(tierName).join(" · ") : "Todas las entradas"}
            </p>
            {(c.starts_at || c.ends_at) && (
              <p className="text-xs text-muted-foreground">
                {c.starts_at ? `Desde ${new Date(c.starts_at).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })}` : ""}
                {c.ends_at ? ` Hasta ${new Date(c.ends_at).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })}` : ""}
              </p>
            )}
            {uses === 0 && (
              <button type="button" className="flex items-center gap-1 text-xs text-destructive active:opacity-70" onClick={() => remove.mutate(c)}>
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            )}
          </div>
        );
      })}

      <CreateCodeSheet open={open} onOpenChange={setOpen} eventId={eventId} tiers={tiers} onCreated={refresh} />
    </div>
  );
};

const CreateCodeSheet = ({ open, onOpenChange, eventId, tiers, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; eventId: string; tiers: { id: string; name: string; is_active?: boolean }[]; onCreated: () => void;
}) => {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [tierIds, setTierIds] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const activeTiers = tiers.filter((t) => t.is_active !== false);

  const reset = () => { setCode(""); setType("percent"); setValue(""); setMaxUses(""); setTierIds([]); setStartsAt(""); setEndsAt(""); };

  const save = async () => {
    const v = Number(value);
    const clean = code.replace(/\s+/g, "").toUpperCase();
    if (clean.length < 3) return toast.error("El código debe tener al menos 3 caracteres");
    if (!(v > 0) || (type === "percent" && v > 100)) return toast.error(type === "percent" ? "Ingresá un porcentaje entre 1 y 100" : "Ingresá un monto mayor a 0");
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return toast.error("La fecha de fin debe ser posterior al inicio");
    setSaving(true);
    const { error } = await supabase.from("event_discount_codes" as never).insert({
      event_id: eventId, code: clean, discount_type: type, discount_value: v,
      max_uses: maxUses ? Math.max(1, Math.floor(Number(maxUses))) : null,
      tier_ids: tierIds,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.code === "23505" ? "Ya existe un código con ese nombre" : error.message);
    toast.success("Código creado");
    reset();
    onCreated();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[90dvh] flex flex-col">
        <SheetTitle className="px-5 pt-2">Nuevo código de descuento</SheetTitle>
        <SheetDescription className="px-5 text-xs">Se aplica al subtotal de las entradas; los cargos se calculan después.</SheetDescription>
        <div data-vaul-no-drag className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Código</p>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VERANOWEEK" className="rounded-full uppercase" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Tipo de descuento</p>
            <div className="flex gap-2">
              <button type="button" className={pill(type === "percent")} onClick={() => setType("percent")}>Porcentaje (%)</button>
              <button type="button" className={pill(type === "fixed")} onClick={() => setType("fixed")}>Monto fijo (Bs.)</button>
            </div>
            <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={type === "percent" ? "Ej. 15" : "Ej. 50"} className="rounded-full" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Límite total de usos</p>
            <Input inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))} placeholder="Vacío = sin límite" className="rounded-full" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Aplica a</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={pill(tierIds.length === 0)} onClick={() => setTierIds([])}>Todas las entradas</button>
              {activeTiers.map((t) => {
                const on = tierIds.includes(t.id);
                return (
                  <button key={t.id} type="button" className={`${pill(on)} text-left whitespace-normal break-words`}
                    onClick={() => setTierIds((ids) => (on ? ids.filter((x) => x !== t.id) : [...ids, t.id]))}>
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Válido desde (opcional)</p>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="rounded-full" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Válido hasta (opcional)</p>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="rounded-full" />
            </div>
          </div>
        </div>
        <div className="px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-border">
          <Button className="w-full rounded-full" disabled={saving} onClick={save}>{saving ? "Guardando…" : "Crear código"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
