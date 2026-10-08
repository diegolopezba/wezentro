import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Minus, Plus, Ticket, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";

type Offer = { id: string; name: string; price: number };
type Catalog = { event: { title: string; imageUrl: string | null; startAt: string | null }; offers: Offer[]; closed: boolean; gatewayFeeBps: number; feeTerms?: { bps?: number | null; paidBy?: string | null } };
type TicketResult = { token: string; used: boolean; index: number; name: string; sessionId: string };
type Purchase = { sessionId: string; accessToken: string; qrImageUrl: string; amount: number; baseAmount: number; gatewayFee: number; eventId: string };
const storageKey = (id: string) => `zentro:gate-purchase:${id}`;
const bs = (value: number) => `Bs. ${value.toFixed(2)}`;
const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function gateRequest<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gate-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "No se pudo conectar");
  return data as T;
}

export default function GatePurchase() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [offerId, setOfferId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState("pending");
  const [tickets, setTickets] = useState<TicketResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center", watchDrag: tickets.length > 1 });
  useEffect(() => {
    if (!emblaApi) return;
    const update = () => setActiveIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", update);
    update();
    return () => { emblaApi.off("select", update); };
  }, [emblaApi]);
  const showingTickets = searchParams.get("view") === "tickets";
  const purchase = purchases.find(item => item.sessionId === activeSessionId);

  useEffect(() => {
    if (!isUuid(eventId)) return;
    gateRequest<Catalog>({ action: "catalog", eventId }).then((data) => {
      setCatalog(data);
      setOfferId(data.offers[0]?.id || "");
    }).catch((e) => setError(e.message));
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(eventId)) || "null") as Purchase[] | Purchase | null;
      const valid = (Array.isArray(saved) ? saved : saved ? [saved] : []).filter(item => item?.eventId === eventId && isUuid(item.sessionId) && isUuid(item.accessToken));
      setPurchases(valid);
      setActiveSessionId(valid[valid.length - 1]?.sessionId ?? null);
    } catch { /* malformed prior session */ }
  }, [eventId]);

  const refresh = useCallback(async () => {
    if (!isUuid(eventId) || !purchases.length) return;
    try {
      const results = await Promise.all(purchases.map(async item => ({
        item,
        result: await gateRequest<{ status: string; tickets?: Omit<TicketResult, "sessionId">[] }>({
          action: "status", eventId, sessionId: item.sessionId, accessToken: item.accessToken,
        }),
      })));
      const current = results.find(({ item }) => item.sessionId === activeSessionId);
      if (current) setStatus(current.result.status);
      setTickets(results.flatMap(({ item, result }) => (result.tickets ?? []).map(ticket => ({ ...ticket, sessionId: item.sessionId }))));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo consultar el pago"); }
  }, [eventId, purchases, activeSessionId]);

  useEffect(() => {
    if (!purchases.length) return;
    void refresh();
    const timer = window.setInterval(refresh, 2500);
    return () => window.clearInterval(timer);
  }, [purchases, refresh]);

  const create = async () => {
    if (!isUuid(eventId) || !isUuid(offerId) || busy) return;
    setBusy(true); setError("");
    try {
      const result = await gateRequest<Omit<Purchase, "eventId">>({ action: "create", eventId, offerId, quantity });
      const next = { ...result, eventId };
      const updated = [...purchases, next];
      localStorage.setItem(storageKey(eventId), JSON.stringify(updated));
      setPurchases(updated); setActiveSessionId(next.sessionId); setStatus("pending");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo generar el pago"); }
    finally { setBusy(false); }
  };
  const reset = () => {
    // Keep earlier paid entries accessible when beginning another purchase.
    if (eventId) localStorage.setItem(storageKey(eventId), JSON.stringify(purchases.filter(item => item.sessionId !== activeSessionId)));
    setPurchases(items => items.filter(item => item.sessionId !== activeSessionId));
    setActiveSessionId(null); setStatus("pending"); setSearchParams({}); setError("");
  };
  const buyMore = () => {
    setActiveSessionId(null); setStatus("pending"); setQuantity(1); setSearchParams({}); setError("");
    if (!isUuid(eventId)) return;
    gateRequest<Catalog>({ action: "catalog", eventId }).then(data => {
      setCatalog(data);
      setOfferId(data.offers[0]?.id || "");
    }).catch(e => setError(e instanceof Error ? e.message : "No se pudieron cargar los precios"));
  };
  const selected = catalog?.offers.find(o => o.id === offerId);
  const total = selected ? selected.price * quantity : 0;
  const serviceFee = catalog?.feeTerms?.paidBy === "buyer" ? Math.round(total * ((catalog.feeTerms.bps ?? 600) / 10000) * 100) / 100 : 0;
  const withService = Math.round((total + serviceFee) * 100) / 100;
  const feeRate = (catalog?.gatewayFeeBps ?? 100) / 10000;
  const gatewayFee = feeRate > 0 ? Math.ceil(Number((withService * feeRate / (1 - feeRate) * 100).toFixed(4))) / 100 : 0;
  const amountDue = Math.round((withService + gatewayFee) * 100) / 100;
  const confirmed = status === "confirmed" && tickets.some(ticket => ticket.sessionId === activeSessionId);
  const lastPurchaseHasTickets = tickets.some(ticket => ticket.sessionId === activeSessionId);

  return (
    <main className="light-surface min-h-[100dvh] bg-background text-foreground pb-12">
      <div className="mx-auto max-w-md px-5 pt-8">
        <div className="flex items-center justify-between mb-8">
          <span className="font-brand font-semibold text-xl">zentro<span className="text-brand-red"></span></span>
          <span className="text-xs font-medium text-muted-foreground uppercase">Boletería en puerta</span>
        </div>
        {catalog?.event.imageUrl && <img src={catalog.event.imageUrl} alt="" className="w-full aspect-[16/8] object-cover rounded-md mb-6" />}
        <h1 className="font-brand text-2xl leading-tight mb-2">{catalog?.event.title || "Entradas en puerta"}</h1>
        {catalog?.event.startAt && <p className="text-sm text-muted-foreground mb-8">{new Date(catalog.event.startAt).toLocaleString("es-BO", { dateStyle: "long", timeStyle: "short" })}</p>}

        {showingTickets && (confirmed || tickets.length > 0) ? (
          <section aria-label="Tus entradas">
            <Button variant="ghost" onClick={() => setSearchParams({})} className="mb-5 -ml-3"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button>
            <h2 className="text-xl font-semibold mb-2">Tus entradas</h2>
            <p className="text-sm text-muted-foreground mb-7">Mostrá cada QR al personal de la puerta.</p>
            <div className="overflow-hidden" ref={emblaRef}><div className="flex touch-pan-y">
              {tickets.map((ticket, i) => <div key={`${ticket.sessionId}:${ticket.index}`} className={`min-w-0 flex-[0_0_100%] border-t border-border pt-6 text-center ${ticket.used ? "opacity-40 grayscale" : ""}`}>
                <div className="flex justify-between items-center mb-2 gap-3"><strong className="shrink-0">Entrada {i + 1} de {tickets.length}</strong><span className="text-sm text-muted-foreground shrink-0">{ticket.used ? "Ya fue usada" : "Sin usar"}</span></div>
                <p className="text-sm font-semibold mb-5">{ticket.name || "Entrada"}</p>
                {ticket.token && <QRCodeSVG value={ticket.token} size={220} className="mx-auto max-w-full" />}
                 <p className="text-xs text-muted-foreground mt-4">{catalog?.event.title}</p>
              </div>)}
            </div></div>
             {tickets.length > 1 && <div className="flex items-center justify-center gap-2 mt-7" aria-label="Seleccionar entrada">{tickets.map((ticket, i) => <Button key={`${ticket.sessionId}:${ticket.index}`} variant="ghost" size="icon-sm" aria-label={`Entrada ${i + 1}`} aria-current={i === activeIndex ? "true" : undefined} onClick={() => emblaApi?.scrollTo(i)} className="rounded-full"><span className={`w-2.5 h-2.5 rounded-full ${i === activeIndex ? "bg-foreground" : "bg-muted-foreground/30"}`} /></Button>)}</div>}
             <Button variant="sheet-action" onClick={buyMore} className="w-full rounded-full h-12 mt-8">Comprar más</Button>
          </section>
        ) : confirmed ? (
          <section className="pt-8 text-center">
             <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-6" />
            <h2 className="text-2xl font-semibold">Pago confirmado</h2>
             <p className="text-muted-foreground my-4">{tickets.length} {tickets.length === 1 ? "entrada lista" : "entradas listas"} para ingresar.</p>
             <Button variant="sheet-action" onClick={() => setSearchParams({ view: "tickets" })} className="w-full rounded-full h-12 mt-6">Ver entradas</Button>
             <Button variant="sheet-action" onClick={buyMore} className="w-full rounded-full h-12 mt-3">Comprar más</Button>
          </section>
        ) : purchase && (status === "pending" || (status === "confirmed" && !lastPurchaseHasTickets)) ? (
          <section className="text-center">
            <h2 className="text-lg font-semibold mb-2">Pagá con tu banco</h2>
            <p className="text-sm text-muted-foreground mb-6">Escaneá o guardá este QR bancario para pagar {bs(purchase.amount)}.</p>
            <div className="bg-card border border-border p-5 inline-block rounded-md">
              <img src={purchase.qrImageUrl} alt="QR bancario de pago" className="w-60 h-60 object-contain" />
            </div>
            <p className="text-sm font-semibold mt-6">Total {bs(purchase.amount)}</p>
            <p className="text-xs text-muted-foreground mt-1">Entradas {bs(purchase.baseAmount)} · procesamiento {bs(purchase.gatewayFee)}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-8"><Loader2 className="w-4 h-4 animate-spin" />{status === "confirmed" ? "Preparando tus entradas..." : "Esperando confirmación del pago..."}</div>
            <Button variant="outline" onClick={() => void refresh()} className="mt-5 rounded-full">Comprobar pago</Button>
             {tickets.length > 0 && <Button variant="sheet-action" onClick={() => setSearchParams({ view: "tickets" })} className="w-full rounded-full h-12 mt-5">Ver mis entradas</Button>}
          </section>
        ) : purchase && status !== "pending" ? (
           <section className="text-center pt-10"><h2 className="text-xl font-semibold">El pago no se completó</h2><Button variant="sheet-action" className="mt-6 rounded-full" onClick={reset}>Intentar de nuevo</Button></section>
        ) : catalog ? (
          <section>
             {tickets.length > 0 && <Button variant="sheet-action" onClick={() => setSearchParams({ view: "tickets" })} className="w-full rounded-full h-12 mb-8">Ver mis entradas ({tickets.length})</Button>}
            {catalog.closed || !catalog.offers.length ? <p className="text-muted-foreground">La venta en puerta no está disponible.</p> : <>
              <h2 className="font-semibold mb-3">Elegí tu entrada</h2>
              <div className="space-y-2 mb-8">{catalog.offers.map(offer =>
                <Button key={offer.id} variant="outline" onClick={() => setOfferId(offer.id)} aria-pressed={offerId === offer.id}
                  className={`w-full h-auto min-h-16 rounded-md justify-between text-left px-4 border ${offerId === offer.id ? "border-primary bg-secondary" : "border-border"}`}>
                  <span className="font-medium truncate mr-2">{offer.name}</span><strong>{bs(offer.price)}</strong>
                </Button>)}</div>
              <h2 className="font-semibold mb-3">Cantidad</h2>
              <div className="flex items-center justify-between border-y border-border py-3 mb-8">
                <span className="text-sm text-muted-foreground">Hasta 10 entradas</span>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" className="rounded-full" aria-label="Quitar entrada" disabled={quantity <= 1} onClick={() => setQuantity(q => q - 1)}><Minus className="w-4 h-4" /></Button>
                  <span className="font-semibold w-5 text-center">{quantity}</span>
                  <Button variant="outline" size="icon" className="rounded-full" aria-label="Agregar entrada" disabled={quantity >= 10} onClick={() => setQuantity(q => q + 1)}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex justify-between items-center mb-2"><span>Entradas</span><strong>{bs(total)}</strong></div>
              {serviceFee > 0 && <div className="flex justify-between items-center mb-2 text-sm text-muted-foreground"><span>Cargo por servicio</span><span>{bs(serviceFee)}</span></div>}
              <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground"><span>Procesamiento bancario</span><span>{bs(gatewayFee)}</span></div>
              <div className="flex justify-between items-center border-t border-border pt-4 mb-5"><span>Total a pagar</span><strong className="text-xl">{bs(amountDue)}</strong></div>
               <Button variant="sheet-action" onClick={create} disabled={busy} className="w-full rounded-full h-12 gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />} Pagar con QR</Button>
            </>}
          </section>
        ) : !isUuid(eventId) ? <p role="alert" className="text-sm text-muted-foreground pt-8">Este enlace de puerta no es válido. Escaneá el QR del evento para comprar tus entradas.</p>
          : !error ? <div className="flex justify-center pt-16"><Loader2 className="animate-spin" /></div> : null}
        {error && <p role="alert" className="text-destructive text-sm text-center mt-5">{error}</p>}
      </div>
    </main>
  );
}
