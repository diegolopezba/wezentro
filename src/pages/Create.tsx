import { useState, useRef, useEffect } from "react";
import { haptic } from "@/lib/haptics";
import { m, AnimatePresence } from "framer-motion";
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
  PartyPopper,
  Lock,
  HelpCircle,
  Clock,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { TicketTiersEditor, type DraftTier, type TicketPricingMode, type TierSaleMode } from "@/components/events/TicketTiersEditor";
import { BusinessRequiredSheet } from "@/components/events/BusinessRequiredSheet";
import { BeneficiaryRequiredSheet } from "@/components/events/BeneficiaryRequiredSheet";
import { useReplaceTicketTiers } from "@/hooks/useTicketTiers";
import { EventVenueLayoutSection } from "@/components/venue/EventVenueLayoutSection";
import { useReplaceEventAreas, type DraftArea } from "@/hooks/useVenueLayouts";
import { useHasBeneficiary } from "@/hooks/useHasBeneficiary";
import { useBusinessExperiences } from "@/hooks/useExperiences";
import { FeatureIntroSheet, useFeatureIntro } from "@/components/business/FeatureIntroSheet";
import { CREATE_INTRO } from "@/components/business/featureIntroSteps";


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
  color: "from-neutral-200 to-neutral-400"
}];


