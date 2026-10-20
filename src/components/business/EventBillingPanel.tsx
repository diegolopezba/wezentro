import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { downloadXlsx } from "@/lib/inviteImport";
import * as XLSX from "xlsx";

export function EventBillingPanel({ eventId }: { eventId: string }) {
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["event-billing-export", eventId],
    queryFn: async () => { const { data, error } = await supabase.rpc("get_event_billing_export", { _event_id: eventId }); if (error) throw error; return data; },
  });
  const exportRows = () => {
    const rows = data.map((r) => ({ "Orden": r.order_id, "Fecha de compra": new Date(r.purchased_at).toLocaleString("es-BO"), Comprador: r.buyer_name || "", Entrada: r.tier_name, Cantidad: r.quantity, "Subtotal (Bs.)": r.subtotal, "Total pagado (Bs.)": r.amount, "Nombre legal / Razón social": r.legal_name || "", Documento: r.document_type || "", "NIT / CI": r.document_number || "", Teléfono: r.phone || "", Estado: r.legal_name ? "Completo" : "Pendiente" }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Facturación");
    downloadXlsx(`facturacion-${eventId}.xlsx`, XLSX.write(wb, { bookType: "xlsx", type: "array" }));
  };
  if (isLoading) return <Loader2 className="mx-auto my-10 animate-spin" />;
  if (isError) return <div className="space-y-3 text-center py-8"><p>No pudimos cargar los datos.</p><Button onClick={() => refetch()}>Reintentar</Button></div>;
  const complete = data.filter((r) => r.legal_name).length;
  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-brand text-lg">Datos de facturación</h2><p className="text-xs text-muted-foreground">{complete} completas · {data.length - complete} pendientes</p></div>
      <Button variant="outline" disabled={!data.length} onClick={exportRows}><Download />Excel</Button>
    </div>
    {!data.length ? <p className="text-sm text-muted-foreground text-center py-8">Todavía no hay compras confirmadas.</p> : <div className="divide-y divide-border">{data.map((r) => <div key={r.order_id} className="py-3 space-y-1">
      <p className="text-sm font-medium break-words">{r.legal_name || r.buyer_name || "Comprador"}</p>
      <p className="text-xs text-muted-foreground break-words">{r.quantity} × {r.tier_name}</p>
      {r.legal_name ? <p className="text-xs break-words">{r.document_type === "CI" ? "C.I." : "NIT"} {r.document_number} · {r.phone}</p> : <p className="text-xs text-muted-foreground">Datos fiscales pendientes</p>}
    </div>)}</div>}
  </section>;
}