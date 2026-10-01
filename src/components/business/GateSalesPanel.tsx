import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, Printer, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GateSalesPanel({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const client = useQueryClient();
  const [name, setName] = useState("General");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const url = `https://zentro.today/gate/${eventId}`;
  const key = ["gate-offers", eventId];
  const { data: offers = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("gate_offers").select("id, name, price, is_active").eq("event_id", eventId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const { data: sales } = useQuery({
    queryKey: ["gate-sales", eventId],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gate_sales_summary", { _event_id: eventId });
      if (error) throw error;
      return { count: Number(data?.[0]?.tickets ?? 0), amount: Number(data?.[0]?.revenue ?? 0) };
    },
  });
  const refresh = () => void client.invalidateQueries({ queryKey: key });
  const add = async () => {
    const value = Number(price);
    if (!name.trim() || name.trim().length > 80 || !Number.isFinite(value) || value <= 0 || value > 100000) return toast.error("Ingresá un nombre y precio válidos");
    setSaving(true);
    const { error } = await supabase.from("gate_offers").insert({ event_id: eventId, name: name.trim(), price: value });
    setSaving(false);
    if (error) toast.error("No se pudo guardar el precio");
    else { setPrice(""); refresh(); toast.success("Precio agregado"); }
  };
  const update = async (id: string, changes: { price?: number; is_active?: boolean }) => {
    const { error } = await supabase.from("gate_offers").update(changes).eq("id", id).eq("event_id", eventId);
    if (error) toast.error("No se pudo actualizar"); else refresh();
  };
  return <div className="space-y-5 pb-8">
    <div><h2 className="font-semibold">Boletería en puerta</h2><p className="text-xs text-muted-foreground mt-1">Un QR permanente. Tus clientes compran sin crear una cuenta; el precio se actualiza sin reimprimir.</p></div>
    <p className="text-sm font-medium">Vendidas en puerta: {sales?.count ?? 0} · Bs. {(sales?.amount ?? 0).toFixed(2)}</p>
    {isLoading ? <p>Cargando precios…</p> : offers.map(offer => <div key={offer.id} className="p-3 border border-border rounded-xl flex items-center gap-2 flex-wrap">
      <span className="text-sm font-semibold flex-1 min-w-20">{offer.name}</span>
      <span className="text-sm">Bs.</span>
       <Input aria-label={`Precio de ${offer.name}`} type="number" min="0.01" max="100000" step="0.01" defaultValue={offer.price} key={`${offer.id}-${offer.price}`} className="w-24 h-9" onBlur={e => { const value = Number(e.target.value); if (Number.isFinite(value) && value > 0 && value <= 100000 && value !== Number(offer.price)) void update(offer.id, { price: value }); }} />
      <Button variant="outline" size="sm" onClick={() => void update(offer.id, { is_active: !offer.is_active })}>{offer.is_active ? "Activo" : "Pausado"}</Button>
      <Button variant="ghost" size="icon" aria-label={`Eliminar ${offer.name}`} onClick={async () => { if (!window.confirm(`¿Eliminar ${offer.name}?`)) return; const { error } = await supabase.from("gate_offers").delete().eq("id", offer.id).eq("event_id", eventId); if (error) toast.error("No se pudo eliminar"); else refresh(); }}><Trash2 className="w-4 h-4" /></Button>
    </div>)}
    <div className="flex gap-2"><Input placeholder="Tipo de entrada" maxLength={80} value={name} onChange={e => setName(e.target.value)} /><Input className="w-28" aria-label="Nuevo precio" type="number" min="0.01" step="0.01" placeholder="Bs." value={price} onChange={e => setPrice(e.target.value)} /><Button onClick={add} disabled={saving} size="icon" aria-label="Agregar precio"><Plus className="w-4 h-4" /></Button></div>
    <div className="light-surface border border-border rounded-md p-5 text-center bg-background text-foreground print:border-0" id="gate-poster">
      <div className="text-lg font-bold">zentro<span className="text-brand-red"></span></div>
      <h3 className="text-xl font-bold mt-3">{eventTitle}</h3>
      <p className="text-sm my-3">Escaneá con tu cámara para comprar tu entrada</p>
      <QRCodeSVG value={url} size={208} className="mx-auto" />
      <p className="text-xs mt-3 break-all">{url}</p>
    </div>
    <div className="flex gap-2 print:hidden"><Button variant="outline" className="flex-1 gap-2" onClick={() => { navigator.clipboard.writeText(url).then(() => toast.success("Link copiado")); }}><Copy className="w-4 h-4" />Copiar link</Button><Button variant="outline" className="flex-1 gap-2" onClick={() => { const markup = document.getElementById("gate-poster")?.outerHTML || ""; const win = window.open("", "_blank"); if (!win) return toast.error("Permití las ventanas emergentes para imprimir"); win.document.write(`<html><head><title>QR de puerta</title><style>body{font-family:Arial;text-align:center;padding:40px}svg{width:280px;height:280px}h3{font-size:28px}</style></head><body>${markup}</body></html>`); win.document.close(); win.onload = () => win.print(); }}><Printer className="w-4 h-4" />Imprimir</Button></div>
  </div>;
}
