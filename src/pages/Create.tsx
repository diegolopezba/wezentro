import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  Calendar,
  DollarSign,
  Users,
  X,
  Loader2,
  ImageIcon,
  Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LocationPicker } from "@/components/map/LocationPicker";
import { 
  isVideoFile, 
  isImageFile, 
  validateVideoFile, 
  validateImageFile,
  formatDuration 
} from "@/lib/mediaUtils";

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [location, setLocation] = useState({
    address: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
    time: "",
    price: "",
    capacity: "",
    hasGuestlist: false,
  });

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isVideoFile(file)) {
      // Validate video (15s max, 50MB max)
      const validation = await validateVideoFile(file, 15, 50);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      setMediaType('video');
      setVideoDuration(validation.duration || null);
    } else if (isImageFile(file)) {
      // Validate image (5MB max)
      const validation = validateImageFile(file, 5);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      setMediaType('image');
      setVideoDuration(null);
    } else {
      toast.error("Please upload an image or video file");
      return;
    }

    setMediaFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    setVideoDuration(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    setIsUploading(true);
    setUploadProgress(0);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', async () => {
        setIsUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          const { data } = supabase.storage
            .from("event-images")
            .getPublicUrl(fileName);
          resolve(data.publicUrl);
        } else {
          reject(new Error('Upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        setIsUploading(false);
        reject(new Error('Upload failed'));
      });

      // Get the upload URL and auth token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/event-images/${fileName}`;

      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.send(file);
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to create an event");
      navigate("/auth");
      return;
    }

    // Validation
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

      // Upload media if selected
      if (mediaFile) {
        imageUrl = await uploadMedia(mediaFile);
      }

      // Combine date and time into a single datetime
      const startDatetime = new Date(`${formData.date}T${formData.time}`);

      const { data, error } = await supabase
        .from("events")
        .insert({
          title: formData.title.trim() || null,
          description: formData.description.trim() || null,
          category: formData.category || null,
          start_datetime: startDatetime.toISOString(),
          location_name: location.address.trim() || null,
          latitude: location.latitude,
          longitude: location.longitude,
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

      // If event has guestlist, create the group chat and add creator
      if (formData.hasGuestlist && data.id) {
        const { data: chat, error: chatError } = await supabase
          .from("chats")
          .insert({
            type: "event",
            event_id: data.id,
            name: formData.title.trim() || "Event Chat",
          })
          .select()
          .single();

        if (!chatError && chat) {
          await supabase.from("chat_participants").insert({
            chat_id: chat.id,
            user_id: user.id,
          });
        }
      }

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
            {mediaPreview ? (
              <div className="relative h-48 rounded-2xl overflow-hidden">
                {mediaType === 'video' ? (
                  <video
                    src={mediaPreview}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Event cover"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Upload progress overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <div className="w-3/4">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Uploading... {uploadProgress}%
                      </p>
                    </div>
                  </div>
                )}
                
                {!isUploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      removeMedia();
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-xs text-foreground flex items-center gap-2">
                  {mediaType === 'video' ? (
                    <>
                      <Video className="w-3 h-3" />
                      {videoDuration && formatDuration(videoDuration)}
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3 h-3" />
                      Change image
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative h-48 rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Upload cover image or video
                </span>
                <span className="text-xs text-muted-foreground/60 mt-1">
                  Max 15 seconds for videos
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              onChange={handleMediaChange}
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
              Event Title
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

          <LocationPicker
            value={location}
            onChange={setLocation}
          />

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
          disabled={isSubmitting || isUploading}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {isUploading ? `Uploading... ${uploadProgress}%` : "Creating..."}
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
