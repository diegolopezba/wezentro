import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, X, QrCode, UtensilsCrossed, CalendarCheck, ChevronDown, Lock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUpdateEvent } from "@/hooks/useEventMutations";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, blobToFile } from "@/lib/mediaCompression";
import { MentionTextarea } from "@/components/ui/MentionTextarea";
import { useMyMenu } from "@/hooks/useMenu";
import { TicketTiersEditor, type DraftTier, type TicketPricingMode, type TierSaleMode } from "@/components/events/TicketTiersEditor";
import { useTicketTiers, useReplaceTicketTiers } from "@/hooks/useTicketTiers";
import { LocationPicker } from "@/components/map/LocationPicker";

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
    is_location_secret?: boolean | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPost?: boolean;
}

import { CATEGORIES } from "@/lib/categories";

export function EditEventSheet({ event, open, onOpenChange, isPost = false }: EditEventSheetProps) {
  const updateEvent = useUpdateEvent();
  const { profile } = useAuth();
  const isBusiness = profile?.is_business === true;
  const reservationsEnabled = (profile as any)?.reservations_enabled === true;
  const { data: myMenu } = useMyMenu();
  const hasMenuItems = (myMenu?.items?.length ?? 0) > 0;
  const { data: existingTiers = [] } = useTicketTiers(event.id);
  const replaceTiers = useReplaceTicketTiers();
  const [pricingMode, setPricingMode] = useState<TicketPricingMode>("single");
  const [saleMode, setSaleMode] = useState<TierSaleMode>("parallel");
  const [draftTiers, setDraftTiers] = useState<DraftTier[]>([]);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isCompressingQr, setIsCompressingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: event.title || "",
    description: event.description || "",
    category: event.category || "",
    start_datetime: format(new Date(event.start_datetime), "yyyy-MM-dd'T'HH:mm"),
    location_name: event.location_name || "",
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    price: event.price?.toString() || "0",
    max_guestlist_capacity: event.max_guestlist_capacity?.toString() || "",
    has_guestlist: event.has_guestlist || false,
    payment_qr_url: event.payment_qr_url || "",
    show_menu_button: event.show_menu_button ?? false,
    show_reservation_button: event.show_reservation_button ?? false,
    is_location_secret: event.is_location_secret ?? false,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        title: event.title || "",
        description: event.description || "",
        category: event.category || "",
        start_datetime: format(new Date(event.start_datetime), "yyyy-MM-dd'T'HH:mm"),
        location_name: event.location_name || "",
        latitude: event.latitude ?? null,
        longitude: event.longitude ?? null,
        price: event.price?.toString() || "0",
        max_guestlist_capacity: event.max_guestlist_capacity?.toString() || "",
        has_guestlist: event.has_guestlist || false,
        payment_qr_url: event.payment_qr_url || "",
        show_menu_button: event.show_menu_button ?? false,
        show_reservation_button: event.show_reservation_button ?? false,
        is_location_secret: event.is_location_secret ?? false,
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

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor sube una imagen");
      return;
    }

    setIsCompressingQr(true);
    let fileToUpload = file;
    
    try {
      // Compress QR image (smaller size for QR codes)
      const result = await compressImage(file, 800, 0.9);
      fileToUpload = blobToFile(result.blob, file.name);
    } catch (error) {
      console.error("Compression failed, using original:", error);
    } finally {
      setIsCompressingQr(false);
    }

    setIsUploadingQr(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("No autenticado");
        return;
      }

      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${session.user.id}/payment-qr-${event.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, fileToUpload, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("event-images").getPublicUrl(fileName);
      setFormData({ ...formData, payment_qr_url: `${data.publicUrl}?t=${Date.now()}` });
      toast.success("QR de pago subido");
    } catch (error: any) {
      toast.error(error.message || "Error al subir QR");
    } finally {
      setIsUploadingQr(false);
    }
  };

  const removePaymentQr = () => {
    setFormData({ ...formData, payment_qr_url: "" });
  };

  const handleSave = async () => {
    try {
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
          location_name: formData.location_name || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          price: legacyPrice,
          max_guestlist_capacity: formData.max_guestlist_capacity ? parseInt(formData.max_guestlist_capacity) : null,
          has_guestlist: formData.has_guestlist,
          payment_qr_url: formData.payment_qr_url || null,
          show_menu_button: formData.show_menu_button,
          show_reservation_button: formData.show_reservation_button,
          is_location_secret: formData.is_location_secret,
        },
      });

      if (!isPost) {
        await replaceTiers.mutateAsync({
          eventId: event.id,
          tiers: pricingMode === "tiers" ? cleanTiers : [],
          sequential: saleMode === "sequential",
        });
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

  const showPaymentQrSection = isBusiness && formData.has_guestlist && parseFloat(formData.price) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] max-h-[85dvh] rounded-t-3xl flex flex-col">
        <SheetHeader className="shrink-0 mb-4">
          <SheetTitle>{isPost ? "Editar post" : "Editar evento"}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pb-4 -mx-6 px-6">
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


              {isBusiness ? (
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
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              )}

              <div className="flex items-center justify-between py-2">
                <div className="flex flex-col">
                  <Label htmlFor="guestlist">Habilitar lista de invitados</Label>
                  {!isBusiness && (
                    <span className="text-xs text-muted-foreground">
                      Requiere cuenta Business (gratis en Configuración)
                    </span>
                  )}
                </div>
                <Switch
                  id="guestlist"
                  checked={formData.has_guestlist}
                  onCheckedChange={(checked) => {
                    if (checked && !isBusiness) {
                      toast.info("Activa tu cuenta Business en Configuración para usar guestlists");
                      return;
                    }
                    setFormData({ ...formData, has_guestlist: checked });
                  }}
                />
              </div>

              {(isBusiness || formData.has_guestlist) && (
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

              {/* Payment QR Section - Only for Business users with price > 0 and guestlist enabled */}
              {showPaymentQrSection && (
            <div className="space-y-2 p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="w-4 h-4 text-primary" />
                <Label>QR de Pago (opcional)</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Sube un QR de pago para habilitar la compra de entradas dentro de la app
              </p>
              
              {formData.payment_qr_url ? (
                <div className="relative w-32 h-32 mx-auto">
                  <img
                    src={formData.payment_qr_url}
                    alt="QR de pago"
                    className="w-full h-full object-contain rounded-xl bg-white p-2"
                  />
                  <button
                    type="button"
                    onClick={removePaymentQr}
                    className="absolute -top-2 -right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => qrInputRef.current?.click()}
                    disabled={isUploadingQr || isCompressingQr}
                  >
                    {(isUploadingQr || isCompressingQr) ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isCompressingQr ? "Optimizando..." : "Subir QR de Pago"}
                  </Button>
                </div>
              )}
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
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>


        <div className="shrink-0 pt-4 border-t safe-bottom">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={updateEvent.isPending}
          >
            {updateEvent.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Guardar cambios
          </Button>
        </div>
      </SheetContent>

    </Sheet>
  );
}
