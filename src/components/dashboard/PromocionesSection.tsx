import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import {
  Megaphone, Plus, Play, Pause, Eye, MousePointerClick, DollarSign,
  Users, Sparkles, ArrowLeft, ArrowRight, Check, MapPin, Tag, Zap,
  ChevronRight, TrendingUp, Lock, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SponsoredSummaryBar } from "@/components/dashboard/SponsoredSummaryBar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useMySponsored, useCreateSponsoredPost, useUpdateSponsoredStatus, useTodayDailySpend } from "@/hooks/useSponsoredPosts";
import { useUserCreatedEvents } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CPM = 5;
const reachToCost = (reach: number) => (reach / 1000) * CPM;
const costToReach = (cost: number) => Math.round((cost / CPM) * 1000);
const formatReach = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString();

const BUDGET_PRESETS = [
  { amount: 10, popular: false },
  { amount: 25, popular: true },
  { amount: 50, popular: false },
  { amount: 100, popular: false },
];

const AUDIENCE_PRESETS = [
  {
    id: "auto",
    icon: Zap,
    title: "Automático",
    subtitle: "Recomendado · Nosotros optimizamos el alcance por ti",
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/30",
  },
  {
    id: "nearby",
    icon: MapPin,
    title: "Público cercano",
    subtitle: "Personas a menos de 25 km de tu evento",
    color: "text-foreground",
    bgColor: "bg-secondary border-border",
  },
  {
    id: "interest",
    icon: Tag,
    title: "Por interés",
    subtitle: "Personas que siguen eventos similares al tuyo",
    color: "text-foreground",
    bgColor: "bg-secondary border-border",
  },
];

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  draft: { label: "Borrador", dot: "bg-muted-foreground", badge: "bg-secondary text-secondary-foreground" },
  active: { label: "Activo", dot: "bg-green-500", badge: "bg-green-500/15 text-green-600" },
  paused: { label: "Pausado", dot: "bg-yellow-500", badge: "bg-yellow-500/15 text-yellow-600" },
  paused_daily: { label: "Pausado por presupuesto diario", dot: "bg-yellow-500", badge: "bg-yellow-500/15 text-yellow-600" },
  scheduled: { label: "Programado", dot: "bg-blue-500", badge: "bg-blue-500/15 text-blue-600" },
  completed: { label: "Completado", dot: "bg-muted-foreground", badge: "bg-secondary text-secondary-foreground" },
};

const STEPS = ["Evento", "Audiencia", "Presupuesto", "Confirmar"];

