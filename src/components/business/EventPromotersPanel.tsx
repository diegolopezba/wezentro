import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePromoterStats,
  useCreatePromoter,
} from "@/hooks/usePromoters";
import { PromoterCard } from "@/components/promoters/PromoterCard";

/** Promoter management for a single event (shared by the legacy page and the
 *  "Promotores" tab of the business event detail screen). Logic unchanged. */
export const EventPromotersPanel = ({ eventId }: { eventId: string }) => {
  const [name, setName] = useState("");
  const create = useCreatePromoter();

  const stats = usePromoterStats(eventId);

  const handleCreate = () => {
    if (!eventId || !name.trim()) return;
    create.mutate({ eventId, name }, { onSuccess: () => setName("") });
  };

  return (
    <div className="space-y-6">
      {/* Create promoter */}
      <section className="space-y-2">
        <h2 className="font-brand text-sm font-semibold text-foreground">Nuevo promotor</h2>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del promotor (ej. Carlos)"
            maxLength={40}
            className="rounded-full"
          />
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || create.isPending}
            className="rounded-full gap-1.5"
          >
            <Plus className="w-4 h-4" /> Crear
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Generamos un enlace único que el promotor comparte. Cada click, guestlist y ticket vendido se le atribuye automáticamente.
        </p>
      </section>

      {/* Leaderboard */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-brand text-sm font-semibold text-foreground">Tus promotores</h2>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> {stats.data?.length ?? 0}
          </span>
        </div>
        {stats.isLoading ? (
          <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
        ) : stats.data && stats.data.length > 0 ? (
          <div className="space-y-3">
            {[...stats.data]
              .sort((a, b) => b.tickets_sold - a.tickets_sold || b.clicks - a.clicks)
              .map((p) => (
                <PromoterCard key={p.promoter_id} eventId={eventId} row={p} />
              ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">
            Aún no tienes promotores. Crea el primero arriba.
          </p>
        )}
      </section>
    </div>
  );
};
