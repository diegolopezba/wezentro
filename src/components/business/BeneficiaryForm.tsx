import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Bank = { id: number; name: string };

export type Beneficiary = {
  beneficiary_code: string;
  first_name: string;
  last_name: string;
  ci_number: string;
  email: string;
  bank_id: number;
  bank_name: string | null;
  account_number: string;
  account_type: string;
};

interface Props {
  /** Show the "cuenta configurada" summary card with edit/delete. */
  allowManage?: boolean;
  /** Called after a successful save. */
  onSaved?: () => void;
  submitLabel?: string;
}

const parseFnError = async (err: any, fallback: string): Promise<string> => {
  try {
    const body = await err?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch {
    /* ignore */
  }
  try {
    const txt = await err?.context?.text?.();
    if (txt) {
      try {
        const j = JSON.parse(txt);
        if (j?.error) return String(j.error);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return err?.message && err.message !== "Edge Function returned a non-2xx status code"
    ? err.message
    : fallback;
};

/**
 * Qhantuy bank-account (beneficiary) form. Shared by the business payment
 * settings page and the business onboarding wizard.
 */
export const BeneficiaryForm = ({ allowManage = true, onSaved, submitLabel }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [existing, setExisting] = useState<Beneficiary | null>(null);
  const [editing, setEditing] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [ci, setCi] = useState("");
  const [email, setEmail] = useState("");
  const [bankId, setBankId] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<"Caja de Ahorro" | "Cuenta corriente">(
    "Caja de Ahorro",
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [benefRes, banksRes] = await Promise.all([
        supabase
          .from("qhantuy_beneficiaries")
          .select(
            "beneficiary_code, first_name, last_name, ci_number, email, bank_id, bank_name, account_number, account_type",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.functions.invoke("qhantuy-list-banks"),
      ]);
      if (cancelled) return;
      if (benefRes.data) {
        const b = benefRes.data as Beneficiary;
        setExisting(b);
        setFirstName(b.first_name);
        setLastName(b.last_name);
        setCi(b.ci_number);
        setEmail(b.email);
        setBankId(String(b.bank_id));
        setAccountNumber(b.account_number);
        setAccountType(
          b.account_type.toLowerCase().includes("corriente") ? "Cuenta corriente" : "Caja de Ahorro",
        );
      } else if (user.email) {
        setEmail(user.email);
      }
      const list = (banksRes.data as any)?.banks ?? [];
      const normalized: Bank[] = list
        .map((row: any) => ({
          id: Number(row.id ?? row.bank_id ?? row.code),
          name: String(row.name ?? row.bank_name ?? row.description ?? `Banco ${row.id ?? ""}`),
        }))
        .filter((b: Bank) => Number.isFinite(b.id));
      setBanks(normalized);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const canSave =
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!ci.trim() &&
    !!email.trim() &&
    !!bankId &&
    !!accountNumber.trim();

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const bankName = banks.find((b) => String(b.id) === bankId)?.name ?? null;
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ci_number: ci.trim(),
        email: email.trim(),
        bank_id: Number(bankId),
        bank_name: bankName,
        account_number: accountNumber.trim(),
        account_type: accountType,
      };
      const fn = existing ? "qhantuy-edit-beneficiary" : "qhantuy-register-beneficiary";
      const { data, error } = await supabase.functions.invoke(fn, { body: payload });
      if (error) throw new Error(await parseFnError(error, "Error al guardar"));
      if ((data as any)?.error) throw new Error((data as any).error);

      if ((data as any)?.recovered) {
        toast.success("Cuenta bancaria vinculada correctamente");
      } else {
        toast.success(existing ? "Cuenta actualizada" : "Cuenta bancaria configurada");
      }
      setEditing(false);
      const { data: fresh } = await supabase
        .from("qhantuy_beneficiaries")
        .select(
          "beneficiary_code, first_name, last_name, ci_number, email, bank_id, bank_name, account_number, account_type",
        )
        .eq("user_id", user!.id)
        .maybeSingle();
      if (fresh) setExisting(fresh as Beneficiary);
      queryClient.invalidateQueries({ queryKey: ["qhantuy-beneficiary", user?.id] });
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar tu cuenta bancaria de Zentro? Ya no podrás recibir pagos por tickets."))
      return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("qhantuy-delete-beneficiary");
      if (error) throw new Error(await parseFnError(error, "Error al eliminar"));
      setExisting(null);
      setFirstName("");
      setLastName("");
      setCi("");
      setBankId("");
      setAccountNumber("");
      setAccountType("Caja de Ahorro");
      setEditing(false);
      toast.success("Cuenta eliminada");
      queryClient.invalidateQueries({ queryKey: ["qhantuy-beneficiary", user?.id] });
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showSummary = !!existing && !editing && allowManage;
  const showForm = !existing || editing || !allowManage;
  const last4 = existing ? existing.account_number.slice(-4) : "";

  return (
    <div className="space-y-4">
      {showSummary && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-4 px-4 rounded-xl bg-card border border-border space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Cuenta configurada</h2>
            <span className="text-xs text-muted-foreground">•••• {last4}</span>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-foreground font-medium">
              {existing!.first_name} {existing!.last_name}
            </p>
            <p className="text-muted-foreground">
              {existing!.bank_name || `Banco #${existing!.bank_id}`} · {existing!.account_type}
            </p>
            <p className="text-muted-foreground text-xs">{existing!.email}</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="sheet-action"
              size="sm"
              className="flex-1"
              onClick={() => setEditing(true)}
            >
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </m.div>
      )}

      {showForm && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-4 px-4 rounded-xl bg-card border border-border space-y-4"
        >
          <h2 className="text-sm font-semibold text-foreground">
            {existing ? "Editar cuenta bancaria" : "Configura tu cuenta bancaria"}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Apellido</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Pérez"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">CI (Carnet de Identidad)</Label>
            <Input
              value={ci}
              onChange={(e) => setCi(e.target.value)}
              placeholder="1234567"
              inputMode="numeric"
            />
            <p className="text-[11px] text-muted-foreground">
              Debe ser el CI del titular de la cuenta bancaria.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Banco</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger>
                <SelectValue placeholder={banks.length ? "Selecciona tu banco" : "Cargando bancos..."} />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Número de cuenta</Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo de cuenta</Label>
              <Select value={accountType} onValueChange={(v) => setAccountType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Caja de Ahorro">Caja de Ahorro</SelectItem>
                  <SelectItem value="Cuenta corriente">Cuenta corriente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="sheet-action"
              size="sm"
              className="flex-1"
              onClick={handleSave}
              disabled={saving || !canSave}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                submitLabel ?? (existing ? "Guardar cambios" : "Configurar cuenta")
              )}
            </Button>
            {existing && allowManage && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </Button>
            )}
          </div>
        </m.div>
      )}
    </div>
  );
};
