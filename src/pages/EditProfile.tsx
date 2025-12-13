import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Camera, Plus, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const EditProfile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "Mike Rodriguez",
    username: "nightowl_mike",
    bio: "Living for the night vibes 🌙 LA scene explorer",
  });
  const [profileImage, setProfileImage] = useState(
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80"
  );
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&q=80",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80",
  ]);

  const handleSave = () => {
    toast.success("Profile updated successfully!");
    navigate(-1);
  };

  const handleAddPhoto = () => {
    // Placeholder for photo upload functionality
    toast.info("Photo upload coming soon!");
  };

  const handleRemovePhoto = (index: number) => {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-brand text-xl font-bold text-foreground">
              Edit Profile
            </h1>
          </div>
          <Button variant="default" size="sm" onClick={handleSave}>
            Save
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
              src={profileImage}
              alt="Profile"
              className="w-28 h-28 rounded-full object-cover border-2 border-primary"
            />
            <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-glow">
              <Camera className="w-5 h-5 text-primary-foreground" />
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
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
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

        {/* Additional Photos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <Label>Additional Photos</Label>
          <div className="grid grid-cols-3 gap-3">
            {additionalPhotos.map((photo, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-destructive-foreground" />
                </button>
              </div>
            ))}
            {additionalPhotos.length < 6 && (
              <button
                onClick={handleAddPhoto}
                className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
              >
                <Plus className="w-8 h-8 text-muted-foreground" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Add up to 6 photos to showcase on your profile
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default EditProfile;
