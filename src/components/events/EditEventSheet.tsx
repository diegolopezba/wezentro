import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, X, QrCode } from "lucide-react";
import { useUpdateEvent } from "@/hooks/useEventMutations";
import { toast } from "sonner";
import { format } from "date-fns";
import { useUserSubscription } from "@/hooks/useSubscription";
import { SubscriptionUpsellModal } from "@/components/subscription/SubscriptionUpsellModal";
import { supabase } from "@/integrations/supabase/client";

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
    payment_qr_url?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { value: "club", label: "Club" },
  { value: "bar", label: "Bar" },
  { value: "concert", label: "Concierto" },
  { value: "festival", label: "Festival" },
  { value: "house_party", label: "Fiesta en casa" },
  { value: "rooftop", label: "Rooftop" },
  { value: "restaurant", label: "Restaurante" },
  { value: "coffee", label: "Café" },
];

export function EditEventSheet({ event, open, onOpenChange }: EditEventSheetProps) {
  const updateEvent = useUpdateEvent();
  const { data: subscription } = useUserSubscription();
  const hasBusinessSubscription = subscription?.plan_type === "business_premium";
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
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
    payment_qr_url: event.payment_qr_url || "",
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
        payment_qr_url: event.payment_qr_url || "",
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

    setIsUploadingQr(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("No autenticado");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}/payment-qr-${event.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("event-images").getPublicUrl(fileName);
      setFormData({ ...formData, payment_qr_url: data.publicUrl });
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
          payment_qr_url: formData.payment_qr_url || null,
        },
      });
      toast.success("Evento actualizado exitosamente");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar evento");
    }
  };

  const showPaymentQrSection = hasBusinessSubscription && formData.has_guestlist && parseFloat(formData.price) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Editar evento</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-120px)] pb-4">
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
            <Textarea
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
              {!hasBusinessSubscription && (
                <span className="text-xs text-muted-foreground">
                  Requiere suscripción Zentro Business
                </span>
              )}
            </div>
            <Switch
              id="guestlist"
              checked={formData.has_guestlist}
              onCheckedChange={(checked) => {
                if (checked && !hasBusinessSubscription) {
                  setShowUpsellModal(true);
                  return;
                }
                setFormData({ ...formData, has_guestlist: checked });
              }}
            />
          </div>

          {formData.has_guestlist && (
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
                    disabled={isUploadingQr}
                  >
                    {isUploadingQr ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Subir QR de Pago
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={updateEvent.isPending || !formData.title}
          >
            {updateEvent.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Guardar cambios
          </Button>
        </div>
      </SheetContent>

      <SubscriptionUpsellModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        feature="listas de invitados"
      />
    </Sheet>
  );
}
