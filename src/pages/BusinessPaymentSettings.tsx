import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { ArrowLeft, CreditCard, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSwipeBack } from "@/hooks/useSwipeBack";

type Bank = { id: number; name: string };
type Beneficiary = {
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

const BusinessPaymentSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  useSwipeBack();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [existing, setExisting] = useState<Beneficiary | null>(null);
  const [editing, setEditing] = useState(false);

  // Form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [ci, setCi] = useState("");
  const [email, setEmail] = useState("");
  const [bankId, setBankId] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<"Caja de Ahorro" | "Cuenta corriente">("Caja de Ahorro");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [benefRes, banksRes] = await Promise.all([
        supabase
          .from("qhantuy_beneficiaries")
          .select("beneficiary_code, first_name, last_name, ci_number, email, bank_id, bank_name, account_number, account_type")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.functions.invoke("qhantuy-list-banks"),
      ]);
      if (benefRes.data) {
        const b = benefRes.data as Beneficiary;
        setExisting(b);
        setFirstName(b.first_name);
        setLastName(b.last_name);
        setCi(b.ci_number);
        setEmail(b.email);
        setBankId(String(b.bank_id));
        setAccountNumber(b.account_number);
        setAccountType((b.account_type.toLowerCase().includes("corriente") ? "Cuenta corriente" : "Caja de Ahorro"));
      } else if (user.email) {
        setEmail(user.email);
      }
      const list = (banksRes.data as any)?.banks ?? [];
      const normalized: Bank[] = list.map((row: any) => ({
        id: Number(row.id ?? row.bank_id ?? row.code),
        name: String(row.name ?? row.bank_name ?? row.description ?? `Banco ${row.id ?? ""}`),
      })).filter((b: Bank) => Number.isFinite(b.id));
      setBanks(normalized);
      setLoading(false);
    })();
  }, [user]);

  const canSave = firstName.trim() && lastName.trim() && ci.trim() && email.trim() && bankId && accountNumber.trim();

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
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Error");
      }
      toast.success(existing ? "Cuenta actualizada" : "Cuenta bancaria configurada");
      setEditing(false);
      // Refresh
      const { data: fresh } = await supabase
        .from("qhantuy_beneficiaries")
        .select("beneficiary_code, first_name, last_name, ci_number, email, bank_id, bank_name, account_number, account_type")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (fresh) setExisting(fresh as Beneficiary);
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar tu cuenta bancaria de Zentro? Ya no podrás recibir pagos por tickets.")) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("qhantuy-delete-beneficiary");
      if (error) throw error;
      setExisting(null);
      setFirstName(""); setLastName(""); setCi("");
      setBankId(""); setAccountNumber(""); setAccountType("Ahorros");
      setEditing(false);
      toast.success("Cuenta eliminada");
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  const showForm = !existing || editing;
  const last4 = existing ? existing.account_number.slice(-4) : "";

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-brand text-xl font-bold text-foreground">Pagos</h1>
          </div>
          {existing && !editing && (
            <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Configurado
            </span>
          )}
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 py-4 px-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-sm">Depósitos automáticos al día siguiente</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Los pagos por tickets vendidos en Zentro se depositan automáticamente en tu cuenta bancaria vía Qhantuy al día hábil siguiente.
            </p>
          </div>
        </m.div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : existing && !editing ? (
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
              <p className="text-foreground font-medium">{existing.first_name} {existing.last_name}</p>
              <p className="text-muted-foreground">{existing.bank_name || `Banco #${existing.bank_id}`} · {existing.account_type}</p>
              <p className="text-muted-foreground text-xs">{existing.email}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="hero" size="sm" className="flex-1" onClick={() => setEditing(true)}>Editar</Button>
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            </div>
          </m.div>
        ) : null}

        {showForm && !loading && (
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
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Juan" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Apellido</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Pérez" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CI (Carnet de Identidad)</Label>
              <Input value={ci} onChange={(e) => setCi(e.target.value)} placeholder="1234567" inputMode="numeric" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="tu@email.com" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Banco</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger>
                  <SelectValue placeholder={banks.length ? "Selecciona tu banco" : "Cargando bancos..."} />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Número de cuenta</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo de cuenta</Label>
                <Select value={accountType} onValueChange={(v) => setAccountType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ahorros">Ahorros</SelectItem>
                    <SelectItem value="Corriente">Corriente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="hero" size="sm" className="flex-1" onClick={handleSave} disabled={saving || !canSave}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : existing ? "Guardar cambios" : "Configurar cuenta"}
              </Button>
              {existing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
              )}
            </div>
          </m.div>
        )}

        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-xl bg-muted/50 border border-border"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            🔒 Tus datos bancarios se envían de forma segura a Qhantuy, nuestro procesador de pagos. Zentro no retiene tu dinero: cada venta se deposita directamente en tu cuenta.
          </p>
        </m.div>
      </div>
    </div>
  );
};

export default BusinessPaymentSettings;
