import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  X,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categories = [
  { id: "club", label: "Club", emoji: "🪩" },
  { id: "bar", label: "Bar", emoji: "🍸" },
  { id: "concert", label: "Concert", emoji: "🎵" },
  { id: "festival", label: "Festival", emoji: "🎪" },
  { id: "house_party", label: "House Party", emoji: "🏠" },
];

const Create = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
    time: "",
    location: "",
    price: "",
    capacity: "",
    hasGuestlist: false,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("event-images")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("event-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to create an event");
      navigate("/auth");
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error("Please enter an event title");
      return;
    }
    if (!formData.date || !formData.time) {
      toast.error("Please select a date and time");
      return;
    }

    // Check business premium for guestlist
    if (formData.hasGuestlist && !profile?.is_business) {
      toast.error("Business Premium required to enable guestlists");
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | null = null;

      // Upload image if selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Combine date and time into a single datetime
      const startDatetime = new Date(`${formData.date}T${formData.time}`);

      const { data, error } = await supabase
        .from("events")
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category || null,
          start_datetime: startDatetime.toISOString(),
          location_name: formData.location.trim() || null,
          price: formData.price ? parseFloat(formData.price) : 0,
          max_guestlist_capacity: formData.capacity
            ? parseInt(formData.capacity)
            : null,
          has_guestlist: formData.hasGuestlist,
          image_url: imageUrl,
          creator_id: user.id,
          is_public: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Event created successfully!");
      navigate(`/event/${data.id}`);
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast.error(error.message || "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout hideNav>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg">
        <div className="flex items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">
            Create Event
          </h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 pb-32">
        {/* Media upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <label className="block">
            {imagePreview ? (
              <div className="relative h-48 rounded-2xl overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Event cover"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    removeImage();
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-xs text-foreground flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" />
                  Change image
                </div>
              </div>
            ) : (
              <div className="relative h-48 rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Upload cover image
                </span>
                <span className="text-xs text-muted-foreground/60 mt-1">
                  Recommended: 1080 x 1350px
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </motion.div>

        {/* Category selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <label className="text-sm font-medium text-foreground mb-3 block">
            Event Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, category: category.id })
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  formData.category === category.id
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <span>{category.emoji}</span>
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Event details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Event Title *
            </label>
            <Input
              placeholder="Give your event a catchy name"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Description
            </label>
            <textarea
              placeholder="Tell people what your event is about..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              maxLength={2000}
              className="flex w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary min-h-[120px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-10"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Time *
              </label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter venue or address"
                className="pl-10"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                maxLength={200}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Price
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0 (Free)"
                  className="pl-10"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Capacity
              </label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Unlimited"
                  className="pl-10"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  min="1"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Guestlist toggle - Premium feature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="glass border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Enable Guestlist
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {profile?.is_business
                      ? "Create a guestlist for your event"
                      : "Requires Business Premium"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!profile?.is_business) {
                    toast.error(
                      "Upgrade to Business Premium to enable guestlists"
                    );
                    return;
                  }
                  setFormData({
                    ...formData,
                    hasGuestlist: !formData.hasGuestlist,
                  });
                }}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  formData.hasGuestlist ? "bg-primary" : "bg-secondary"
                }`}
              >
                <motion.div
                  animate={{ x: formData.hasGuestlist ? 22 : 2 }}
                  className="absolute top-1 w-5 h-5 rounded-full bg-foreground"
                />
              </button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass-strong safe-bottom">
        <Button
          variant="hero"
          className="w-full"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Event"
          )}
        </Button>
      </div>
    </AppLayout>
  );
};

export default Create;
