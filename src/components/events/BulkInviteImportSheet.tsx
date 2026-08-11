import { useRef, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  parseGuestFile,
  buildInvitesCsv,
  buildInvitesXlsx,
  downloadCsv,
  downloadXlsx,
  type ParseResult,
} from "@/lib/inviteImport";
import {
  useBulkCreateSpecialInvites,
  useSendSpecialInviteEmails,
  useEventSpecialInvites,
  getSpecialInviteUrl,
} from "@/hooks/useSpecialInvites";

interface BulkInviteImportSheetProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "upload" | "preview" | "creating" | "done";

/** Owner tool: import a CSV/XLSX guest list and generate one invite link per guest. */
export function BulkInviteImportSheet({ eventId, open, onOpenChange }: BulkInviteImportSheetProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [segment, setSegment] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ batchId: string; created: number; skipped: number } | null>(null);
  const [parsing, setParsing] = useState(false);

  const bulkCreate = useBulkCreateSpecialInvites();
  const sendEmails = useSendSpecialInviteEmails();
  const { data: invites = [], refetch } = useEventSpecialInvites(eventId, open);

  const reset = () => {
    setStep("upload");
    setParsed(null);
    setFileName("");
    setSegment("");
    setProgress(0);
    setResult(null);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const res = await parseGuestFile(file);
      setFileName(file.name);
      setParsed(res);
      setStep("preview");
      if (res.guests.length === 0) {
        toast.error("No encontramos invitados válidos en el archivo");
      }
    } catch {
      toast.error("No pudimos leer el archivo. Usá .csv o .xlsx");
    } finally {
      setParsing(false);
    }
  };

  const handleCreate = async () => {
    if (!parsed?.guests.length) return;
    setStep("creating");
    try {
      const res = await bulkCreate.mutateAsync({
        eventId,
        segment: segment.trim() || null,
        guests: parsed.guests,
        onProgress: (done, total) => setProgress(Math.round((done / total) * 100)),
      });
      setResult(res);
      setStep("done");
      await refetch();
      toast.success(`${res.created} invitaciones creadas`);
    } catch (e) {
      setStep("preview");
      toast.error(e instanceof Error ? e.message : "No se pudieron crear las invitaciones");
    }
  };

  const handleSend = async () => {
    if (!result) return;
    try {
      const res = await sendEmails.mutateAsync({ eventId, batchId: result.batchId });
      toast.success(`${res.sent} correos enviados${res.failed ? `, ${res.failed} fallaron` : ""}`);
    } catch {
      toast.error("No se pudieron enviar los correos");
    }
  };

  const handleExport = () => {
    if (!result) return;
    const rows = invites
      .filter((i) => i.batch_id === result.batchId)
      .map((i) => ({
        guest_name: i.guest_name,
        guest_email: i.guest_email,
        segment: i.segment,
        url: getSpecialInviteUrl(i.token),
        status: i.status,
      }));
    downloadCsv(`invitaciones-${segment.trim() || "lista"}.csv`, buildInvitesCsv(rows));
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTimeout(reset, 300);
      }}
    >
      <DrawerContent className="light-sheet max-h-[92vh]">
        <div className="px-5 pb-8 pt-2 overflow-y-auto space-y-5">
          <div>
            <p className="text-xs text-muted-foreground">Invitaciones masivas</p>
            <h2 className="text-xl font-bold text-foreground">Importar lista</h2>
          </div>

          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Subí un archivo .csv o .xlsx con las columnas <b>nombre</b> y <b>email</b>. Creamos un
                enlace único para cada invitado.
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-border py-10 flex flex-col items-center gap-2 active:opacity-70"
              >
                {parsing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">Elegir archivo</span>
                <span className="text-xs text-muted-foreground">CSV o Excel · hasta 2.000 filas</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {step === "preview" && parsed && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
                </div>
                <p className="text-sm text-foreground">
                  {parsed.guests.length} invitados válidos de {parsed.totalRows} filas
                </p>
                {parsed.duplicatesInFile > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {parsed.duplicatesInFile} duplicados omitidos
                  </p>
                )}
                {parsed.invalidRows.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                    <span>
                      {parsed.invalidRows.length} filas se ignoran (
                      {parsed.invalidRows.slice(0, 2).map((r) => `fila ${r.row}: ${r.reason}`).join(", ")}
                      {parsed.invalidRows.length > 2 ? "…" : ""})
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="segment">Nombre del grupo (opcional)</Label>
                <Input
                  id="segment"
                  placeholder="VIP, Prensa, Staff…"
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  maxLength={30}
                />
                <p className="text-xs text-muted-foreground">
                  Se muestra en su entrada como "Invitado especial - {segment.trim() || "VIP"}".
                </p>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-2xl border border-border divide-y divide-border">
                {parsed.guests.slice(0, 30).map((g) => (
                  <div key={g.email} className="px-4 py-2">
                    <p className="text-sm text-foreground truncate">{g.name || "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground truncate">{g.email}</p>
                  </div>
                ))}
                {parsed.guests.length > 30 && (
                  <p className="px-4 py-2 text-xs text-muted-foreground">
                    +{parsed.guests.length - 30} más
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={reset}>
                  Cambiar archivo
                </Button>
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={parsed.guests.length === 0}
                >
                  Crear {parsed.guests.length} invitaciones
                </Button>
              </div>
            </div>
          )}

          {step === "creating" && (
            <div className="py-8 space-y-4 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Creando invitaciones…</p>
              <Progress value={progress} />
            </div>
          )}

          {step === "done" && result && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {result.created} invitaciones creadas
                  </p>
                  {result.skipped > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {result.skipped} ya existían y se omitieron
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant="hero"
                className="w-full"
                onClick={handleSend}
                disabled={sendEmails.isPending}
              >
                {sendEmails.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" /> Enviar invitaciones por email
                  </>
                )}
              </Button>

              <Button variant="secondary" className="w-full" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" /> Descargar enlaces (CSV)
              </Button>

              <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                Listo
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
