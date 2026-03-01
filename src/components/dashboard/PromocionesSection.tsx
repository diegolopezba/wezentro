import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Plus, Play, Pause, Eye, MousePointerClick, DollarSign, Users, Sparkles } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const CPM = 5; // $5 per 1,000 impressions
const reachToCost = (reach: number) => (reach / 1000) * CPM;
const costToReach = (cost: number) => Math.round((cost / CPM) * 1000);

const REACH_PRESETS = [1000, 5000, 10000, 50000, 100000];
const formatReach = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : n.toString();

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  active: { label: "Activo", variant: "default" },
  paused: { label: "Pausado", variant: "outline" },
  completed: { label: "Completado", variant: "destructive" },
};

const TARGET_CATEGORIES = [
  { value: "party", label: "🪩 Fiestas" },
  { value: "bar", label: "🍸 Bares" },
  { value: "concert", label: "🎵 Conciertos" },
  { value: "fitness", label: "🏋️ Fitness" },
  { value: "culture", label: "🎨 Cultura" },
  { value: "festival", label: "🎪 Festivales" },
  { value: "rooftop", label: "🌆 Rooftops" },
  { value: "restaurant", label: "🍽️ Restaurantes" },
  { value: "coffee", label: "☕ Café" },
];

export const PromocionesSection = () => {
  const { user } = useAuth();
  const { data: sponsoredPosts = [], isLoading } = useMySponsored();
  const { data: myEvents = [] } = useUserCreatedEvents(user?.id);
  const createMutation = useCreateSponsoredPost();
  const updateStatusMutation = useUpdateSponsoredStatus();

  const [showCreate, setShowCreate] = useState(false);
  const [budgetMode, setBudgetMode] = useState<"budget" | "reach">("reach");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [targetReach, setTargetReach] = useState(10000);

  // Targeting state
  const [targetCategories, setTargetCategories] = useState<string[]>([]);
  const [targetRadius, setTargetRadius] = useState<number>(25);
  const [targetGender, setTargetGender] = useState("all");
  const [targetAgeMin, setTargetAgeMin] = useState("");
  const [targetAgeMax, setTargetAgeMax] = useState("");

  const availableEvents = myEvents.filter(
    (e) => !sponsoredPosts.some((sp: any) => sp.event_id === e.id)
  );

  const toggleCategory = (cat: string) => {
    setTargetCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const resetForm = () => {
    setSelectedEventId("");
    setDailyBudget("");
    setTotalBudget("");
    setTargetReach(10000);
    setBudgetMode("reach");
    setTargetCategories([]);
    setTargetRadius(25);
    setTargetGender("all");
    setTargetAgeMin("");
    setTargetAgeMax("");
  };

  const handleCreate = async () => {
    if (!selectedEventId) {
      toast.error("Selecciona un evento");
      return;
    }
    const computedTotalBudget = budgetMode === "reach"
      ? reachToCost(targetReach)
      : totalBudget ? parseFloat(totalBudget) : undefined;

    try {
      await createMutation.mutateAsync({
        event_id: selectedEventId,
        daily_budget: dailyBudget ? parseFloat(dailyBudget) : undefined,
        total_budget: computedTotalBudget,
        target_categories: targetCategories.length > 0 ? targetCategories : undefined,
        target_radius_km: targetRadius < 50 ? targetRadius : undefined,
        target_gender: targetGender !== "all" ? targetGender : undefined,
        target_age_min: targetAgeMin ? parseInt(targetAgeMin) : undefined,
        target_age_max: targetAgeMax ? parseInt(targetAgeMax) : undefined,
      });
      toast.success("Promoción creada como borrador");
      setShowCreate(false);
      resetForm();
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
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Promoción</DialogTitle>
            <DialogDescription>
              Configura presupuesto y segmentación para aparecer en el feed "Para Ti".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Event selector */}
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

            {/* Budget / Reach toggle */}
            <Tabs value={budgetMode} onValueChange={(v) => setBudgetMode(v as "budget" | "reach")}>
              <TabsList className="w-full">
                <TabsTrigger value="reach" className="flex-1 gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Alcance estimado
                </TabsTrigger>
                <TabsTrigger value="budget" className="flex-1 gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Presupuesto
                </TabsTrigger>
              </TabsList>

              {/* Reach mode */}
              <TabsContent value="reach" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">¿A cuántas personas quieres llegar?</Label>
                  <Slider
                    value={[targetReach]}
                    onValueChange={([v]) => setTargetReach(v)}
                    min={1000}
                    max={500000}
                    step={1000}
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {REACH_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTargetReach(p)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          targetReach === p ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {formatReach(p)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary card */}
                <motion.div
                  layout
                  className="rounded-xl bg-primary/10 border border-primary/20 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                    <Sparkles className="w-4 h-4" />
                    Resumen estimado
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Alcance</p>
                      <p className="font-semibold text-foreground">{targetReach.toLocaleString()} personas</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Costo total</p>
                      <p className="font-semibold text-foreground">${reachToCost(targetReach).toFixed(2)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Tarifa</p>
                      <p className="font-medium text-foreground">$5 CPM (por cada 1,000 impresiones)</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">
                    El alcance real puede variar según la segmentación y disponibilidad del inventario.
                  </p>
                </motion.div>
              </TabsContent>

              {/* Budget mode */}
              <TabsContent value="budget" className="space-y-3 mt-4">
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
                {totalBudget && parseFloat(totalBudget) > 0 && (
                  <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                    💡 Con ${parseFloat(totalBudget).toFixed(2)} llegarás a ~{costToReach(parseFloat(totalBudget)).toLocaleString()} personas a $5 CPM
                  </p>
                )}
              </TabsContent>
            </Tabs>

            {/* Targeting section */}
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground mb-3">Segmentación</p>

              {/* Category targeting */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs text-muted-foreground">Categorías (vacío = todas)</Label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => toggleCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        targetCategories.includes(cat.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Radius */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs text-muted-foreground">
                  Radio máximo: {targetRadius >= 50 ? "Sin límite" : `${targetRadius} km`}
                </Label>
                <Slider
                  value={[targetRadius]}
                  onValueChange={([v]) => setTargetRadius(v)}
                  min={1}
                  max={50}
                  step={1}
                />
              </div>

              {/* Gender */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs text-muted-foreground">Género</Label>
                <Select value={targetGender} onValueChange={setTargetGender}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Edad mínima</Label>
                  <Input
                    type="number"
                    placeholder="18"
                    value={targetAgeMin}
                    onChange={(e) => setTargetAgeMin(e.target.value)}
                    min={13}
                    max={99}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Edad máxima</Label>
                  <Input
                    type="number"
                    placeholder="65"
                    value={targetAgeMax}
                    onChange={(e) => setTargetAgeMax(e.target.value)}
                    min={13}
                    max={99}
                  />
                </div>
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
