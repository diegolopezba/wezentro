import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Camera, Loader2, Info, MapPin, Clock, Phone, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BusinessLocationPicker } from "@/components/profile/BusinessLocationPicker";
import { compressImage, blobToFile } from "@/lib/mediaCompression";

const GENDER_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "non_binary", label: "No binario" },
  { value: "prefer_not_to_say", label: "Prefiero no decir" },
];

const EditProfile = () => {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    bio: "",
    birth_day: "",
    birth_month: "",
    birth_year: "",
    gender: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [businessLocation, setBusinessLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    address: string | null;
  }>({
    latitude: null,
    longitude: null,
    address: null,
  });
  const [businessInfo, setBusinessInfo] = useState({
    hours: "",
    phone: "",
  });
  const [reservationCapacity, setReservationCapacity] = useState<string>("");

  const isBusiness = profile?.is_business === true;
  const isFoodBusiness = profile?.is_food_business === true;

  useEffect(() => {
    if (profile) {
      let birthDay = "";
      let birthMonth = "";
      let birthYear = "";
      if (profile.birth_date) {
        const date = new Date(profile.birth_date);
        birthDay = date.getDate().toString().padStart(2, "0");
        birthMonth = (date.getMonth() + 1).toString().padStart(2, "0");
        birthYear = date.getFullYear().toString();
      }
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        birth_day: birthDay,
        birth_month: birthMonth,
        birth_year: birthYear,
        gender: profile.gender || "",
      });
      setAvatarUrl(profile.avatar_url);
      setBusinessLocation({
        latitude: profile.business_latitude || null,
        longitude: profile.business_longitude || null,
        address: profile.business_address || null,
      });
      setBusinessInfo({
        hours: profile.business_hours || "",
        phone: profile.business_phone || "",
      });
      setReservationCapacity(
        (profile as any).reservation_capacity != null ? String((profile as any).reservation_capacity) : ""
      );
    }
  }, [profile]);

  const handleBusinessLocationChange = (
    lat: number | null,
    lng: number | null,
    address: string | null
  ) => {
    setBusinessLocation({
      latitude: lat,
      longitude: lng,
      address,
    });
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para actualizar tu perfil");
      return;
    }
    if (!formData.username.trim()) {
      toast.error("El nombre de usuario es requerido");
      return;
    }
    setIsLoading(true);
    try {
      if (formData.username !== profile?.username) {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", formData.username.trim())
          .neq("id", user.id)
          .maybeSingle();
        if (existingUser) {
          toast.error("Ese nombre de usuario ya está en uso");
          setIsLoading(false);
          return;
        }
      }

      let birthDate: string | null = null;
      if (formData.birth_day && formData.birth_month && formData.birth_year) {
        const year = parseInt(formData.birth_year);
        const month = parseInt(formData.birth_month);
        const day = parseInt(formData.birth_day);
        if (
          year >= 1900 &&
          year <= new Date().getFullYear() - 13 &&
          month >= 1 &&
          month <= 12 &&
          day >= 1 &&
          day <= 31
        ) {
          birthDate = `${formData.birth_year}-${formData.birth_month.padStart(2, "0")}-${formData.birth_day.padStart(2, "0")}`;
        }
      }

      // Build update object
      const updateData: Record<string, unknown> = {
        full_name: formData.full_name.trim() || null,
        username: formData.username.trim(),
        bio: formData.bio.trim() || null,
        avatar_url: avatarUrl,
        birth_date: birthDate,
        gender: formData.gender || null,
      };

      // Add business fields if business account
      if (isBusiness) {
        updateData.business_latitude = businessLocation.latitude;
        updateData.business_longitude = businessLocation.longitude;
        updateData.business_address = businessLocation.address;
        updateData.business_hours = businessInfo.hours.trim() || null;
        updateData.business_phone = businessInfo.phone.trim() || null;
        if (isFoodBusiness) {
          const cap = parseInt(reservationCapacity);
          updateData.reservation_capacity = isNaN(cap) || cap <= 0 ? null : cap;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success("¡Perfil actualizado exitosamente!");
      navigate("/settings");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Error al actualizar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 10MB");
      return;
    }

    setIsCompressing(true);
    let fileToUpload = file;

    try {
      const result = await compressImage(file, 512, 0.85);
      fileToUpload = blobToFile(result.blob, file.name);
    } catch (error) {
      console.error("Compression failed, using original:", error);
    } finally {
      setIsCompressing(false);
    }

    setIsUploading(true);
    try {
      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, fileToUpload, { upsert: true });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("event-images").getPublicUrl(fileName);
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success("¡Foto subida!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Error al subir foto");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AppLayout>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-brand text-xl font-bold text-foreground">
              Editar Perfil
            </h1>
          </div>
          <Button variant="default" size="sm" onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-8">
        {/* Profile Picture */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <img
              src={
                avatarUrl ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80"
              }
              alt="Perfil"
              className="w-28 h-28 rounded-full object-cover border-2 border-primary"
            />
            <button
              onClick={handleAvatarClick}
              disabled={isUploading || isCompressing}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-glow disabled:opacity-50 bg-primary"
            >
              {isUploading || isCompressing ? (
                <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-primary-foreground" />
              )}
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Toca para cambiar foto de perfil
          </p>
        </motion.div>

        {/* Form Fields */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={formData.full_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, full_name: e.target.value }))
              }
              placeholder="Tu nombre"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Nombre de usuario *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, username: e.target.value }))
                }
                placeholder="usuario"
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biografía</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Cuéntanos sobre ti..."
              rows={3}
            />
          </div>
        </motion.div>

        {/* Personal Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-5"
        >
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">Información Personal</Label>
            <span className="text-xs text-muted-foreground">(opcional)</span>
          </div>

          <div className="space-y-2">
            <Label>Fecha de nacimiento</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="DD"
                maxLength={2}
                value={formData.birth_day}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData((prev) => ({ ...prev, birth_day: value }));
                }}
                className="w-16 text-center"
              />
              <Input
                type="text"
                inputMode="numeric"
                placeholder="MM"
                maxLength={2}
                value={formData.birth_month}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData((prev) => ({ ...prev, birth_month: value }));
                }}
                className="w-16 text-center"
              />
              <Input
                type="text"
                inputMode="numeric"
                placeholder="AAAA"
                maxLength={4}
                value={formData.birth_year}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData((prev) => ({ ...prev, birth_year: value }));
                }}
                className="w-24 text-center"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Género</Label>
            <RadioGroup
              value={formData.gender}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, gender: value }))
              }
              className="flex flex-col gap-2"
            >
              {GENDER_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Esta información solo se usa para estadísticas agregadas de eventos. Nunca
              se comparte individualmente.
            </p>
          </div>
        </motion.div>

        {/* Business Information Section - For Business Accounts */}
        {isBusiness && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-5"
          >
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold">Información del Negocio</Label>
            </div>

            {/* Location Picker - Only for Food businesses */}
            {isFoodBusiness && (
              <BusinessLocationPicker
                latitude={businessLocation.latitude}
                longitude={businessLocation.longitude}
                address={businessLocation.address}
                onLocationChange={handleBusinessLocationChange}
              />
            )}

            {/* Business Hours */}
            <div className="space-y-2">
              <Label htmlFor="business-hours" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Horarios de atención
              </Label>
              <Textarea
                id="business-hours"
                value={businessInfo.hours}
                onChange={(e) =>
                  setBusinessInfo((prev) => ({ ...prev, hours: e.target.value }))
                }
                placeholder="Ej: Lun-Vie: 9:00-18:00&#10;Sab: 10:00-14:00"
                rows={3}
              />
            </div>

            {/* Business Phone */}
            <div className="space-y-2">
              <Label htmlFor="business-phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Teléfono de contacto
              </Label>
              <Input
                id="business-phone"
                type="tel"
                value={businessInfo.phone}
                onChange={(e) =>
                  setBusinessInfo((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+591 70000000"
              />
            </div>

            {/* Reservation Capacity - only for food businesses */}
            {isFoodBusiness && (
              <div className="space-y-2">
                <Label htmlFor="reservation-capacity" className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Capacidad de reservas (personas por horario)
                </Label>
                <Input
                  id="reservation-capacity"
                  type="number"
                  min={1}
                  value={reservationCapacity}
                  onChange={(e) => setReservationCapacity(e.target.value)}
                  placeholder="Ej: 50"
                />
                <p className="text-xs text-muted-foreground">
                  Número máximo de personas que pueden reservar en un mismo horario.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Esta información será visible para los usuarios que visiten tu perfil a
                través del ícono de información.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default EditProfile;
