import { useState, useRef } from "react";
import { haptic } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Calendar,
  DollarSign,
  Users,
  X,
  Loader2,
  ImageIcon,
  Video,
  ChevronDown,
  UtensilsCrossed,
  CalendarCheck,
  Sparkles,
  PartyPopper } from
"lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LocationPicker } from "@/components/map/LocationPicker";
import { useCreateEvent } from "@/hooks/useEventMutations";
import {
  isVideoFile,
  isImageFile,
  validateVideoFile,
  validateImageFile,
  formatDuration } from
"@/lib/mediaUtils";
import { compressImage, blobToFile } from "@/lib/mediaCompression";
import { extractDescriptionTags } from "@/lib/descriptionTagExtractor";
import { MentionTextarea } from "@/components/ui/MentionTextarea";
import { useMyMenu } from "@/hooks/useMenu";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

type ContentType = "post" | "event";

const TYPE_OPTIONS: {id: ContentType;label: string;description: string;icon: React.ReactNode;color: string;}[] = [
{
  id: "post",
  label: "Post",
  description: "Comparte un momento, aventura o experiencia.",
  icon: <Sparkles className="w-5 h-5" />,
  color: "from-violet-500 to-indigo-500"
},
{
  id: "event",
  label: "Evento",
  description: "Crea un evento con fecha, lugar y lista de invitados",
  icon: <PartyPopper className="w-5 h-5" />,
  color: "from-[hsl(var(--accent-red))] to-pink-500"
}];


