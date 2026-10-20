import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { billingSchema, emptyBilling, type BillingDetails } from "@/lib/billing";

export function BillingForm({ initial, onSave, submitLabel = "Guardar datos" }: {
  initial?: BillingDetails | null;
  onSave: (value: BillingDetails) => Promise<void>;
  submitLabel?: string;
}) {
  const [value, setValue] = useState<BillingDetails>(initial ?? emptyBilling);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValue(initial ?? emptyBilling); }, [initial]);
  const field = (name: keyof BillingDetails, text: string) => {
    setValue((v) => ({ ...v, [name]: text }));
    setErrors((e) => ({ ...e, [name]: "", form: "" }));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = billingSchema.safeParse(value);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])));
      return;
    }
    setSaving(true);
    try { await onSave(parsed.data); }
    catch (error) { setErrors({ form: error instanceof Error ? error.message : "No pudimos guardar tus datos" }); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
      <div data-vaul-no-drag className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-5 px-5 py-5">
        <div className="space-y-2">
          <label htmlFor="billing-legal-name" className="text-sm font-medium">Nombre completo / Razón social</label>
          <Input id="billing-legal-name" autoComplete="off" value={value.legal_name} onChange={(e) => field("legal_name", e.target.value)} placeholder="Tal como aparece en tu C.I. o NIT" maxLength={200} aria-invalid={!!errors.legal_name} />
          <p className="text-xs text-muted-foreground">Incluye todos tus nombres y apellidos, o la razón social registrada.</p>
          {errors.legal_name && <p role="alert" className="text-xs text-destructive">{errors.legal_name}</p>}
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium mb-2">Documento</legend>
          <div className="flex gap-2">
            {(["CI", "NIT"] as const).map((type) => <Button key={type} type="button" variant={value.document_type === type ? "save" : "outline"} aria-pressed={value.document_type === type} onClick={() => field("document_type", type)}>{type === "CI" ? "C.I." : type}</Button>)}
          </div>
          <label htmlFor="billing-number" className="sr-only">Número de NIT o C.I.</label>
          <Input id="billing-number" inputMode={value.document_type === "NIT" ? "numeric" : "text"} autoComplete="off" value={value.document_number} onChange={(e) => field("document_number", e.target.value)} placeholder={value.document_type === "CI" ? "Número de C.I. (ej. 1234567 o 1234567-1A)" : "Número de NIT"} maxLength={25} aria-invalid={!!errors.document_number} />
          {errors.document_number && <p role="alert" className="text-xs text-destructive">{errors.document_number}</p>}
        </fieldset>
        <div className="space-y-2">
          <label htmlFor="billing-phone" className="text-sm font-medium">Teléfono</label>
          <Input id="billing-phone" type="tel" autoComplete="tel" value={value.phone} onChange={(e) => field("phone", e.target.value)} placeholder="Número de teléfono" maxLength={25} aria-invalid={!!errors.phone} />
          {errors.phone && <p role="alert" className="text-xs text-destructive">{errors.phone}</p>}
        </div>
        <p className="text-xs text-muted-foreground">Guardaremos estos datos para tus próximas compras. No aparecen en tu perfil público y se compartirán con el organizador para facturación.</p>
        {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
      </div>
      <div className="shrink-0 border-t border-border px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button type="submit" variant="save" className="w-full h-12" disabled={saving}>{saving ? <><Loader2 className="animate-spin" />Guardando…</> : submitLabel}</Button>
      </div>
    </form>
  );
}