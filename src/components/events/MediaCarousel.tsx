import { useEffect, useRef, useState, useCallback, memo, useSyncExternalStore } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Volume2, VolumeX } from "lucide-react";
import { isVideoUrl } from "@/lib/mediaUtils";
import { getOptimizedImageUrl, ImageSizes } from "@/lib/imageOptimization";
import { cn } from "@/lib/utils";
import { feedVideoCoordinator } from "@/lib/feedVideoCoordinator";

export interface CarouselMediaItem {
  id?: string;
  media_url: string;
  media_type?: "image" | "video" | null;
  aspect_ratio?: number | null;
}

interface MediaCarouselProps {
  items: CarouselMediaItem[];
  initialIndex?: number;
  compact?: boolean;
  aspectRatioOverride?: string;
  isHero?: boolean;
  onTap?: (index: number) => void;
  onIndexChange?: (index: number) => void;
  /** Fires the first time any video in the carousel reports `playing`. */
  onFirstPlay?: () => void;
  className?: string;
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
  onFirstPlay,
  className,
  rounded = true,
}: MediaCarouselProps) => {
  const safeItems = items?.length ? items : [];
  const firstPlayFiredRef = useRef(false);
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
  const [loadedIndexes, setLoadedIndexes] = useState<Set<number>>(() => new Set());
  const [heroMuted, setHeroMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const activeItem = safeItems[activeIndex];
  const activeFeedId = !isHero && activeItem 
    ? `${activeItem.id ?? activeItem.media_url}#${activeIndex}`
    : null;

  // Optimized subscription: only re-render if this specific video's audio state changes
  const isAudioActive = useSyncExternalStore(
    useCallback((cb) => feedVideoCoordinator.subscribe(cb), []),
    useCallback(() => activeFeedId ? feedVideoCoordinator.isAudioActive(activeFeedId) : false, [activeFeedId]),
    useCallback(() => false, [])
  );

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

  useEffect(() => {
    if (!isHero) return;
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === activeIndex) {
        v.muted = heroMuted;
        v.play().catch(() => {});
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, [activeIndex, heroMuted, isHero]);

  useEffect(() => {
    if (isHero) return;
    const item = safeItems[activeIndex];
    if (!item) return;
    const isVideo = item.media_type === "video" || isVideoUrl(item.media_url);
    if (!isVideo) return;
    const el = videoRefs.current[activeIndex];
    if (!el) return;
    const id = `${item.id ?? item.media_url}#${activeIndex}`;
    feedVideoCoordinator.register(id, el);
    
    // Pause other videos in same carousel
    videoRefs.current.forEach((v, i) => {
      if (v && i !== activeIndex) {
        try { v.pause(); v.currentTime = 0; } catch {}
      }
    });
    return () => feedVideoCoordinator.unregister(id);
  }, [activeIndex, safeItems, isHero]);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>, index: number) => {
      if (index !== 0 || aspectRatio) return;
      const img = e.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    },
    [aspectRatio]
  );

  const handleVideoMetadata = useCallback(
    (index: number) => {
      if (index !== 0 || aspectRatio) return;
      const v = videoRefs.current[0];
      if (v && v.videoWidth && v.videoHeight) {
        setAspectRatio(v.videoWidth / v.videoHeight);
      }
    },
    [aspectRatio]
  );

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isHero) {
      setHeroMuted((m) => !m);
      return;
    }
    if (activeFeedId) {
      feedVideoCoordinator.toggleUserMute(activeFeedId);
    }
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
    if (dx < 8 && dy < 8) {
      onTap?.(activeIndex);
    }
  };

  if (safeItems.length === 0) return null;

  const activeIsVideo = activeItem?.media_type === "video" || isVideoUrl(activeItem?.media_url);
  const showMuted = isHero ? heroMuted : !isAudioActive;

  const containerStyle: React.CSSProperties = isHero
    ? {
        width: "100%",
        aspectRatio: aspectRatio ? `${aspectRatio}` : "3/4",
        minHeight: "250px",
        maxHeight: "70vh",
      }
    : {
        width: "100%",
        aspectRatio: aspectRatioOverride || (aspectRatio ? `${aspectRatio}` : (compact ? undefined : "3/4")),
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
            const isVideo = item.media_type === "video" || isVideoUrl(item.media_url);
            return (
              <div
                key={item.id ?? `${item.media_url}-${i}`}
                className="relative flex-[0_0_100%] min-w-0 h-full"
              >
                {isVideo ? (
                  <video
                    ref={(el) => (videoRefs.current[i] = el)}
                    src={item.media_url}
                    className="relative w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    preload={i === activeIndex ? "metadata" : "none"}
                    onLoadedMetadata={() => handleVideoMetadata(i)}
                    onPlaying={() => {
                      if (onFirstPlay && !firstPlayFiredRef.current) {
                        firstPlayFiredRef.current = true;
                        onFirstPlay();
                      }
                    }}
                  />
                ) : (
                  <img
                    src={getOptimizedImageUrl(
                      item.media_url,
                      isHero ? ImageSizes.hero : ImageSizes.card
                    )}
                    alt=""
                    loading={isHero && i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={isHero && i === 0 ? "high" : "low"}
                    className="relative w-full h-full object-cover"
                    onLoad={(e) => handleImageLoad(e, i)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!compact && activeIsVideo && (
        <button
          onClick={toggleMute}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          className={cn(
            "absolute rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center",
            isHero ? "right-4 w-10 h-10 z-30" : "bottom-2 right-2 w-7 h-7 z-10"
          )}
          style={isHero ? { top: "calc(env(safe-area-inset-top, 0px) + 1rem)" } : undefined}
        >
          {showMuted ? (
            <VolumeX className={cn("text-white", isHero ? "w-5 h-5" : "w-3.5 h-3.5")} />
          ) : (
            <Volume2 className={cn("text-white", isHero ? "w-5 h-5" : "w-3.5 h-3.5")} />
          )}
        </button>
      )}

      {!compact && safeItems.length > 1 && (
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
      )}
    </div>
  );
};

export const MediaCarousel = memo(MediaCarouselComponent);
