import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Plus, Play, Pause, Eye, MousePointerClick, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SponsoredSummaryBar } from "@/components/dashboard/SponsoredSummaryBar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMySponsored, useCreateSponsoredPost, useUpdateSponsoredStatus } from "@/hooks/useSponsoredPosts";
import { useUserCreatedEvents } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  active: { label: "Activo", variant: "default" },
  paused: { label: "Pausado", variant: "outline" },
  completed: { label: "Completado", variant: "destructive" },
};

export const PromocionesSection = () => {
  const { user } = useAuth();
  const { data: sponsoredPosts = [], isLoading } = useMySponsored();
  const { data: myEvents = [] } = useUserCreatedEvents(user?.id);
  const createMutation = useCreateSponsoredPost();
  const updateStatusMutation = useUpdateSponsoredStatus();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [totalBudget, setTotalBudget] = useState("");

  // Events not already promoted
  const availableEvents = myEvents.filter(
    (e) => !sponsoredPosts.some((sp: any) => sp.event_id === e.id)
  );

  const handleCreate = async () => {
    if (!selectedEventId) {
      toast.error("Selecciona un evento");
      return;
    }
    try {
      await createMutation.mutateAsync({
        event_id: selectedEventId,
        daily_budget: dailyBudget ? parseFloat(dailyBudget) : undefined,
        total_budget: totalBudget ? parseFloat(totalBudget) : undefined,
      });
      toast.success("Promoción creada como borrador");
      setShowCreate(false);
      setSelectedEventId("");
      setDailyBudget("");
      setTotalBudget("");
    } catch {
      toast.error("Error al crear la promoción");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      toast.success(newStatus === "active" ? "Promoción activada" : "Promoción pausada");
    } catch {
      toast.error("Error al actualizar el estado");
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-brand text-lg font-semibold text-foreground flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Promociones
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreate(true)}
          disabled={availableEvents.length === 0}
        >
          <Plus className="w-4 h-4 mr-1" />
          Nueva
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-secondary/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {sponsoredPosts.length > 0 && (
            <SponsoredSummaryBar sponsoredPosts={sponsoredPosts} />
          )}
          {sponsoredPosts.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-6 text-center">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Promociona tus eventos para llegar a más personas en el feed "Para Ti".
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setShowCreate(true)}
            disabled={availableEvents.length === 0}
          >
            Crear primera promoción
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sponsoredPosts.map((sp: any) => {
            const status = statusLabels[sp.status] || statusLabels.draft;
            return (
              <motion.div
                key={sp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card border border-border p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {sp.event?.title || "Evento sin título"}
                    </p>
                    <Badge variant={status.variant} className="mt-1 text-[10px]">
                      {status.label}
                    </Badge>
                  </div>
                  {(sp.status === "draft" || sp.status === "active" || sp.status === "paused") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleStatus(sp.id, sp.status)}
                    >
                      {sp.status === "active" ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {sp.impressions.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5" />
                    {sp.clicks.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    ${Number(sp.spent).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Promoción</DialogTitle>
            <DialogDescription>
              Selecciona un evento y configura el presupuesto para aparecer en el feed "Para Ti".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Evento</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un evento" />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.map((event: any) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title || "Sin título"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Presupuesto diario ($)</Label>
                <Input
                  type="number"
                  placeholder="10.00"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Presupuesto total ($)</Label>
                <Input
                  type="number"
                  placeholder="100.00"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={createMutation.isPending || !selectedEventId}
            >
              {createMutation.isPending ? "Creando..." : "Crear como borrador"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