const Create = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routerLocation = useLocation();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusiness = profile?.is_business === true;
  const reservationsEnabled = (profile as any)?.reservations_enabled === true;
  const experiencesEnabled = (profile as any)?.experiences_enabled === true;
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
  // Media items (carousel of up to 5)
  type MediaItem = {
    file: File;
    preview: string;
    type: "image" | "video";
    duration?: number | null;
  };
  const MAX_MEDIA = 5;
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
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
    endTime: "",
    price: "",
    capacity: "",
    showMenuButton: false,
    showReservationButton: false,
    isLocationSecret: false,
    waitlistEnabled: false,
    salesOpenAt: "",
    waitlistEarlyAccessHours: "0",
    waitlistTierKey: ""
  });

  // Ticket tier state (events only, business accounts)
  const [pricingMode, setPricingMode] = useState<TicketPricingMode>("single");
  const [tierSaleMode, setTierSaleMode] = useState<TierSaleMode>("parallel");
  const [draftTiers, setDraftTiers] = useState<DraftTier[]>([]);
  const replaceTiers = useReplaceTicketTiers();

  // Optional visual venue layout (events only, business accounts)
  const [useAreas, setUseAreas] = useState(false);
  const [draftAreas, setDraftAreas] = useState<DraftArea[]>([]);
  const replaceEventAreas = useReplaceEventAreas();
  const { hasBeneficiary } = useHasBeneficiary();

  // Optional link to a bookable experience (business only)
  const { data: myExperiences = [] } = useBusinessExperiences(
    isBusiness && experiencesEnabled ? user?.id : undefined,
  );
  const activeExperiences = myExperiences.filter((e) => e.is_active);
  const [experienceId, setExperienceId] = useState<string | null>(
    ((routerLocation.state as any)?.experienceId as string) ?? null,
  );
  const linkedExperience = myExperiences.find((e) => e.id === experienceId) ?? null;
  useEffect(() => {
    if (!experiencesEnabled && experienceId) setExperienceId(null);
  }, [experiencesEnabled, experienceId]);
  const [showBusinessGate, setShowBusinessGate] = useState(false);
  const [businessGateContext, setBusinessGateContext] = useState<"tickets" | "event">("tickets");
  const [showBeneficiaryGate, setShowBeneficiaryGate] = useState(false);
  const [beneficiaryGateContext, setBeneficiaryGateContext] = useState<"tickets" | "experience">("tickets");
  const { open: introOpen, setOpen: setIntroOpen, reopen: reopenIntro } = useFeatureIntro("create");
  const openBeneficiaryGate = (ctx: "tickets" | "experience" = "tickets") => {
    setBeneficiaryGateContext(ctx);
    setShowBeneficiaryGate(true);
  };
  const openBusinessGate = (ctx: "tickets" | "event" = "tickets") => {
    setBusinessGateContext(ctx);
    setShowBusinessGate(true);
  };
  const gatePaidAction = () => {
    if (!isBusiness) openBusinessGate("tickets");
    else if (!hasBeneficiary) openBeneficiaryGate("tickets");
  };



  const handleTypeChange = (type: ContentType) => {
    setContentType(type);
    // Reset event-only fields when switching to post
    if (type === "post") {
      setFormData((prev) => ({
        ...prev,
        date: "",
        time: "",
        endTime: "",
        price: "",
        capacity: "",
            showReservationButton: false
      }));
      setLocation({ address: "", latitude: null, longitude: null });
    }
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const processSingleFile = async (file: File): Promise<MediaItem | null> => {
    if (isVideoFile(file)) {
      const validation = await validateVideoFile(file, 60, 50);
      if (!validation.valid) {
        toast.error(validation.error);
        return null;
      }
      if (validation.warning) toast.info(validation.warning);
      const preview = await fileToDataUrl(file);
      return { file, preview, type: "video", duration: validation.duration ?? null };
    }
    if (isImageFile(file)) {
      const validation = validateImageFile(file, 10);
      if (!validation.valid) {
        toast.error(validation.error);
        return null;
      }
      try {
        const result = await compressImage(file, 1920, 0.8);
        const compressedFile = blobToFile(result.blob, file.name);
        const preview = await fileToDataUrl(compressedFile);
        return { file: compressedFile, preview, type: "image" };
      } catch {
        const preview = await fileToDataUrl(file);
        return { file, preview, type: "image" };
      }
    }
    toast.error("Por favor sube una imagen o video");
    return null;
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remainingSlots = MAX_MEDIA - mediaItems.length;
    if (remainingSlots <= 0) {
      toast.error(`Máximo ${MAX_MEDIA} archivos`);
      return;
    }
    const toProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.info(`Solo se añadirán ${remainingSlots} archivo(s) más`);
    }
    setIsCompressing(true);
    try {
      const processed: MediaItem[] = [];
      for (const f of toProcess) {
        const item = await processSingleFile(f);
        if (item) processed.push(item);
      }
      if (processed.length > 0) {
        setMediaItems((prev) => [...prev, ...processed]);
      }
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMediaAt = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
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

    // Videos (and any file >6MB) go through TUS resumable uploads for
    // reliability on mobile networks and to bypass the single-PUT size limits.
    const isVideo = file.type.startsWith("video/");
    const useResumable = isVideo || file.size > 6 * 1024 * 1024;

    if (useResumable) {
      try {
        const { resumableUpload } = await import("@/lib/resumableUpload");
        const url = await resumableUpload({
          bucket: "event-images",
          objectPath: fileName,
          file,
          onProgress: (p) => setUploadProgress(p),
        });
        setIsUploading(false);
        return url;
      } catch (err: any) {
        setIsUploading(false);
        console.error("[uploadMedia] resumable failed:", err);
        throw new Error(err?.message || "Error al subir el archivo");
      }
    }

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
          let msg = `Error al subir (${xhr.status})`;
          try {
            const parsed = JSON.parse(xhr.responseText);
            const detail = parsed.message || parsed.error;
            if (detail) msg = `${msg}: ${detail}`;
          } catch {
            if (xhr.responseText) msg = `${msg}: ${xhr.responseText.slice(0, 200)}`;
          }
          console.error("[uploadMedia] failed:", xhr.status, xhr.responseText);
          reject(new Error(msg));
        }
      });
      xhr.addEventListener("error", () => {
        setIsUploading(false);
        console.error("[uploadMedia] network error");
        reject(new Error("Error de red al subir"));
      });
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/event-images/${fileName}`;
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.send(file);
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Inicia sesión para crear");
      navigate("/auth");
      return;
    }
    // Events are a Business-only feature. Posts stay open to everyone.
    if (!isPost && !isBusiness) {
      openBusinessGate("event");
      return;
    }
    if (mediaItems.length === 0) {
      toast.error("Por favor sube al menos una imagen o video");
      return;
    }
    if (!isPost && (!formData.date || !formData.time)) {
      toast.error("Por favor ingresa la fecha y hora del evento");
      return;
    }

    // Optional visual layout (events only, business accounts)
    const useLayout = !isPost && isBusiness && useAreas && draftAreas.length > 0;
    if (!isPost && isBusiness && useAreas && draftAreas.length === 0) {
      toast.error("Añade al menos un área al plano o desactiva la venta por áreas");
      return;
    }
    const hasPaidArea = useLayout && draftAreas.some((a) => (a.price ?? 0) > 0);

    // Gate paid tickets: require Business + Qhantuy beneficiary
    const hasPaidSingle = !isPost && formData.price && parseFloat(formData.price) > 0;
    const hasPaidTier = !isPost && pricingMode === "tiers" && draftTiers.some((t) => parseFloat(t.price || "0") > 0);
    if (experienceId) {
      // Linked experiences are booked and paid through QR too: payouts are required.
      if (!isBusiness) { openBusinessGate("tickets"); return; }
      if (!hasBeneficiary) { openBeneficiaryGate("experience"); return; }
    } else if (hasPaidSingle || hasPaidTier || hasPaidArea || (!isPost && isBusiness && pricingMode === "tiers")) {
      if (!isBusiness) { openBusinessGate("tickets"); return; }
      if (!hasBeneficiary) { openBeneficiaryGate("tickets"); return; }
    }


    // Validate ticket tiers (events only, business + tiers mode)
    const cleanTiers: { name: string; price: number; capacity: number | null; description: string | null; display_order: number }[] = [];
    const useTiers = !isPost && isBusiness && !experienceId && pricingMode === "tiers";
    if (useTiers) {
      if (draftTiers.length === 0) {
        toast.error("Añade al menos un tipo de entrada");
        return;
      }
      for (const t of draftTiers) {
        if (!t.name.trim()) {
          toast.error("Cada entrada necesita un nombre");
          return;
        }
        // Empty price = free tier (Bs. 0)
        const price = t.price.trim() === "" ? 0 : parseFloat(t.price);
        if (isNaN(price) || price < 0) {
          toast.error(`Precio inválido para "${t.name}"`);
          return;
        }
        cleanTiers.push({
          name: t.name.trim(),
          price,
          capacity: t.capacity ? parseInt(t.capacity) : null,
          description: t.description.trim() || null,
          display_order: cleanTiers.length,
        });
      }
    }

    setIsSubmitting(true);
    try {
      // Upload all media items in order
      const uploadedMedia: { url: string; type: "image" | "video" }[] = [];
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        const url = await uploadMedia(item.file);
        if (!url) throw new Error("Falló la subida de un archivo");
        uploadedMedia.push({ url, type: item.type });
      }
      const imageUrl = uploadedMedia[0]?.url ?? null;

      let startDatetime: string | null = null;
      let endDatetime: string | null = null;
      if (!isPost && formData.date && formData.time) {
        const start = new Date(`${formData.date}T${formData.time}`);
        startDatetime = start.toISOString();
        if (formData.endTime) {
          const end = new Date(`${formData.date}T${formData.endTime}`);
          // Overnight events: end time at or before start rolls to the next day
          if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
          endDatetime = end.toISOString();
        }
      }

      const descriptionTags = extractDescriptionTags(
        formData.description.trim(),
        formData.title.trim(),
        formData.category
      );

      // For tier mode, legacy price = cheapest tier (used as a fallback display)
      const insertPrice = useTiers && cleanTiers.length > 0
        ? Math.min(...cleanTiers.map((t) => t.price))
        : useLayout
        ? Math.min(...draftAreas.map((a) => a.price ?? 0))
        : (!isPost && formData.price ? parseFloat(formData.price) : 0);

      const { data, error } = await supabase.
      from("events").
      insert({
        title: formData.title.trim() || null,
        description: formData.description.trim() || null,
        category: formData.category || null,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        location_name: isPost ? null : location.address.trim() || null,
        latitude: isPost ? null : location.latitude,
        longitude: isPost ? null : location.longitude,
        price: insertPrice,
        max_guestlist_capacity: formData.capacity ? parseInt(formData.capacity) : null,
        has_guestlist: !isPost,
        image_url: imageUrl,
        creator_id: user.id,
        is_public: true,
        is_post: isPost,
        description_tags: descriptionTags.length > 0 ? descriptionTags : null,
        show_menu_button: isBusiness && hasMenuItems ? formData.showMenuButton : false,
        show_reservation_button: isBusiness && reservationsEnabled && isPost ? formData.showReservationButton : false,
        is_location_secret: !isPost && formData.isLocationSecret,
        waitlist_enabled: !isPost && isBusiness && hasBeneficiary && formData.waitlistEnabled,
        sales_open_at:
          !isPost && formData.waitlistEnabled && formData.salesOpenAt
            ? new Date(formData.salesOpenAt).toISOString()
            : null,
        waitlist_early_access_hours:
          !isPost && formData.waitlistEnabled
            ? parseInt(formData.waitlistEarlyAccessHours || "0") || 0
            : 0,
        experience_id: experienceId
      }).
      select().
      single();

      if (error) throw error;

      // Persist event_media rows (carousel of up to 5)
      if (data?.id && uploadedMedia.length > 0) {
        const mediaRows = uploadedMedia.map((m, i) => ({
          event_id: data.id,
          media_url: m.url,
          media_type: m.type,
          display_order: i,
        }));
        const { error: mediaErr } = await supabase.from("event_media").insert(mediaRows);
        if (mediaErr) {
          console.error("Error saving media:", mediaErr);
          toast.error("Evento creado, pero hubo problemas al guardar algunas imágenes.");
        }
      }

      // Persist ticket tiers
      if (useTiers && data?.id && cleanTiers.length > 0) {
        try {
          const createdTiers = await replaceTiers.mutateAsync({
            eventId: data.id,
            tiers: cleanTiers,
            sequential: tierSaleMode === "sequential",
          });
          // Link the waiting list to the chosen ticket type (Dice-style pre-sale)
          if (formData.waitlistEnabled && formData.waitlistTierKey) {
            const idx = draftTiers.findIndex((t) => t.key === formData.waitlistTierKey);
            const linked = idx >= 0 ? createdTiers[idx] : null;
            if (linked?.id) {
              await supabase
                .from("events")
                .update({ waitlist_tier_id: linked.id } as any)
                .eq("id", data.id);
            }
          }
        } catch (tierErr: any) {
          console.error("Error saving tiers:", tierErr);
          toast.error("Evento creado, pero falló al guardar las entradas. Edítalas desde el evento.");
        }
      }

      // Persist the visual venue layout as this event's sellable areas
      if (useLayout && data?.id) {
        try {
          await replaceEventAreas.mutateAsync({ eventId: data.id, areas: draftAreas });
        } catch (areaErr: any) {
          console.error("Error saving event areas:", areaErr);
          toast.error("Evento creado, pero falló al guardar el plano de áreas.");
        }
      }



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
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="font-brand text-xl font-medium text-foreground">Crear</h1>
          <button
            type="button"
            onClick={reopenIntro}
            className="p-2 rounded-full hover:bg-secondary/60 transition-colors"
            aria-label="¿Cómo funciona?"
          >
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>


      <div className="px-4 py-6 space-y-6 pb-24">

        {/* ── Type selector (Instagram-style wheel) ── */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3">
          
          {TYPE_OPTIONS.map((option) => {
            const active = contentType === option.id;
            return (
              <m.button
                key={option.id}
                type="button" onClick={() => handleTypeChange(option.id)}
                whileTap={{ scale: 0.97 }}
                className={cn( "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 text-center",
                  active ? "border-primary/60 bg-primary/10" : "border-border bg-secondary/40 " )}>
                
                {/* Gradient icon bubble */}
                








                
                <div>
                  <p className={cn( "font-semibold text-sm leading-tight",
                    active ? "text-foreground" : "text-muted-foreground" )}>
                    {option.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {option.description}
                  </p>
                </div>
                {/* Active indicator dot */}
                {active &&
                <m.div
                  layoutId="type-active-dot" className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" transition={{ type: "spring", stiffness: 400, damping: 30 }} />

                }
              </m.button>);

          })}
        </m.div>

        {/* ── Media upload (carousel up to 5 items) ── */}
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          {mediaItems.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing || isUploading}
              className="w-full h-48 rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center transition-colors"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-10 h-10 text-primary mb-2 animate-spin" />
                  <span className="text-sm text-muted-foreground">Optimizando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {isPost ? "Sube fotos o videos" : "Portada del evento"}
                  </span>
                  <span className="text-xs text-muted-foreground/60 mt-1">
                    Hasta {MAX_MEDIA} archivos · máx. 30s por video
                  </span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
                {mediaItems.map((item, i) => (
                  <div
                    key={i}
                    className="relative shrink-0 w-28 h-28 rounded-xl overflow-hidden bg-secondary snap-start"
                  >
                    {item.type === "video" ? (
                      <video src={item.preview} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={item.preview} alt="" className="w-full h-full object-cover" />
                    )}
                    {i === 0 && (
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white font-medium">
                        Portada
                      </div>
                    )}
                    {item.type === "video" && (
                      <div className="absolute top-1 left-1 p-1 rounded-full bg-black/60">
                        <Video className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMediaAt(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-background/80 backdrop-blur-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {mediaItems.length < MAX_MEDIA && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing || isUploading}
                    className="shrink-0 w-28 h-28 rounded-xl border-2 border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center snap-start"
                  >
                    {isCompressing ? (
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-[10px] text-muted-foreground">Añadir</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground px-1">
                {mediaItems.length}/{MAX_MEDIA} · La primera será la portada
              </p>
              {(isUploading) && (
                <div className="space-y-1">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <m.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">Subiendo... {uploadProgress}%</p>
                </div>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            onChange={handleMediaChange}
            className="hidden"
          />
        </m.div>

        {/* ── Text fields ── */}
        <m.div
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
              placeholder={isPost ? "Cuéntalo, usa @usuario para mencionar..." : "Describe tu evento... usa @usuario para mencionar"}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={2000}
              className="rounded-xl border-border bg-secondary/50 px-4 py-3 text-base min-h-[120px] resize-none"

            />
          </div>
        </m.div>

        {/* ── Category ── */}
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <button
            type="button" onClick={() => setCategoryOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground transition-colors ">
            
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
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden">
              
                <div className="flex flex-wrap gap-2 pt-3">
                  {CATEGORIES.map((category) =>
                <button
                  key={category.id}
                  type="button" onClick={() => {
                    setFormData({ ...formData, category: category.id });
                    setCategoryOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  formData.category === category.id ? "gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-secondary-foreground "}` }>
                  
                      <span>{category.emoji}</span>
                      <span className="text-sm font-medium">{category.label}</span>
                    </button>
                )}
                </div>
              </m.div>
            }
          </AnimatePresence>
        </m.div>

        {/* ── Link a bookable experience (business only, feature enabled) ── */}
        {isBusiness && experiencesEnabled && (
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass border-white/10 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">Reservar una experiencia</h3>
                  <p className="text-xs text-muted-foreground">
                    Vinculá esta publicación a una experiencia para que la gente reserve y pague por adelantado.
                  </p>
                </div>
              </div>

              {activeExperiences.length === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full h-10 text-sm"
                  onClick={() => navigate("/settings/business/experiences")}
                >
                  Crear experiencia
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExperienceId(null)}
                    className={cn(
                      "px-3 py-2 rounded-full text-sm border transition-colors",
                      !experienceId ? "bg-foreground text-background border-transparent" : "border-border text-muted-foreground",
                    )}
                  >
                    Ninguna
                  </button>
                  {activeExperiences.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => {
                        if (!hasBeneficiary) { openBeneficiaryGate("experience"); return; }
                        setExperienceId(exp.id);
                      }}
                      className={cn(
                        "px-3 py-2 rounded-full text-sm border transition-colors max-w-full truncate",
                        experienceId === exp.id
                          ? "bg-foreground text-background border-transparent"
                          : "border-border text-muted-foreground",
                        !hasBeneficiary && "opacity-60",
                      )}
                    >
                      {exp.title}
                    </button>
                  ))}
                </div>
              )}

              {!hasBeneficiary && (
                <p className="text-xs text-muted-foreground">
                  Necesitás cargar tus datos de cobro para vender reservas de experiencias.
                </p>
              )}

              {linkedExperience && (
                <p className="text-xs text-muted-foreground">
                  El precio y los horarios vienen de “{linkedExperience.title}”. No hace falta configurar entradas.
                </p>
              )}
            </Card>
          </m.div>
        )}

        {/* ── Event-only fields (date, time, location, price, capacity) ── */}
        <AnimatePresence>
          {!isPost &&
          <m.div
            key="event-fields" initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden space-y-4">
            
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm font-medium text-foreground mb-2 block">Fecha</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                    type="date" className="pl-10 w-full" value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]} />
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="text-sm font-medium text-foreground mb-2 block">Hora</label>
                  <Input
                  type="time" className="w-full min-w-0" value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
                </div>
                <div className="min-w-0 col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-foreground mb-2 block">Hora fin (opcional)</label>
                  <Input
                  type="time" className="w-full min-w-0" value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
                </div>
              </div>

              <LocationPicker value={location} onChange={setLocation} />

              {isBusiness ? (
                <>
                  {!experienceId && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Entradas</label>
                    <TicketTiersEditor
                      mode={pricingMode}
                      onModeChange={setPricingMode}
                      singlePrice={formData.price}
                      onSinglePriceChange={(v) => setFormData({ ...formData, price: v })}
                      tiers={draftTiers}
                      onTiersChange={setDraftTiers}
                      saleMode={tierSaleMode}
                      onSaleModeChange={setTierSaleMode}
                      onAttemptPaidAction={!hasBeneficiary ? () => setShowBeneficiaryGate(true) : undefined}
                    />
                  </div>
                  )}
                  {/* Vender por áreas — hidden for now, will re-enable later */}
                  {/* {user && (
                    <EventVenueLayoutSection
                      businessId={user.id}
                      enabled={useAreas}
                      onEnabledChange={(v) => {
                        setUseAreas(v);
                        if (!v) setDraftAreas([]);
                      }}
                      areas={draftAreas}
                      onAreasChange={setDraftAreas}
                    />
                  )} */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Capacidad total (opcional)</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number" placeholder="Ilimitada" className="pl-10" value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        min="1" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Precio</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Gratis — Business para cobrar"
                        className="pl-10"
                        value=""
                        readOnly
                        onFocus={(e) => { e.target.blur(); openBusinessGate("tickets"); }}
                        onClick={() => openBusinessGate("tickets")}

                        onChange={() => {}}
                        min="0" step="0.01" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Capacidad</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number" placeholder="Ilimitada" className="pl-10" value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        min="1" />
                    </div>
                  </div>
                </div>
              )}
            </m.div>
          }
        </AnimatePresence>

        {/* ── Collaborator section ── */}
        {/* ── Menu button toggle (business only) ── */}
        {isBusiness && hasMenuItems &&
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
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
                type="button" onClick={() => setFormData({ ...formData, showMenuButton: !formData.showMenuButton })}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                formData.showMenuButton ? "bg-primary" : "bg-secondary"}` }>
                
                  <m.div
                  animate={{ x: formData.showMenuButton ? 22 : 2 }}
                  className="absolute top-1 w-5 h-5 rounded-full bg-foreground" />
                
                </button>
              </div>
            </Card>
          </m.div>
        }

        {/* ── Reservation button toggle (business + posts only) ── */}
        {isBusiness && reservationsEnabled && isPost &&
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
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
                type="button" onClick={() => setFormData({ ...formData, showReservationButton: !formData.showReservationButton })}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                formData.showReservationButton ? "bg-primary" : "bg-secondary"}` }>
                
                  <m.div
                  animate={{ x: formData.showReservationButton ? 22 : 2 }}
                  className="absolute top-1 w-5 h-5 rounded-full bg-foreground" />
                
                </button>
              </div>
            </Card>
          </m.div>
        }

        {/* ── Opciones avanzadas (events only) ── */}
        {!isPost && (
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <Card className="glass border-white/10 p-0 overflow-hidden">
              <Collapsible>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 [&[data-state=open]>svg]:rotate-180">
                  <span className="font-semibold text-foreground">Opciones avanzadas</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Ubicación secreta</h3>
                        <p className="text-xs text-muted-foreground">
                          Solo las personas que apruebes verán la dirección. Si la cambias, les llegará una notificación.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isLocationSecret: !formData.isLocationSecret })}
                      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${formData.isLocationSecret ? "bg-primary" : "bg-secondary"}`}>
                      <m.div
                        animate={{ x: formData.isLocationSecret ? 22 : 2 }}
                        className="absolute top-1 w-5 h-5 rounded-full bg-foreground" />
                    </button>
                  </div>

                  {/* Lista de espera (pre-venta) */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Lista de espera</h3>
                          <p className="text-xs text-muted-foreground">
                            Publica el evento sin precios. Los interesados se anotan y son los primeros en enterarse cuando abras la venta.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isBusiness) { setShowBusinessGate(true); return; }
                          if (!hasBeneficiary) { openBeneficiaryGate("tickets"); return; }
                          setFormData({ ...formData, waitlistEnabled: !formData.waitlistEnabled });
                        }}
                        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${formData.waitlistEnabled ? "bg-primary" : "bg-secondary"}`}>
                        <m.div
                          animate={{ x: formData.waitlistEnabled ? 22 : 2 }}
                          className="absolute top-1 w-5 h-5 rounded-full bg-foreground" />
                      </button>
                    </div>

                    {formData.waitlistEnabled && (
                      <div className="mt-4 space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="sales-open-at" className="text-xs text-muted-foreground">
                            Apertura de venta (opcional)
                          </Label>
                          <Input
                            id="sales-open-at"
                            type="datetime-local"
                            value={formData.salesOpenAt}
                            onChange={(e) => setFormData({ ...formData, salesOpenAt: e.target.value })}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Si la dejas vacía, las entradas se publican solo cuando tú lo decidas.
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="early-access-hours" className="text-xs text-muted-foreground">
                            Acceso anticipado para la lista (horas)
                          </Label>
                          <Input
                            id="early-access-hours"
                            type="number"
                            min="0"
                            value={formData.waitlistEarlyAccessHours}
                            onChange={(e) => setFormData({ ...formData, waitlistEarlyAccessHours: e.target.value })}
                            placeholder="0"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            0 = solo notificación. Más de 0 = solo la lista puede comprar durante ese tiempo.
                          </p>
                        </div>

                        {/* Entrada asociada a la lista */}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Entrada de la lista de espera
                          </Label>
                          {pricingMode === "tiers" && draftTiers.length > 0 ? (
                            <>
                              <div className="flex flex-wrap gap-2">
                                {draftTiers.map((t, i) => {
                                  const active = formData.waitlistTierKey === t.key;
                                  return (
                                    <button
                                      key={t.key}
                                      type="button"
                                      onClick={() =>
                                        setFormData({
                                          ...formData,
                                          waitlistTierKey: active ? "" : t.key,
                                        })
                                      }
                                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                        active
                                          ? "bg-foreground text-background border-transparent"
                                          : "border-border text-muted-foreground"
                                      }`}
                                    >
                                      {(t.name || `Entrada ${i + 1}`) +
                                        (Number(t.price) > 0 ? ` · Bs. ${t.price}` : " · Gratis")}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Los inscritos compran esta entrada primero durante el acceso anticipado. Los precios se ven desde ya, pero nadie puede comprar hasta que publiques la venta.
                              </p>
                            </>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              Configurá "Múltiples entradas" arriba para asociar la lista a un nivel de precio (ej. Early Bird).
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </m.div>
        )}

        {/* ── Publish button ── */}
        <div className="pt-2">
          <Button
            variant="sheet-action" className="w-full" onClick={handleSubmit}
            disabled={isSubmitting || isUploading}>
            
            {isSubmitting ?
            <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {isUploading ? `Subiendo... ${uploadProgress}%` : "Creando..."}
              </> :
            isPost ? "Publicar Post" : "Crear Evento" }
          </Button>
        </div>
      </div>

      <BusinessRequiredSheet open={showBusinessGate} onOpenChange={setShowBusinessGate} />
      <BeneficiaryRequiredSheet open={showBeneficiaryGate} onOpenChange={setShowBeneficiaryGate} context={beneficiaryGateContext} />
      <FeatureIntroSheet
        open={introOpen && !showBusinessGate && !showBeneficiaryGate}
        onOpenChange={setIntroOpen}
        steps={CREATE_INTRO}
      />
    </AppLayout>);

};

export default Create;
