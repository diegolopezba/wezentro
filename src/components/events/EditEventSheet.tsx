import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, X, QrCode, MessageCircle, UtensilsCrossed, CalendarCheck } from "lucide-react";
import { useUpdateEvent } from "@/hooks/useEventMutations";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, blobToFile } from "@/lib/mediaCompression";
import { MentionTextarea } from "@/components/ui/MentionTextarea";
import { useMyMenu } from "@/hooks/useMenu";

interface EditEventSheetProps {
  event: {
    id: string;
    title?: string | null;
    description?: string | null;
    category?: string | null;
    start_datetime: string;
    end_datetime?: string | null;
    location_name?: string | null;
    price?: number | null;
    max_guestlist_capacity?: number | null;
    has_guestlist?: boolean | null;
    has_guestlist_chat?: boolean | null;
    payment_qr_url?: string | null;
    show_menu_button?: boolean | null;
    show_reservation_button?: boolean | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { value: "party", label: "Fiesta" },
  { value: "bar", label: "Bar" },
  { value: "concert", label: "Concierto" },
  { value: "festival", label: "Festival" },
  { value: "rooftop", label: "Rooftop" },
  { value: "restaurant", label: "Restaurante" },
  { value: "coffee", label: "Café" },
  { value: "fitness", label: "Fitness" },
  { value: "culture", label: "Cultura" },
];

export function EditEventSheet({ event, open, onOpenChange }: EditEventSheetProps) {
  const updateEvent = useUpdateEvent();
  const { profile } = useAuth();
  const isBusiness = profile?.is_business === true;
  const reservationsEnabled = (profile as any)?.reservations_enabled === true;
  const { data: myMenu } = useMyMenu();
  const hasMenuItems = (myMenu?.items?.length ?? 0) > 0;
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isCompressingQr, setIsCompressingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: event.title || "",
    description: event.description || "",
    category: event.category || "",
    start_datetime: format(new Date(event.start_datetime), "yyyy-MM-dd'T'HH:mm"),
    location_name: event.location_name || "",
    price: event.price?.toString() || "0",
    max_guestlist_capacity: event.max_guestlist_capacity?.toString() || "",
    has_guestlist: event.has_guestlist || false,
    has_guestlist_chat: event.has_guestlist_chat ?? true,
    payment_qr_url: event.payment_qr_url || "",
    show_menu_button: event.show_menu_button ?? false,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        title: event.title || "",
        description: event.description || "",
        category: event.category || "",
        start_datetime: format(new Date(event.start_datetime), "yyyy-MM-dd'T'HH:mm"),
        location_name: event.location_name || "",
        price: event.price?.toString() || "0",
        max_guestlist_capacity: event.max_guestlist_capacity?.toString() || "",
        has_guestlist: event.has_guestlist || false,
        has_guestlist_chat: event.has_guestlist_chat ?? true,
        payment_qr_url: event.payment_qr_url || "",
        show_menu_button: event.show_menu_button ?? false,
      });
    }
  }, [open, event]);

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
      await updateEvent.mutateAsync({
        eventId: event.id,
        data: {
          title: formData.title,
          description: formData.description || null,
          category: formData.category || null,
          start_datetime: new Date(formData.start_datetime).toISOString(),
          location_name: formData.location_name || null,
          price: parseFloat(formData.price) || 0,
          max_guestlist_capacity: formData.max_guestlist_capacity ? parseInt(formData.max_guestlist_capacity) : null,
          has_guestlist: formData.has_guestlist,
          has_guestlist_chat: formData.has_guestlist ? formData.has_guestlist_chat : null,
          payment_qr_url: formData.payment_qr_url || null,
          show_menu_button: formData.show_menu_button,
        },
      });
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

      toast.success("Evento actualizado exitosamente");
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
          <SheetTitle>Editar evento</SheetTitle>
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
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={formData.location_name}
              onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              placeholder="Ubicación del evento"
            />
          </div>

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

          {formData.has_guestlist && (
            <>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidad máxima (opcional)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.max_guestlist_capacity}
                  onChange={(e) => setFormData({ ...formData, max_guestlist_capacity: e.target.value })}
                  placeholder="Dejar vacío para ilimitado"
                />
              </div>

              {/* Group chat toggle */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <Label htmlFor="guestlist-chat">Chat grupal</Label>
                    <span className="text-xs text-muted-foreground">
                      Crear un chat con todos los invitados
                    </span>
                  </div>
                </div>
                <Switch
                  id="guestlist-chat"
                  checked={formData.has_guestlist_chat}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, has_guestlist_chat: checked });
                  }}
                />
              </div>
            </>
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
