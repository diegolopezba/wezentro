import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/map/LocationPicker";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BusinessLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  onLocationChange: (lat: number | null, lng: number | null, address: string | null) => void;
}

export const BusinessLocationPicker = ({
  latitude,
  longitude,
  address,
  onLocationChange,
}: BusinessLocationPickerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const { user, refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const handleLocationChange = (location: {
    address: string;
    latitude: number | null;
    longitude: number | null;
  }) => {
    onLocationChange(location.latitude, location.longitude, location.address);
  };

  const handleSaveLocation = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          business_latitude: latitude,
          business_longitude: longitude,
          business_address: address,
          is_food_business: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Ubicación guardada");
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("Error al guardar ubicación");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearLocation = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          business_latitude: null,
          business_longitude: null,
          business_address: null,
        })
        .eq("id", user.id);

      if (error) throw error;

      onLocationChange(null, null, null);
      await refreshProfile();
      toast.success("Ubicación eliminada");
    } catch (error) {
      console.error("Error clearing location:", error);
      toast.error("Error al eliminar ubicación");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <div>
          <Label className="text-foreground font-medium">Ubicación de tu negocio</Label>
          <p className="text-xs text-muted-foreground">
            Aparecerás en el mapa cuando busquen tu tipo de negocio
          </p>
        </div>
      </div>

      {showPicker ? (
        <div className="space-y-3">
          <LocationPicker
            value={{
              address: address || "",
              latitude: latitude,
              longitude: longitude,
            }}
            onChange={handleLocationChange}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPicker(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={isSaving || !latitude || !longitude}
              size="sm"
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </div>
        </div>
      ) : latitude && longitude ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Dirección actual</Label>
            <Input
              value={address || ""}
              readOnly
              className="bg-secondary/50"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPicker(true)}
              className="flex-1"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Cambiar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearLocation}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowPicker(true)}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Establecer ubicación
        </Button>
      )}
    </div>
  );
};
