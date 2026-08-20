import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { ArrowLeft, Clock, Phone, Store, Save, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BusinessHoursEditor, DaySchedule, DEFAULT_SCHEDULE, parseSchedule, serializeSchedule } from "@/components/profile/BusinessHoursEditor";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationPicker } from "@/components/map/LocationPicker";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { isFoodBusinessType, BUSINESS_TYPES } from "@/lib/businessTypes";
import { useDirtyBaseline, saveVariant } from "@/hooks/useDirtyBaseline";

const BusinessInfo = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savingType, setSavingType] = useState(false);

  const [businessHours, setBusinessHours] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessLocation, setBusinessLocation] = useState<{ address: string; latitude: number | null; longitude: number | null }>({ address: "", latitude: null, longitude: null });

  useSwipeBack();

  const { isDirty, capture } = useDirtyBaseline({ businessHours, businessPhone, businessLocation });

  const currentBusinessType = (profile as any)?.business_type || "";

  useEffect(() => {
    if (profile) {
      const raw = (profile as any).business_hours || "";
      const parsed = parseSchedule(raw);
      setBusinessHours(parsed || DEFAULT_SCHEDULE);
      setBusinessPhone((profile as any).business_phone || "");
      const loc = {
        address: (profile as any).business_address || "",
        latitude: (profile as any).business_latitude ?? null,
        longitude: (profile as any).business_longitude ?? null,
      };
      setBusinessLocation(loc);
      capture({
        businessHours: parsed || DEFAULT_SCHEDULE,
        businessPhone: (profile as any).business_phone || "",
        businessLocation: loc,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleBusinessTypeChange = async (value: string) => {
    if (!user) return;
    setSavingType(true);
    try {
      const isFood = isFoodBusinessType(value);
      const { error } = await supabase
        .from("profiles")
        .update({ business_type: value, is_food_business: isFood } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Tipo de negocio actualizado");
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar tipo de negocio");
    } finally {
      setSavingType(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          business_hours: serializeSchedule(businessHours),
          business_phone: businessPhone.trim() || null,
          business_address: businessLocation.address.trim() || null,
          business_latitude: businessLocation.latitude,
          business_longitude: businessLocation.longitude,
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Información guardada");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-medium text-foreground">Información del negocio</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {/* Business Type */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-4 px-4 rounded-xl bg-card border border-border space-y-2"
        >
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-4 h-4 text-muted-foreground" />
            <Label className="text-foreground font-semibold">Tipo de negocio</Label>
          </div>
          <Select
            value={currentBusinessType}
            onValueChange={handleBusinessTypeChange}
            disabled={savingType}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tu tipo de negocio" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <span className="flex items-center gap-2">
                    <span>{type.emoji}</span>
                    <span>{type.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </m.div>

        {/* Info fields */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="py-4 px-4 rounded-xl bg-card border border-border space-y-4"
        >
          {/* Hours */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> Horarios de atención
            </Label>
            <BusinessHoursEditor value={businessHours} onChange={setBusinessHours} />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="business-phone" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-3.5 h-3.5" /> Teléfono de contacto
            </Label>
            <Input
              id="business-phone"
              type="tel"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="+591 70000000"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" /> Dirección
            </Label>
            <LocationPicker value={businessLocation} onChange={setBusinessLocation} />
          </div>

          <Button
            size="sm"
            variant={saveVariant(isDirty)}
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="w-full"
          >
            {saving ? "Guardando..." : (
              <><Save className="w-4 h-4 mr-2" />Guardar información</>
            )}
          </Button>
        </m.div>
      </div>
    </div>
  );
};

export default BusinessInfo;
