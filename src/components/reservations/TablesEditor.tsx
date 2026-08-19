import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Table2, Users } from "lucide-react";
import {
  useRestaurantTables,
  useUpsertTable,
  useBulkCreateTables,
  useDeleteTable,
  type RestaurantTable,
} from "@/hooks/useReservationConfig";

interface Props {
  businessId: string;
}

const ZONES = ["Interior", "Terraza", "Barra", "Privado"];

export const TablesEditor = ({ businessId }: Props) => {
  const { data: tables = [], isLoading } = useRestaurantTables(businessId);
  const upsert = useUpsertTable(businessId);
  const bulkCreate = useBulkCreateTables(businessId);
  const remove = useDeleteTable(businessId);

  const [bulkCount, setBulkCount] = useState("4");
  const [bulkSeats, setBulkSeats] = useState("4");
  const [bulkZone, setBulkZone] = useState<string>("");

  const totals = useMemo(() => {
    const active = tables.filter((t) => t.is_active);
    return {
      tables: active.length,
      seats: active.reduce((s, t) => s + t.seats, 0),
    };
  }, [tables]);

  const handleBulkAdd = () => {
    const count = parseInt(bulkCount, 10);
    const seats = parseInt(bulkSeats, 10);
    if (!count || count < 1 || !seats || seats < 1) return;
    bulkCreate.mutate({
      count: Math.min(count, 50),
      seats,
      zone: bulkZone || null,
      startIndex: tables.length + 1,
    });
  };

  const updateTable = (t: RestaurantTable, patch: Partial<RestaurantTable>) => {
    upsert.mutate({ ...t, ...patch });
  };

  return (
    <div className="py-4 px-4 rounded-xl bg-card border border-border space-y-4">
      <div className="flex items-center gap-2">
        <Table2 className="w-4 h-4 text-green-500" />
        <Label className="text-foreground font-semibold">Mesas</Label>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Configura tus mesas reales. La disponibilidad se calcula asignando mesas,
        no un número general de personas.
      </p>

      {/* Bulk add */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cantidad</Label>
          <Input
            type="number"
            min={1}
            value={bulkCount}
            onChange={(e) => setBulkCount(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Sillas c/u</Label>
          <Input
            type="number"
            min={1}
            value={bulkSeats}
            onChange={(e) => setBulkSeats(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={handleBulkAdd} disabled={bulkCreate.isPending}>
          <Plus className="w-4 h-4 mr-1" /> Agregar
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ZONES.map((z) => (
          <button
            key={z}
            onClick={() => setBulkZone(bulkZone === z ? "" : z)}
            className={`px-3 py-1 rounded-full text-xs border ${
              bulkZone === z
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {z}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando mesas...</p>
      ) : tables.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aún no tienes mesas. Mientras tanto se usa la capacidad general.
        </p>
      ) : (
        <div className="space-y-2">
          {tables.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2"
            >
              <Input
                value={t.name}
                onChange={(e) => updateTable(t, { name: e.target.value })}
                className="h-8 flex-1"
              />
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  min={1}
                  value={t.seats}
                  onChange={(e) =>
                    updateTable(t, { seats: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="h-8 w-16"
                />
              </div>
              <Switch
                checked={t.is_active}
                onCheckedChange={(v) => updateTable(t, { is_active: v })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => remove.mutate(t.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            {totals.tables} mesas activas · {totals.seats} lugares
          </p>
        </div>
      )}
    </div>
  );
};