export const PromocionesSection = ({ openWizardOnMount }: { openWizardOnMount?: boolean }) => {
  const { user } = useAuth();
  const { data: sponsoredPosts = [], isLoading, refetch } = useMySponsored();
  const { data: dailySpendMap = {} } = useTodayDailySpend();
  const { data: myEvents = [] } = useUserCreatedEvents(user?.id);
  const createMutation = useCreateSponsoredPost();
  const updateStatusMutation = useUpdateSponsoredStatus();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [audiencePreset, setAudiencePreset] = useState("auto");
  const [selectedBudget, setSelectedBudget] = useState(25);
  const [customBudget, setCustomBudget] = useState("");
  const [useCustomBudget, setUseCustomBudget] = useState(false);

  // Open wizard automatically when triggered externally
  useEffect(() => {
    if (openWizardOnMount) {
      setShowWizard(true);
    }
  }, [openWizardOnMount]);

  const activeBudget = useCustomBudget && customBudget ? parseFloat(customBudget) || 0 : selectedBudget;
  const estimatedReach = costToReach(activeBudget);

  const availableEvents = myEvents.filter(
    (e) => !sponsoredPosts.some((sp: any) => sp.event_id === e.id && sp.id !== editingPostId)
  );
  const selectedEvent = myEvents.find((e) => e.id === selectedEventId);

  const resetWizard = () => {
    setStep(0);
    setSelectedEventId("");
    setAudiencePreset("auto");
    setSelectedBudget(25);
    setCustomBudget("");
    setUseCustomBudget(false);
    setEditingPostId(null);
  };

  const openEditWizard = (sp: any) => {
    setEditingPostId(sp.id);
    setSelectedEventId(sp.event_id || "");
    const budget = Number(sp.total_budget) || 25;
    const isPreset = BUDGET_PRESETS.some(p => p.amount === budget);
    if (isPreset) {
      setSelectedBudget(budget);
      setUseCustomBudget(false);
    } else {
      setCustomBudget(String(budget));
      setUseCustomBudget(true);
    }
    // Infer audience from targeting
    if (sp.target_radius_km) setAudiencePreset("nearby");
    else if (sp.target_categories?.length) setAudiencePreset("interest");
    else setAudiencePreset("auto");
    setStep(0);
    setShowWizard(true);
  };

  // Handle return from Stripe checkout
  useEffect(() => {
    const adActivated = searchParams.get("ad_activated");
    const sessionId = searchParams.get("session_id");
    if (!adActivated || !sessionId) return;
    const activate = async () => {
      try {
        const { error } = await supabase.functions.invoke("activate-ad-campaign", {
          body: { sponsored_post_id: adActivated, session_id: sessionId },
        });
        if (error) throw error;
        toast.success("¡Campaña activada! Ya está apareciendo en el feed.");
        refetch();
      } catch {
        toast.error("No se pudo activar la campaña. Contacta soporte.");
      } finally {
        navigate("/dashboard", { replace: true });
      }
    };
    activate();
  }, [searchParams]);

  const handleActivate = async (sp: any) => {
    const totalBudget = Number(sp.total_budget);
    if (!totalBudget || totalBudget <= 0) {
      toast.error("Esta campaña no tiene presupuesto definido");
      return;
    }
    setActivatingId(sp.id);
    try {
      const { data, error } = await supabase.functions.invoke("charge-boost", {
        body: { sponsored_post_id: sp.id, amount_usd: totalBudget },
      });
      if (error) throw error;

      if (data?.success) {
        toast.success("¡Campaña activada! Ya está apareciendo en el feed.");
        refetch();
        setActivatingId(null);
      } else if (data?.checkout_url) {
        if (Capacitor.isNativePlatform()) {
          // Listen for browser close to refetch status
          const listener = await Browser.addListener("browserFinished", async () => {
            listener.remove();
            setActivatingId(null);
            const { data: refreshed } = await refetch();
            const activated = refreshed?.find((p: any) => p.id === sp.id && p.status === "active");
            if (activated) {
              toast.success("¡Campaña activada! Ya está apareciendo en el feed.");
            }
          });
          await Browser.open({ url: data.checkout_url });
        } else {
          window.open(data.checkout_url, "_blank", "noopener,noreferrer");
        }
        setTimeout(() => setActivatingId(null), 30_000);
      } else {
        throw new Error("Respuesta inesperada del servidor");
      }
    } catch {
      toast.error("Error al iniciar el pago");
      setActivatingId(null);
    }
  };

  const handleCreate = async () => {
    if (!selectedEventId) return;
    const targetRadiusKm = audiencePreset === "nearby" ? 25 : undefined;
    try {
      if (editingPostId) {
        // Update existing draft
        const { error } = await supabase
          .from("sponsored_posts")
          .update({
            event_id: selectedEventId,
            total_budget: activeBudget,
            target_radius_km: targetRadiusKm ?? null,
          })
          .eq("id", editingPostId);
        if (error) throw error;
        toast.success("Promoción actualizada");
        setShowWizard(false);
        resetWizard();
        refetch();
      } else {
        const sp = await createMutation.mutateAsync({
          event_id: selectedEventId,
          total_budget: activeBudget,
          target_radius_km: targetRadiusKm,
        });
        setShowWizard(false);
        resetWizard();
        // Immediately redirect to checkout
        handleActivate(sp);
      }
    } catch {
      toast.error("Error al guardar la promoción");
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

  const canAdvance = () => {
    if (step === 0) return !!selectedEventId;
    if (step === 2) return activeBudget >= 5;
    return true;
  };

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-brand text-lg font-semibold text-foreground flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Promociones
        </h2>
        {sponsoredPosts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWizard(true)}
            disabled={availableEvents.length === 0}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 bg-secondary/50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {sponsoredPosts.length > 0 && <SponsoredSummaryBar sponsoredPosts={sponsoredPosts} />}

          {sponsoredPosts.length === 0 ? (
            /* ── Hero empty state ── */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6"
            >
              {/* decorative blobs */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/15 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-primary/10 blur-xl pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Boost</span>
                </div>

                <p className="text-xl font-bold text-foreground leading-tight mb-1">
                  Llega a miles de personas
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Los eventos con boost reciben <span className="font-semibold text-foreground">3× más asistentes</span> en promedio.
                </p>

                <div className="flex items-center gap-4 mb-5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Desde $10</span>
                  <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Pago seguro</span>
                  <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Activación inmediata</span>
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  className="w-full text-base"
                  onClick={() => setShowWizard(true)}
                  disabled={availableEvents.length === 0}
                >
                  {availableEvents.length === 0 ? "Crea un evento primero" : "Impulsar mi evento →"}
                </Button>
              </div>
            </motion.div>
          ) : (
            /* ── Campaign cards ── */
            <div className="space-y-3">
              {sponsoredPosts.map((sp: any) => {
                const cfg = statusConfig[sp.status] || statusConfig.draft;
                const progressPct = sp.total_budget
                  ? Math.min(100, (Number(sp.spent) / Number(sp.total_budget)) * 100)
                  : 0;
                return (
                  <motion.div
                    key={sp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-card border border-border overflow-hidden"
                  >
                    <div className="flex gap-3 p-4">
                      {/* Event thumbnail */}
                      {sp.event?.image_url ? (
                        <img
                          src={sp.event.image_url}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                          <Megaphone className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">
                              {sp.event?.title || "Evento sin título"}
                            </p>
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${cfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </div>

                          {sp.status === "draft" ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditWizard(sp)}
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="hero"
                                className="h-8 text-xs"
                                onClick={() => handleActivate(sp)}
                                disabled={activatingId === sp.id}
                              >
                                {activatingId === sp.id ? "..." : "Activar →"}
                              </Button>
                            </div>
                          ) : (sp.status === "active" || sp.status === "paused" || sp.status === "paused_daily") ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditWizard(sp)}
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleToggleStatus(sp.id, sp.status)}
                              >
                                {sp.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{sp.impressions.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{sp.clicks.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${Number(sp.spent).toFixed(2)}{sp.total_budget ? ` / $${Number(sp.total_budget).toFixed(0)}` : ""}</span>
                        </div>
                      </div>
                    </div>

                    {/* Budget progress */}
                    {sp.total_budget && (
                      <div className="px-4 pb-3">
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {Math.round(progressPct)}% del presupuesto usado
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── 4-step wizard sheet ── */}
      <Sheet open={showWizard} onOpenChange={(open) => { if (!open) { setShowWizard(false); resetWizard(); } }}>

        <SheetContent side="bottom" className="h-[92dvh] rounded-t-3xl p-0 flex flex-col overflow-hidden">
          {/* Progress bar */}
          <div className="flex gap-1 px-5 pt-5 pb-1 shrink-0">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-primary" : "bg-secondary"}`}
              />
            ))}
          </div>

          {/* Step label */}
          <div className="flex items-center justify-between px-5 pt-2 pb-1 shrink-0">
            <button
              className="p-1.5 rounded-full hover:bg-secondary transition-colors"
              onClick={() => {
                if (step === 0) { setShowWizard(false); resetWizard(); }
                else setStep(s => s - 1);
              }}
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {step + 1} / {STEPS.length} · {STEPS[step]}
            </p>
            <div className="w-8" />
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* ── Step 0: Choose event ── */}
                {step === 0 && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">¿Qué evento quieres impulsar?</h2>
                      <p className="text-sm text-muted-foreground mt-1">Elige el evento que aparecerá en el feed de más personas.</p>
                    </div>

                    {availableEvents.length === 0 ? (
                      <div className="rounded-2xl bg-secondary/50 p-6 text-center">
                        <p className="text-sm text-muted-foreground">No tienes eventos disponibles para impulsar.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {availableEvents.map((event: any) => {
                          const isSelected = selectedEventId === event.id;
                          const dateStr = event.start_datetime
                            ? format(new Date(event.start_datetime), "d MMM · HH:mm", { locale: es })
                            : null;
                          return (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => setSelectedEventId(event.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-card hover:border-primary/40"
                              }`}
                            >
                              {event.image_url ? (
                                <img src={event.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                                  <Megaphone className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-sm truncate">{event.title || "Sin título"}</p>
                                {dateStr && <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>}
                              </div>
                              {isSelected && (
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 1: Audience ── */}
                {step === 1 && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">¿A quién quieres llegar?</h2>
                      <p className="text-sm text-muted-foreground mt-1">Elige cómo segmentamos tu audiencia.</p>
                    </div>

                    <div className="space-y-3">
                      {AUDIENCE_PRESETS.map((preset) => {
                        const Icon = preset.icon;
                        const isSelected = audiencePreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setAudiencePreset(preset.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                              isSelected
                                ? `border-primary bg-primary/5`
                                : "border-border bg-card hover:border-primary/40"
                            }`}
                          >
                            <div className={`p-2.5 rounded-xl border ${isSelected ? "bg-primary/15 border-primary/30" : preset.bgColor}`}>
                              <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : preset.color}`} />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground text-sm">{preset.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{preset.subtitle}</p>
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Step 2: Budget ── */}
                {step === 2 && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">¿Cuánto quieres invertir?</h2>
                      <p className="text-sm text-muted-foreground mt-1">Cada $5 = ~1,000 personas alcanzadas.</p>
                    </div>

                    {/* Budget preset cards */}
                    <div className="grid grid-cols-2 gap-3">
                      {BUDGET_PRESETS.map((preset) => {
                        const isSelected = !useCustomBudget && selectedBudget === preset.amount;
                        const reach = costToReach(preset.amount);
                        return (
                          <button
                            key={preset.amount}
                            type="button"
                            onClick={() => { setSelectedBudget(preset.amount); setUseCustomBudget(false); }}
                            className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                              isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                            }`}
                          >
                            {preset.popular && (
                              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                                Más popular
                              </span>
                            )}
                            <p className="text-2xl font-bold text-foreground">${preset.amount}</p>
                            <p className="text-xs text-muted-foreground mt-1">~{formatReach(reach)} personas</p>
                            {isSelected && (
                              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom budget */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setUseCustomBudget(true)}
                        className={`w-full p-3.5 rounded-2xl border-2 text-sm font-medium transition-all ${
                          useCustomBudget ? "border-primary bg-primary/5 text-foreground" : "border-dashed border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {useCustomBudget ? (
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-semibold text-lg">$</span>
                            <Input
                              type="number"
                              autoFocus
                              placeholder="Otro monto"
                              value={customBudget}
                              onChange={(e) => setCustomBudget(e.target.value)}
                              className="border-0 p-0 h-auto text-lg font-semibold bg-transparent focus-visible:ring-0 w-full"
                              onClick={(e) => e.stopPropagation()}
                              min={5}
                            />
                          </div>
                        ) : "+ Monto personalizado"}
                      </button>
                    </div>

                    {/* Live estimator */}
                    {activeBudget >= 5 && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl bg-primary/8 border border-primary/20 p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Estimación</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          ~{formatReach(estimatedReach)} <span className="text-base font-normal text-muted-foreground">personas</span>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">por ${activeBudget.toFixed(0)} de inversión</p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ── Step 3: Confirm ── */}
                {step === 3 && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {editingPostId ? "Editar promoción" : "Confirmar y pagar"}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {editingPostId ? "Actualiza los detalles de tu campaña." : "Revisa tu campaña antes de activarla."}
                      </p>
                    </div>

                    {/* Summary card */}
                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                      {selectedEvent?.image_url && (
                        <img src={selectedEvent.image_url} alt="" className="w-full h-32 object-cover" />
                      )}
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Evento</p>
                          <p className="font-semibold text-foreground">{selectedEvent?.title || "Sin título"}</p>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Audiencia</p>
                            <p className="font-medium text-foreground">
                              {AUDIENCE_PRESETS.find(a => a.id === audiencePreset)?.title}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Alcance estimado</p>
                            <p className="font-medium text-foreground">~{formatReach(estimatedReach)} personas</p>
                          </div>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">Total a pagar</p>
                          <p className="text-2xl font-bold text-foreground">${activeBudget.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Pay CTA */}
                    <Button
                      variant="hero"
                      size="xl"
                      className="w-full text-base"
                      onClick={handleCreate}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        "Procesando..."
                      ) : editingPostId ? (
                        <>Guardar cambios <Check className="w-5 h-5 ml-1" /></>
                      ) : (
                        <>
                          Pagar ${activeBudget.toFixed(0)} y Activar
                          <ChevronRight className="w-5 h-5 ml-1" />
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      El pago es seguro vía Stripe. Sin cargos ocultos.
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sticky footer CTA (steps 0–2) */}
          {step < 3 && (
            <div className="shrink-0 px-5 pb-6 pt-2 border-t border-border bg-background">
              {step === 2 && activeBudget >= 5 && (
                <p className="text-center text-xs text-muted-foreground mb-2">
                  Llegarás a ~{formatReach(estimatedReach)} personas por ${activeBudget.toFixed(0)}
                </p>
              )}
              <Button
                variant="hero"
                size="xl"
                className="w-full text-base"
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance()}
              >
                Siguiente
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
};
