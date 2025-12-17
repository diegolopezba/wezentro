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

const EditProfile = () => {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    bio: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in to update your profile");
      return;
    }

    if (!formData.username.trim()) {
      toast.error("Username is required");
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
          toast.error("Username is already taken");
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
      toast.success("Profile updated successfully!");
      navigate(-1);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to event-images bucket (reusing existing bucket)
      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("event-images")
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast.success("Photo uploaded!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AppLayout>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-brand text-xl font-bold text-foreground">
              Edit Profile
            </h1>
          </div>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
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
              alt="Profile"
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
            Tap to change profile photo
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
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.full_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, full_name: e.target.value }))
              }
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
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
                placeholder="username"
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default EditProfile;