const Create = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusiness = profile?.is_business === true;
  const reservationsEnabled = (profile as any)?.reservations_enabled === true;
  const { data: myMenu } = useMyMenu();
  const hasMenuItems = (myMenu?.items?.length ?? 0) > 0;

  const { invalidateAfterCreate } = useCreateEvent();

  // ── Type selection state — pre-seeded from ?type= query param ──
  const initialType = (searchParams.get("type") === "event" ? "event" : "post") as ContentType;
  const [contentType, setContentType] = useState<ContentType>(initialType);
  const isPost = contentType === "post";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [location, setLocation] = useState({
    address: "",
    latitude: null as number | null,
    longitude: null as number | null
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
    showMenuButton: false,
    showReservationButton: false
  });

  const handleTypeChange = (type: ContentType) => {
    setContentType(type);
    // Reset event-only fields when switching to post
    if (type === "post") {
      setFormData((prev) => ({
        ...prev,
        date: "",
        time: "",
        price: "",
        capacity: "",
        hasGuestlist: false,
        showReservationButton: false
      }));
      setLocation({ address: "", latitude: null, longitude: null });
    }
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isVideoFile(file)) {
      const validation = await validateVideoFile(file, 30, 20);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      if (validation.warning) toast.info(validation.warning);
      setMediaType("video");
      setVideoDuration(validation.duration || null);
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (isImageFile(file)) {
      const validation = validateImageFile(file, 10);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      setIsCompressing(true);
      try {
        const result = await compressImage(file, 1920, 0.8);
        const compressedFile = blobToFile(result.blob, file.name);
        setMediaType("image");
        setVideoDuration(null);
        setMediaFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => setMediaPreview(reader.result as string);
        reader.readAsDataURL(compressedFile);
        if (result.compressionRatio > 20) {
          toast.success(`Imagen optimizada (${result.compressionRatio}% más pequeña)`);
        }
      } catch {
        setMediaType("image");
        setVideoDuration(null);
        setMediaFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setMediaPreview(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    } else {
      toast.error("Por favor sube una imagen o video");
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    setVideoDuration(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("No autenticado");
      return null;
    }
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    setIsUploading(true);
    setUploadProgress(0);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round(event.loaded / event.total * 100));
        }
      });
      xhr.addEventListener("load", async () => {
        setIsUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          const { data } = supabase.storage.from("event-images").getPublicUrl(fileName);
          resolve(data.publicUrl);
        } else {
          reject(new Error("Error al subir"));
        }
      });
      xhr.addEventListener("error", () => {
        setIsUploading(false);
        reject(new Error("Error al subir"));
      });
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/event-images/${fileName}`;
      xhr.open("POST", uploadUrl);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.send(file);
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Inicia sesión para crear");
      navigate("/auth");
      return;
    }
    if (!mediaFile) {
      toast.error("Por favor sube una imagen o video");
      return;
    }
    if (formData.hasGuestlist && !isBusiness) {
      toast.error("Cambia a cuenta Business en Configuración para habilitar listas de invitados");
      return;
    }
    if (!isPost && (!formData.date || !formData.time)) {
      toast.error("Por favor ingresa la fecha y hora del evento");
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (mediaFile) imageUrl = await uploadMedia(mediaFile);

      let startDatetime: string | null = null;
      if (!isPost && formData.date && formData.time) {
        startDatetime = new Date(`${formData.date}T${formData.time}`).toISOString();
      }

      const descriptionTags = extractDescriptionTags(
        formData.description.trim(),
        formData.title.trim(),
        formData.category
      );

      const { data, error } = await supabase.
      from("events").
      insert({
        title: formData.title.trim() || null,
        description: formData.description.trim() || null,
        category: formData.category || null,
        start_datetime: startDatetime,
        location_name: isPost ? null : location.address.trim() || null,
        latitude: isPost ? null : location.latitude,
        longitude: isPost ? null : location.longitude,
        price: !isPost && formData.price ? parseFloat(formData.price) : 0,
        max_guestlist_capacity: formData.capacity ? parseInt(formData.capacity) : null,
        has_guestlist: !isPost && formData.hasGuestlist,
        image_url: imageUrl,
        creator_id: user.id,
        is_public: true,
        is_post: isPost,
        description_tags: descriptionTags.length > 0 ? descriptionTags : null,
        show_menu_button: isBusiness && hasMenuItems ? formData.showMenuButton : false,
        show_reservation_button: isBusiness && reservationsEnabled && isPost ? formData.showReservationButton : false
      }).
      select().
      single();

      if (error) throw error;

      if (data.id && formData.description.trim()) {
        const mentionRegex = /(?<!\w)@([a-zA-Z0-9_]+)/g;
        const usernames = new Set<string>();
        let match;
        while ((match = mentionRegex.exec(formData.description)) !== null) {
          usernames.add(match[1].toLowerCase());
        }
        if (usernames.size > 0) {
          const { data: profiles } = await supabase.
          from("profiles").
          select("id, username").
          in("username", Array.from(usernames)).
          neq("id", user.id);
          if (profiles && profiles.length > 0) {
            for (const p of profiles) {
              try {
                await supabase.from("event_tags").insert({
                  event_id: data.id,
                  tagged_user_id: p.id,
                  tagged_by: user.id
                });
              } catch (tagError) {
                console.error("Error tagging user:", tagError);
              }
            }
          }
        }
      }

      toast.success(isPost ? "¡Post publicado!" : "¡Evento creado exitosamente!");
      haptic("success");
      invalidateAfterCreate();
      navigate(`/event/${data.id}`, { state: { fromCreate: true }, replace: true });
    } catch (error: any) {
      console.error("Error creating:", error);
      toast.error(error.message || "Error al crear");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg">
        <div className="px-4 py-4">
          <h1 className="font-brand text-xl font-bold text-foreground">Crear</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 pb-24">

        {/* ── Type selector (Instagram-style wheel) ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3">
          
          {TYPE_OPTIONS.map((option) => {
            const active = contentType === option.id;
            return (
              <motion.button
                key={option.id}
                type="button"
                onClick={() => handleTypeChange(option.id)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 text-center",
                  active ?
                  "border-primary/60 bg-primary/10" :
                  "border-border bg-secondary/40 hover:bg-secondary/70"
                )}>
                
                {/* Gradient icon bubble */}
                








                
                <div>
                  <p className={cn(
                    "font-semibold text-sm leading-tight",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {option.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {option.description}
                  </p>
                </div>
                {/* Active indicator dot */}
                {active &&
                <motion.div
                  layoutId="type-active-dot"
                  className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }} />

                }
              </motion.button>);

          })}
        </motion.div>

        {/* ── Media upload ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <label className="block">
            {mediaPreview ?
            <div className="relative rounded-2xl overflow-hidden">
                {mediaType === "video" ?
              <video src={mediaPreview} className="w-full object-contain" muted playsInline /> :

              <img src={mediaPreview} alt="Portada" className="w-full object-contain" />
              }
                {(isUploading || isCompressing) &&
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <div className="w-3/4">
                      {isCompressing ?
                  <p className="text-xs text-muted-foreground text-center">Optimizando imagen...</p> :

                  <>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.2 }} />
                      
                          </div>
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            Subiendo... {uploadProgress}%
                          </p>
                        </>
                  }
                    </div>
                  </div>
              }
                {!isUploading && !isCompressing &&
              <button
                type="button"
                onClick={(e) => {e.preventDefault();removeMedia();}}
                className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors">
                
                    <X className="w-4 h-4" />
                  </button>
              }
                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-xs text-foreground flex items-center gap-2">
                  {mediaType === "video" ?
                <><Video className="w-3 h-3" />{videoDuration && formatDuration(videoDuration)}</> :

                <><ImageIcon className="w-3 h-3" />Cambiar imagen</>
                }
                </div>
              </div> :

            <div className="relative h-48 rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                {isCompressing ?
              <>
                    <Loader2 className="w-10 h-10 text-primary mb-2 animate-spin" />
                    <span className="text-sm text-muted-foreground">Optimizando imagen...</span>
                  </> :

              <>
                    <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {isPost ? "Sube una foto o video" : "Portada del evento"}
                    </span>
                    <span className="text-xs text-muted-foreground/60 mt-1">Máx. 30 segundos para videos</span>
                  </>
              }
              </div>
            }
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              onChange={handleMediaChange}
              className="hidden" />
            
          </label>
        </motion.div>

        {/* ── Text fields ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-4">
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {isPost ? "Título" : "Nombre del evento"}
            </label>
            <Input
              placeholder={isPost ? "Dale un título a tu post" : "Dale un nombre atractivo"}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={100} />
            
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Descripción</label>
            <MentionTextarea
              placeholder={isPost ?
              "Cuéntalo, usa @usuario para mencionar..." :
              "Describe tu evento... usa @usuario para mencionar"}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={2000}
              className="rounded-xl border-border bg-secondary/50 px-4 py-3 text-base min-h-[120px] resize-none"
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 300);
              }}
            />
          </div>
        </motion.div>

        {/* ── Category ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <button
            type="button"
            onClick={() => setCategoryOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground transition-colors hover:bg-secondary/80">
            
            <span className="flex items-center gap-2">
              {formData.category ?
              (() => {
                const cat = CATEGORIES.find((c) => c.id === formData.category);
                return cat ?
                <><span>{cat.emoji}</span><span>{cat.label}</span></> :
                <span className="text-muted-foreground">Seleccionar categoría</span>;
              })() :
              <span className="text-muted-foreground">Seleccionar categoría</span>}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${categoryOpen ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {categoryOpen &&
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden">
              
                <div className="flex flex-wrap gap-2 pt-3">
                  {CATEGORIES.map((category) =>
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, category: category.id });
                    setCategoryOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  formData.category === category.id ?
                  "gradient-primary text-primary-foreground shadow-glow" :
                  "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`
                  }>
                  
                      <span>{category.emoji}</span>
                      <span className="text-sm font-medium">{category.label}</span>
                    </button>
                )}
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </motion.div>

        {/* ── Event-only fields (date, time, location, price, capacity) ── */}
        <AnimatePresence>
          {!isPost &&
          <motion.div
            key="event-fields"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden space-y-4">
            
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Fecha</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                    type="date"
                    className="pl-10"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]} />
                  
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Hora</label>
                  <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
                
                </div>
              </div>

              <LocationPicker value={location} onChange={setLocation} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Precio</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                    type="number"
                    placeholder="0 (Gratis)"
                    className="pl-10"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    min="0"
                    step="0.01" />
                  
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Capacidad</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                    type="number"
                    placeholder="Ilimitada"
                    className="pl-10"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    min="1" />
                  
                  </div>
                </div>
              </div>
            </motion.div>
          }
        </AnimatePresence>

        {/* ── Collaborator section ── */}
        {/* ── Guestlist toggle (events only) ── */}
        <AnimatePresence>
          {!isPost &&
          <motion.div
            key="guestlist-toggle"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden">
            
              <Card className="glass border-white/10 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Lista de Invitados</h3>
                      <p className="text-xs text-muted-foreground">
                        {isBusiness ?
                      "Crea una lista de invitados para tu evento" :
                      "Requiere cuenta Business (gratis en Configuración)"}
                      </p>
                    </div>
                  </div>
                  <button
                  type="button"
                  onClick={() => {
                    if (!isBusiness) {
                      toast.info("Activa tu cuenta Business en Configuración para usar guestlists", {
                        action: { label: "Ir", onClick: () => navigate("/settings") }
                      });
                      return;
                    }
                    setFormData({ ...formData, hasGuestlist: !formData.hasGuestlist });
                  }}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                  formData.hasGuestlist ? "bg-primary" : "bg-secondary"}`
                  }>
                  
                    <motion.div
                    animate={{ x: formData.hasGuestlist ? 22 : 2 }}
                    className="absolute top-1 w-5 h-5 rounded-full bg-foreground" />
                  
                  </button>
                </div>
              </Card>
            </motion.div>
          }
        </AnimatePresence>

        {/* ── Menu button toggle (business only) ── */}
        {isBusiness && hasMenuItems &&
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="glass border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Mostrar botón de menú</h3>
                    <p className="text-xs text-muted-foreground">Los visitantes podrán abrir tu menú</p>
                  </div>
                </div>
                <button
                type="button"
                onClick={() => setFormData({ ...formData, showMenuButton: !formData.showMenuButton })}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                formData.showMenuButton ? "bg-primary" : "bg-secondary"}`
                }>
                
                  <motion.div
                  animate={{ x: formData.showMenuButton ? 22 : 2 }}
                  className="absolute top-1 w-5 h-5 rounded-full bg-foreground" />
                
                </button>
              </div>
            </Card>
          </motion.div>
        }

        {/* ── Reservation button toggle (business + posts only) ── */}
        {isBusiness && reservationsEnabled && isPost &&
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="glass border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Mostrar botón Reservar</h3>
                    <p className="text-xs text-muted-foreground">Los visitantes podrán reservar una mesa</p>
                  </div>
                </div>
                <button
                type="button"
                onClick={() => setFormData({ ...formData, showReservationButton: !formData.showReservationButton })}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                formData.showReservationButton ? "bg-primary" : "bg-secondary"}`
                }>
                
                  <motion.div
                  animate={{ x: formData.showReservationButton ? 22 : 2 }}
                  className="absolute top-1 w-5 h-5 rounded-full bg-foreground" />
                
                </button>
              </div>
            </Card>
          </motion.div>
        }

        {/* ── Publish button ── */}
        <div className="pt-2">
          <Button
            variant="hero"
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}>
            
            {isSubmitting ?
            <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {isUploading ? `Subiendo... ${uploadProgress}%` : "Creando..."}
              </> :
            isPost ?
            "Publicar Post" :

            "Crear Evento"
            }
          </Button>
        </div>
      </div>

    </AppLayout>);

};

export default Create;