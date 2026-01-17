import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Camera, Plus, X, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProfilePhoto {
  id: string;
  photo_url: string;
  display_order: number;
}

const EditProfile = () => {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    bio: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
      });
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchPhotos();
    }
  }, [user]);

  const fetchPhotos = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profile_photos")
      .select("*")
      .eq("user_id", user.id)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setPhotos(data);
    }
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

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name.trim() || null,
          username: formData.username.trim(),
          bio: formData.bio.trim() || null,
          avatar_url: avatarUrl,
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

      const { data: { publicUrl } } = supabase.storage
        .from("event-images")
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast.success("¡Foto subida!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Error al subir foto");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPhotoClick = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/photos/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("event-images")
        .getPublicUrl(fileName);

      // Insert into profile_photos table
      const { error: insertError } = await supabase
        .from("profile_photos")
        .insert({
          user_id: user.id,
          photo_url: publicUrl,
          display_order: photos.length,
        });

      if (insertError) throw insertError;

      await fetchPhotos();
      toast.success("¡Foto agregada!");
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Error al subir foto");
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from("profile_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;

      setPhotos(photos.filter((p) => p.id !== photoId));
      toast.success("Foto eliminada");
    } catch (error: any) {
      console.error("Error deleting photo:", error);
      toast.error("Error al eliminar foto");
    }
  };

  return (
    <AppLayout>
      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Header */}
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
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSave}
            disabled={isLoading}
          >
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

        {/* Photos Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <Label>Fotos de Perfil</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddPhotoClick}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Agregar Foto
            </Button>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Sin fotos aún. ¡Agrega algunas para mostrar en tu perfil!
            </div>
          ) : (
            <div className="masonry-grid">
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="masonry-item relative group"
                >
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src={photo.photo_url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-foreground" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default EditProfile;
