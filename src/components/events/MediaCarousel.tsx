import { useEffect, useRef, useState, useCallback, memo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Volume2, VolumeX } from "lucide-react";
import { isVideoUrl } from "@/lib/mediaUtils";
import { getOptimizedImageUrl, ImageSizes } from "@/lib/imageOptimization";
import { cn } from "@/lib/utils";

export interface CarouselMediaItem {
  id?: string;
  media_url: string;
  media_type?: "image" | "video" | null;
  aspect_ratio?: number | null;
}

interface MediaCarouselProps {
  items: CarouselMediaItem[];
  /** Use first item's aspect ratio to size the card frame; subsequent items use object-cover */
  initialIndex?: number;
  /** Compact mode for small thumbnails (no sound toggle, no indicators) */
  compact?: boolean;
  /** Override aspect ratio (e.g. for hero) */
  aspectRatioOverride?: string;
  /** Fixed aspect for full-bleed hero (detail view) */
  isHero?: boolean;
  /** Tap callback (when user taps a slide without swiping) */
  onTap?: (index: number) => void;
  /** Notify parent when active index changes */
  onIndexChange?: (index: number) => void;
  /** className applied to outer container */
  className?: string;
  /** Lazy: skip embla and render single image (used when only 1 item) */
  rounded?: boolean;
}

const MediaCarouselComponent = ({
  items,
  initialIndex = 0,
  compact = false,
  aspectRatioOverride,
  isHero = false,
  onTap,
  onIndexChange,
  className,
  rounded = true,
}: MediaCarouselProps) => {
  const safeItems = items?.length ? items : [];
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    startIndex: initialIndex,
    watchDrag: safeItems.length > 1,
  });
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [aspectRatio, setAspectRatio] = useState<number | null>(
    safeItems[0]?.aspect_ratio ?? null
  );
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Track active slide
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const i = emblaApi.selectedScrollSnap();
      setActiveIndex(i);
      onIndexChange?.(i);
    };
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onIndexChange]);

  // Pause off-screen videos, play active one
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === activeIndex) {
        v.muted = isMuted;
        v.play().catch(() => {});
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, [activeIndex, isMuted]);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>, index: number) => {
      if (index !== 0) return;
      const img = e.currentTarget;
      if (img.naturalWidth && img.naturalHeight && !aspectRatio) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    },
    [aspectRatio]
  );

  const handleVideoMetadata = useCallback(
    (index: number) => {
      if (index !== 0) return;
      const v = videoRefs.current[0];
      if (v && v.videoWidth && v.videoHeight && !aspectRatio) {
        setAspectRatio(v.videoWidth / v.videoHeight);
      }
    },
    [aspectRatio]
  );

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((m) => !m);
  };

  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = Math.abs(e.clientX - dragStart.current.x);
    const dy = Math.abs(e.clientY - dragStart.current.y);
    dragStart.current = null;
    // Treat as a tap if movement < 8px in any direction
    if (dx < 8 && dy < 8) {
      onTap?.(activeIndex);
    }
  };

  if (safeItems.length === 0) return null;

  const activeItem = safeItems[activeIndex];
  const activeIsVideo =
    activeItem?.media_type === "video" || isVideoUrl(activeItem?.media_url);

  const containerStyle: React.CSSProperties = isHero
    ? {
        aspectRatio: aspectRatio ? `${aspectRatio}` : "16/9",
        minHeight: "250px",
        maxHeight: "70vh",
      }
    : {
        width: "100%",
        aspectRatio: aspectRatioOverride
          ? aspectRatioOverride
          : aspectRatio
          ? `${aspectRatio}`
          : compact
          ? undefined
          : "3/4",
        minHeight: compact ? "80px" : "120px",
        maxHeight: compact ? undefined : "350px",
      };

  return (
    <div
      className={cn(
        "relative bg-secondary overflow-hidden",
        rounded && !isHero && "rounded-xl",
        className
      )}
      style={containerStyle}
      onPointerDown={onTap ? onPointerDown : undefined}
      onPointerUp={onTap ? onPointerUp : undefined}
    >
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {safeItems.map((item, i) => {
            const isVideo =
              item.media_type === "video" || isVideoUrl(item.media_url);
            return (
              <div
                key={item.id ?? `${item.media_url}-${i}`}
                className="relative flex-[0_0_100%] min-w-0 h-full"
              >
                {isVideo ? (
                  <video
                    ref={(el) => (videoRefs.current[i] = el)}
                    src={item.media_url}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    // TikTok-style: only the active slide gets metadata; others stay
                    // at "none" so off-screen videos never decode on mobile.
                    preload={i === activeIndex ? "metadata" : "none"}
                    autoPlay={i === 0}
                    onLoadedMetadata={() => handleVideoMetadata(i)}
                  />
                ) : (
                  <img
                    src={getOptimizedImageUrl(
                      item.media_url,
                      isHero ? ImageSizes.hero : ImageSizes.card
                    )}
                    alt=""
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="w-full h-full object-cover"
                    onLoad={(e) => handleImageLoad(e, i)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sound toggle for active video */}
      {!compact && activeIsVideo && (
        <button
          onClick={toggleMute}
          className={cn(
            "absolute rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-10",
            isHero ? "top-4 right-4 w-10 h-10 safe-top" : "top-2 right-2 w-7 h-7"
          )}
          style={isHero ? { top: "max(1rem, env(safe-area-inset-top))" } : undefined}
        >
          {isMuted ? (
            <VolumeX className={cn("text-white", isHero ? "w-5 h-5" : "w-3.5 h-3.5")} />
          ) : (
            <Volume2 className={cn("text-white", isHero ? "w-5 h-5" : "w-3.5 h-3.5")} />
          )}
        </button>
      )}

      {/* Slide indicator */}
      {!compact && safeItems.length > 1 && (
        <>
          {/* Dots (bottom center) */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 pointer-events-none">
            {safeItems.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all",
                  i === activeIndex
                    ? "w-1.5 h-1.5 bg-white"
                    : "w-1 h-1 bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const MediaCarousel = memo(MediaCarouselComponent);
