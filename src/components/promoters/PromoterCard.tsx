import { useState } from "react";
import { Copy, Share2, Power, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { buildPromoterLink } from "@/lib/promoterAttribution";
import { useTogglePromoter, useDeletePromoter, type PromoterStats } from "@/hooks/usePromoters";
const formatBs = (n: number) => `Bs. ${Math.round(Number(n) || 0)}`;

interface Props {
  eventId: string;
  row: PromoterStats;
}

export const PromoterCard = ({ eventId, row }: Props) => {
  const { toast } = useToast();
  const link = buildPromoterLink(eventId, row.short_code);
  const toggle = useTogglePromoter();
  const del = useDeletePromoter();
  const [confirmDel, setConfirmDel] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Enlace copiado" });
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  const share = async () => {
    const text = `${row.name} — entrá con este enlace: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: row.name, text, url: link });
        return;
      } catch {/* ignored */}
    }
    copy();
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-brand font-semibold text-foreground truncate">{row.name}</p>
          <p className="text-xs text-muted-foreground font-mono">?p={row.short_code}</p>
        </div>
        <Switch
          checked={row.is_active}
          onCheckedChange={(v) => toggle.mutate({ id: row.promoter_id, isActive: v, eventId })}
        />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Metric label="Clicks" value={row.clicks} />
        <Metric label="Guestlist" value={row.gl_approved} />
        <Metric label="Tickets" value={row.tickets_sold} />
        <Metric label="Ingresos" value={formatBs(row.revenue_bs)} small />
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="secondary" className="flex-1 rounded-full gap-1.5" onClick={copy}>
          <Copy className="w-3.5 h-3.5" /> Copiar
        </Button>
        <Button size="sm" variant="secondary" className="flex-1 rounded-full gap-1.5" onClick={share}>
          <Share2 className="w-3.5 h-3.5" /> Compartir
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={() => {
            if (confirmDel) {
              del.mutate({ id: row.promoter_id, eventId });
            } else {
              setConfirmDel(true);
              setTimeout(() => setConfirmDel(false), 3000);
            }
          }}
        >
          <Trash2 className={`w-4 h-4 ${confirmDel ? "text-destructive" : "text-muted-foreground"}`} />
        </Button>
      </div>
    </div>
  );
};

const Metric = ({ label, value, small }: { label: string; value: number | string; small?: boolean }) => (
  <div className="bg-secondary/50 rounded-xl py-2">
    <p className={`font-semibold text-foreground ${small ? "text-xs" : "text-base"}`}>{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);
