import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useUpdateEvent } from "@/hooks/useEventMutations";
import { toast } from "sonner";
import { format } from "date-fns";
import { useUserSubscription } from "@/hooks/useSubscription";
import { SubscriptionUpsellModal } from "@/components/subscription/SubscriptionUpsellModal";

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
  
  const [formData, setFormData] = useState({
    title: event.title || "",
    description: event.description || "",
    category: event.category || "",
    start_datetime: format(new Date(event.start_datetime), "yyyy-MM-dd'T'HH:mm"),
    location_name: event.location_name || "",
    price: event.price?.toString() || "0",
    max_guestlist_capacity: event.max_guestlist_capacity?.toString() || "",
    has_guestlist: event.has_guestlist || false,
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
      });
    }
  }, [open, event]);

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
        },
      });
      toast.success("Evento actualizado exitosamente");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar evento");
    }
  };

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
