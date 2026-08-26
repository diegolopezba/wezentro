import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, UtensilsCrossed, CalendarCheck, ChevronDown, Lock, Clock, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUpdateEvent } from "@/hooks/useEventMutations";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MentionTextarea } from "@/components/ui/MentionTextarea";
import { useMyMenu } from "@/hooks/useMenu";
import { TicketTiersEditor, type DraftTier, type TicketPricingMode, type TierSaleMode } from "@/components/events/TicketTiersEditor";
import { useTicketTiers, useReplaceTicketTiers } from "@/hooks/useTicketTiers";
import { LocationPicker } from "@/components/map/LocationPicker";
import { BusinessRequiredSheet } from "@/components/events/BusinessRequiredSheet";
import { BeneficiaryRequiredSheet } from "@/components/events/BeneficiaryRequiredSheet";
import { useHasBeneficiary } from "@/hooks/useHasBeneficiary";
import { useDirtyBaseline, saveVariant } from "@/hooks/useDirtyBaseline";
import { useBusinessExperiences } from "@/hooks/useExperiences";
import { cn } from "@/lib/utils";

interface EditEventSheetProps {
  event: {
    id: string;
    title?: string | null;
    description?: string | null;
    category?: string | null;
    start_datetime: string;
    end_datetime?: string | null;
    location_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    price?: number | null;
    max_guestlist_capacity?: number | null;
    has_guestlist?: boolean | null;
    payment_qr_url?: string | null;
    show_menu_button?: boolean | null;
    show_reservation_button?: boolean | null;
    experience_id?: string | null;
    is_location_secret?: boolean | null;
    waitlist_enabled?: boolean | null;
    sales_open_at?: string | null;
    waitlist_early_access_hours?: number | null;
    waitlist_tier_id?: string | null;
    waitlist_released_at?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPost?: boolean;
  /**
   * When true, renders the form body without its own Sheet wrapper so it can
   * be embedded inside an outer bottom sheet (e.g. EventActionsSheet). The
   * `open` prop still controls the effect that hydrates form state.
   */
  embedded?: boolean;
}

import { CATEGORIES } from "@/lib/categories";

export function EditEventSheet({ event, open, onOpenChange, isPost = false, embedded = false }: EditEventSheetProps) {
  const updateEvent = useUpdateEvent();
  const { profile, user } = useAuth();
  const isBusiness = profile?.is_business === true;
  const reservationsEnabled = (profile as any)?.reservations_enabled === true;
  const experiencesEnabled = (profile as any)?.experiences_enabled === true;
  const { data: myMenu } = useMyMenu();
  const hasMenuItems = (myMenu?.items?.length ?? 0) > 0;
  const { data: existingTiers = [] } = useTicketTiers(event.id);
  const replaceTiers = useReplaceTicketTiers();
  const { hasBeneficiary } = useHasBeneficiary();
  const { data: myExperiences = [] } = useBusinessExperiences(
    isBusiness && experiencesEnabled ? user?.id : undefined,
  );
  const activeExperiences = myExperiences.filter((e) => e.is_active);
  const [pricingMode, setPricingMode] = useState<TicketPricingMode>("single");
  const [saleMode, setSaleMode] = useState<TierSaleMode>("parallel");
  const [draftTiers, setDraftTiers] = useState<DraftTier[]>([]);
  const [showBusinessGate, setShowBusinessGate] = useState(false);
  const [showBeneficiaryGate, setShowBeneficiaryGate] = useState(false);
  const [experienceId, setExperienceId] = useState<string | null>(event.experience_id ?? null);
  
  const [formData, setFormData] = useState({
    title: event.title || "",
    description: event.description || "",
    category: event.category || "",
    start_datetime: format(new Date(event.start_datetime), "yyyy-MM-dd'T'HH:mm"),
    end_datetime: event.end_datetime ? format(new Date(event.end_datetime), "yyyy-MM-dd'T'HH:mm") : "",
    location_name: event.location_name || "",
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    price: event.price?.toString() || "0",
    max_guestlist_capacity: event.max_guestlist_capacity?.toString() || "",
    show_menu_button: event.show_menu_button ?? false,
    show_reservation_button: event.show_reservation_button ?? false,
    is_location_secret: event.is_location_secret ?? false,
    waitlist_enabled: event.waitlist_enabled ?? false,
    sales_open_at: event.sales_open_at ? format(new Date(event.sales_open_at), "yyyy-MM-dd'T'HH:mm") : "",
    waitlist_early_access_hours: String(event.waitlist_early_access_hours ?? 0),
    waitlist_tier_key: event.waitlist_tier_id ?? "",
  });

  const { isDirty, capture } = useDirtyBaseline({ formData, draftTiers, pricingMode, saleMode, experienceId });

  useEffect(() => {
    if (open) {
      setExperienceId(event.experience_id ?? null);
      setFormData({
        title: event.title || "",
        description: event.description || "",
        category: event.category || "",
        start_datetime: format(new Date(event.start_datetime), "yyyy-MM-dd'T'HH:mm"),
        end_datetime: event.end_datetime ? format(new Date(event.end_datetime), "yyyy-MM-dd'T'HH:mm") : "",
        location_name: event.location_name || "",
        latitude: event.latitude ?? null,
        longitude: event.longitude ?? null,
        price: event.price?.toString() || "0",
        max_guestlist_capacity: event.max_guestlist_capacity?.toString() || "",
        show_menu_button: event.show_menu_button ?? false,
        show_reservation_button: event.show_reservation_button ?? false,
        is_location_secret: event.is_location_secret ?? false,
        waitlist_enabled: event.waitlist_enabled ?? false,
        sales_open_at: event.sales_open_at ? format(new Date(event.sales_open_at), "yyyy-MM-dd'T'HH:mm") : "",
        waitlist_early_access_hours: String(event.waitlist_early_access_hours ?? 0),
        waitlist_tier_key: event.waitlist_tier_id ?? "",
      });
    }
  }, [open, event]);

  // Hydrate tier editor when tiers load / sheet opens
  useEffect(() => {
    if (!open) return;
    if (existingTiers.length > 0) {
      setPricingMode("tiers");
      setSaleMode(existingTiers.some((t) => !!t.unlock_after_tier_id) ? "sequential" : "parallel");
      setDraftTiers(
        existingTiers.map((t) => ({
          key: t.id,
          name: t.name,
          price: String(t.price ?? ""),
          capacity: t.capacity != null ? String(t.capacity) : "",
          description: t.description ?? "",
        }))
      );
    } else {
      setPricingMode("single");
      setSaleMode("parallel");
      setDraftTiers([]);
    }
  }, [open, existingTiers]);

  // Snapshot the hydrated form so the save button only lights up on real changes
  useEffect(() => {
    if (!open) return;
    const hydratedTiers: DraftTier[] = existingTiers.map((t) => ({
      key: t.id,
      name: t.name,
      price: String(t.price ?? ""),
      capacity: t.capacity != null ? String(t.capacity) : "",
      description: t.description ?? "",
    }));
    capture({
      formData: {
        title: event.title || "",
        description: event.description || "",
        category: event.category || "",
        start_datetime: format(new Date(event.start_datetime), "yyyy-MM-dd'T'HH:mm"),
        end_datetime: event.end_datetime ? format(new Date(event.end_datetime), "yyyy-MM-dd'T'HH:mm") : "",
        location_name: event.location_name || "",
        latitude: event.latitude ?? null,
        longitude: event.longitude ?? null,
        price: event.price?.toString() || "0",
        max_guestlist_capacity: event.max_guestlist_capacity?.toString() || "",
        show_menu_button: event.show_menu_button ?? false,
        show_reservation_button: event.show_reservation_button ?? false,
        is_location_secret: event.is_location_secret ?? false,
        waitlist_enabled: event.waitlist_enabled ?? false,
        sales_open_at: event.sales_open_at ? format(new Date(event.sales_open_at), "yyyy-MM-dd'T'HH:mm") : "",
        waitlist_early_access_hours: String(event.waitlist_early_access_hours ?? 0),
        waitlist_tier_key: event.waitlist_tier_id ?? "",
      },
      draftTiers: hydratedTiers,
      pricingMode: existingTiers.length > 0 ? "tiers" : "single",
      saleMode:
        existingTiers.length > 0 && existingTiers.some((t) => !!t.unlock_after_tier_id)
          ? "sequential"
          : "parallel",
      experienceId: event.experience_id ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event, existingTiers]);

  const handleSave = async () => {
    try {
      // Linked experiences are booked and paid through QR: payouts are required.
      if (experienceId && !hasBeneficiary) { setShowBeneficiaryGate(true); return; }

      // Gate paid tickets: require Business + Qhantuy beneficiary
      const priceNum = parseFloat(formData.price) || 0;
      const hasPaidTier = !isPost && !experienceId && pricingMode === "tiers" && draftTiers.some((t) => parseFloat(t.price || "0") > 0);
      if (!isPost && !experienceId && (priceNum > 0 || hasPaidTier || pricingMode === "tiers")) {
        if (!isBusiness) { setShowBusinessGate(true); return; }
        if (!hasBeneficiary) { setShowBeneficiaryGate(true); return; }
      }

      // Validate tiers if in tiers mode
      const cleanTiers: { name: string; price: number; capacity: number | null; description: string | null; display_order: number }[] = [];
      if (!isPost && pricingMode === "tiers") {
        if (draftTiers.length === 0) {
          toast.error("Añade al menos un tipo de entrada");
          return;
        }
        for (const t of draftTiers) {
          if (!t.name.trim()) {
            toast.error("Cada entrada necesita un nombre");
            return;
          }
          const price = parseFloat(t.price);
          if (isNaN(price) || price < 0) {
            toast.error(`Precio inválido para "${t.name}"`);
            return;
          }
          cleanTiers.push({
            name: t.name.trim(),
            price,
            capacity: t.capacity ? parseInt(t.capacity) : null,
            description: t.description.trim() || null,
            display_order: cleanTiers.length,
          });
        }
      }

      const legacyPrice =
        !isPost && pricingMode === "tiers" && cleanTiers.length > 0
          ? Math.min(...cleanTiers.map((t) => t.price))
          : parseFloat(formData.price) || 0;

      await updateEvent.mutateAsync({
        eventId: event.id,
        data: {
          title: formData.title,
          description: formData.description || null,
          category: formData.category || null,
          start_datetime: formData.start_datetime ? new Date(formData.start_datetime).toISOString() : null,
          end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : null,
          location_name: formData.location_name || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          price: legacyPrice,
          max_guestlist_capacity: formData.max_guestlist_capacity ? parseInt(formData.max_guestlist_capacity) : null,
          has_guestlist: isPost ? false : true,
          show_menu_button: formData.show_menu_button,
          show_reservation_button: formData.show_reservation_button,
          experience_id: experienceId,
          is_location_secret: formData.is_location_secret,
          waitlist_enabled: formData.waitlist_enabled,
          sales_open_at: formData.waitlist_enabled && formData.sales_open_at
            ? new Date(formData.sales_open_at).toISOString()
            : null,
          waitlist_early_access_hours: formData.waitlist_enabled
            ? parseInt(formData.waitlist_early_access_hours || "0") || 0
            : 0,
        },
      });

      if (!isPost && !experienceId) {
        const createdTiers = await replaceTiers.mutateAsync({
          eventId: event.id,
          tiers: pricingMode === "tiers" ? cleanTiers : [],
          sequential: saleMode === "sequential",
        });
        // Re-link the waiting list to the (re-created) chosen ticket type
        const idx =
          formData.waitlist_enabled && formData.waitlist_tier_key && pricingMode === "tiers"
            ? draftTiers.findIndex((t) => t.key === formData.waitlist_tier_key)
            : -1;
        const linkedId = idx >= 0 ? createdTiers?.[idx]?.id ?? null : null;
        if (linkedId !== (event.waitlist_tier_id ?? null)) {
          await supabase
            .from("events")
            .update({ waitlist_tier_id: linkedId } as any)
            .eq("id", event.id);
        }
      }
      // Parse @mentions from description and insert into event_tags
      if (formData.description.trim()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const mentionRegex = /(?<!\w)@([a-zA-Z0-9_]+)/g;
          const usernames = new Set<string>();
          let match;
          while ((match = mentionRegex.exec(formData.description)) !== null) {
            usernames.add(match[1].toLowerCase());
          }
          if (usernames.size > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, username")
              .in("username", Array.from(usernames))
              .neq("id", session.user.id);
            if (profiles && profiles.length > 0) {
              // Only insert tags that don't already exist
              const { data: existingTags } = await supabase
                .from("event_tags")
                .select("tagged_user_id")
                .eq("event_id", event.id);
              const existingIds = new Set((existingTags || []).map(t => t.tagged_user_id));
              for (const p of profiles) {
                if (!existingIds.has(p.id)) {
                  try {
                    await supabase.from("event_tags").insert({
                      event_id: event.id,
                      tagged_user_id: p.id,
                      tagged_by: session.user.id,
                    });
                  } catch (tagError) {
                    console.error("Error tagging user:", tagError);
                  }
                }
              }
            }
          }
        }
      }

      toast.success(isPost ? "Post actualizado exitosamente" : "Evento actualizado exitosamente");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar evento");
    }
  };

  const body = (
    <>
        <SheetHeader className="shrink-0 mb-4">
          <SheetTitle>{isPost ? "Editar post" : "Editar evento"}</SheetTitle>
        </SheetHeader>


        <div data-vaul-no-drag className="sheet-scroll-region flex-1 space-y-4 pb-4 -mx-6 px-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Título del evento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <MentionTextarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del evento"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isPost && (
            <>
              <div className="space-y-2">
                <Label htmlFor="datetime">Fecha y hora</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={formData.start_datetime}
                  onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-datetime">Fecha y hora de fin (opcional)</Label>
                <Input
                  id="end-datetime"
                  type="datetime-local"
                  value={formData.end_datetime}
                  onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <LocationPicker
                  value={{
                    address: formData.location_name,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                  }}
                  onChange={(loc) =>
                    setFormData({
                      ...formData,
                      location_name: loc.address,
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                    })
                  }
                />
              </div>


              {experienceId ? (
                <div className="rounded-xl bg-secondary/50 border border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Las entradas están deshabilitadas porque este post vende una experiencia vinculada.
                  </p>
                </div>
              ) : isBusiness ? (
                <div className="space-y-2">
                  <Label>Entradas</Label>
                  <TicketTiersEditor
                    mode={pricingMode}
                    onModeChange={setPricingMode}
                    singlePrice={formData.price}
                    onSinglePriceChange={(v) => setFormData({ ...formData, price: v })}
                    tiers={draftTiers}
                    onTiersChange={setDraftTiers}
                    saleMode={saleMode}
                    onSaleModeChange={setSaleMode}
                    onAttemptPaidAction={!hasBeneficiary ? () => setShowBeneficiaryGate(true) : undefined}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (Bs)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Gratis — Business para cobrar"
                    value=""
                    readOnly
                    onFocus={(e) => { e.target.blur(); setShowBusinessGate(true); }}
                    onClick={() => setShowBusinessGate(true)}
                    onChange={() => {}}
                  />
                </div>
              )}

              {isBusiness && (
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidad total (opcional)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.max_guestlist_capacity}
                    onChange={(e) => setFormData({ ...formData, max_guestlist_capacity: e.target.value })}
                    placeholder="Ilimitada"
                  />
                </div>
              )}
            </>
          )}

          {/* Menu Button Toggle - Only for Business users with menu items */}
          {isBusiness && hasMenuItems && (
            <div className="flex items-center justify-between py-2 px-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <Label htmlFor="show-menu-button">Mostrar botón de menú</Label>
                  <span className="text-xs text-muted-foreground">
                    Los visitantes podrán ver tu menú desde este post
                  </span>
                </div>
              </div>
              <Switch
                id="show-menu-button"
                checked={formData.show_menu_button}
                onCheckedChange={(checked) => setFormData({ ...formData, show_menu_button: checked })}
              />
            </div>
          )}

          {/* Experience picker — business accounts with active experiences */}
          {isBusiness && experiencesEnabled && activeExperiences.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <Label>Vincular una experiencia</Label>
                  <span className="text-xs text-muted-foreground">
                    Los visitantes la reservan y pagan desde este post
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setExperienceId(null)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs border transition-colors active:scale-[0.97]",
                    !experienceId
                      ? "bg-foreground text-background border-foreground"
                      : "bg-secondary/50 border-border text-muted-foreground",
                  )}
                >
                  Ninguna
                </button>
                {activeExperiences.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => {
                      if (!hasBeneficiary) {
                        setShowBeneficiaryGate(true);
                        return;
                      }
                      setExperienceId(experienceId === exp.id ? null : exp.id);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition-colors active:scale-[0.97]",
                      experienceId === exp.id
                        ? "bg-foreground text-background border-foreground"
                        : "bg-secondary/50 border-border text-muted-foreground",
                    )}
                  >
                    {exp.title}
                  </button>
                ))}
              </div>
              {!hasBeneficiary && (
                <p className="text-xs text-muted-foreground">
                  Configurá tus datos de cobro para vincular una experiencia
                </p>
              )}
            </div>
          )}

          {/* Reservation Button Toggle - Only for Business users with reservations enabled */}
          {isBusiness && reservationsEnabled && (
            <div className="flex items-center justify-between py-2 px-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <Label htmlFor="show-reservation-button">Mostrar botón Reservar</Label>
                  <span className="text-xs text-muted-foreground">
                    Los visitantes podrán reservar una mesa desde este post
                  </span>
                </div>
              </div>
              <Switch
                id="show-reservation-button"
                checked={formData.show_reservation_button}
                onCheckedChange={(checked) => setFormData({ ...formData, show_reservation_button: checked })}
              />
            </div>
          )}

          {/* Opciones avanzadas */}
          {!isPost && (
            <Collapsible className="rounded-xl border border-border bg-secondary/30">
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 [&[data-state=open]>svg]:rotate-180">
                <span className="text-sm font-medium">Opciones avanzadas</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 pt-1">
                <div className="flex items-start justify-between gap-3 py-2">
                  <div className="flex items-start gap-2 flex-1">
                    <Lock className="w-4 h-4 text-primary mt-0.5" />
                    <div className="flex flex-col">
                      <Label htmlFor="secret-location">Ubicación secreta</Label>
                      <span className="text-xs text-muted-foreground">
                        Solo las personas que apruebes verán la dirección. Si la cambias, les llegará una notificación.
                      </span>
                    </div>
                  </div>
                  <Switch
                    id="secret-location"
                    checked={formData.is_location_secret}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_location_secret: checked })}
                  />
                </div>

                {/* Lista de espera */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-start justify-between gap-3 py-2">
                    <div className="flex items-start gap-2 flex-1">
                      <Clock className="w-4 h-4 text-primary mt-0.5" />
                      <div className="flex flex-col">
                        <Label htmlFor="waitlist-enabled">Lista de espera</Label>
                        <span className="text-xs text-muted-foreground">
                          Oculta los precios hasta que abras la venta. Los interesados se anotan y son los primeros en enterarse.
                        </span>
                      </div>
                    </div>
                    <Switch
                      id="waitlist-enabled"
                      checked={formData.waitlist_enabled}
                      onCheckedChange={(checked) => {
                        if (checked && !isBusiness) { setShowBusinessGate(true); return; }
                        if (checked && !hasBeneficiary) { setShowBeneficiaryGate(true); return; }
                        setFormData({ ...formData, waitlist_enabled: checked });
                      }}
                    />
                  </div>

                  {formData.waitlist_enabled && (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="sales-open-at" className="text-xs text-muted-foreground">
                          Apertura de venta (opcional)
                        </Label>
                        <Input
                          id="sales-open-at"
                          type="datetime-local"
                          value={formData.sales_open_at}
                          onChange={(e) => setFormData({ ...formData, sales_open_at: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="early-access-hours" className="text-xs text-muted-foreground">
                          Acceso anticipado para la lista (horas)
                        </Label>
                        <Input
                          id="early-access-hours"
                          type="number"
                          min="0"
                          value={formData.waitlist_early_access_hours}
                          onChange={(e) => setFormData({ ...formData, waitlist_early_access_hours: e.target.value })}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          0 = solo notificación. Más de 0 = solo la lista puede comprar durante ese tiempo.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Entrada de la lista de espera
                        </Label>
                        {pricingMode === "tiers" && draftTiers.length > 0 ? (
                          <>
                            <div className="flex flex-wrap gap-2">
                              {draftTiers.map((t, i) => {
                                const active = formData.waitlist_tier_key === t.key;
                                return (
                                  <button
                                    key={t.key}
                                    type="button"
                                    onClick={() =>
                                      setFormData({
                                        ...formData,
                                        waitlist_tier_key: active ? "" : t.key,
                                      })
                                    }
                                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                      active
                                        ? "bg-foreground text-background border-transparent"
                                        : "border-border text-muted-foreground"
                                    }`}
                                  >
                                    {(t.name || `Entrada ${i + 1}`) + (t.price ? ` · Bs. ${t.price}` : "")}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Los inscritos compran esta entrada primero durante el acceso anticipado.
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            Configurá "Múltiples entradas" para asociar la lista a un nivel de precio.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>


        <div className="shrink-0 pt-4 border-t safe-bottom">
          <Button
            variant={saveVariant(isDirty)}
            className="w-full"
            onClick={handleSave}
            disabled={!isDirty || updateEvent.isPending}
          >
            {updateEvent.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Guardar cambios
          </Button>
        </div>
      <BusinessRequiredSheet open={showBusinessGate} onOpenChange={setShowBusinessGate} />
      <BeneficiaryRequiredSheet open={showBeneficiaryGate} onOpenChange={setShowBeneficiaryGate} />
    </>
  );

  if (embedded) {
    return <div className="flex flex-col h-full">{body}</div>;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="light-sheet h-[85dvh] max-h-[85dvh] rounded-t-3xl flex flex-col">
        {body}
      </SheetContent>
    </Sheet>
  );
}

