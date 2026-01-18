import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Camera, Loader2, Info } from "lucide-react";
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

  useEffect(() => {
    if (profile) {
      // Parse birth_date if it exists
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
    }
  }, [profile]);

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
      // Check if username is taken (if changed)
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

      // Build birth_date if all parts are provided
      let birthDate: string | null = null;
      if (formData.birth_day && formData.birth_month && formData.birth_year) {
        const year = parseInt(formData.birth_year);
        const month = parseInt(formData.birth_month);
        const day = parseInt(formData.birth_day);

        // Validate date
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

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name.trim() || null,
          username: formData.username.trim(),
          bio: formData.bio.trim() || null,
          avatar_url: avatarUrl,
          birth_date: birthDate,
          gender: formData.gender || null,
        })
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

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-images").getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
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
      {/* Hidden file input */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-brand text-xl font-bold text-foreground">Editar Perfil</h1>
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
              src={avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80"}
              alt="Perfil"
              className="w-28 h-28 rounded-full object-cover border-2 border-primary"
            />
            <button
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-glow disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-primary-foreground" />
              )}
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">Toca para cambiar foto de perfil</p>
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
              onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
              placeholder="Tu nombre"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Nombre de usuario *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
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
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
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

          {/* Date of Birth */}
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

          {/* Gender */}
          <div className="space-y-3">
            <Label>Género</Label>
            <RadioGroup
              value={formData.gender}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
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

          {/* Privacy Note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Esta información solo se usa para estadísticas agregadas de eventos. Nunca se comparte
              individualmente.
            </p>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default EditProfile;
