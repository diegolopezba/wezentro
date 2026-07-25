import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ExternalLink, Loader2, MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/bottom-sheet";
import { useMapboxToken } from "@/hooks/useMapboxToken";

interface LocationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationName: string | null | undefined;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  isSecret?: boolean;
}

export const LocationSheet = ({
  open,
  onOpenChange,
  locationName,
  latitude,
  longitude,
  isSecret,
}: LocationSheetProps) => {
  const { token, isLoading: tokenLoading } = useMapboxToken();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const hasCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);

  useEffect(() => {
    if (!open || !token || !hasCoords || !container) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [longitude as number, latitude as number],
      zoom: 15,
      pitchWithRotate: false,
      dragRotate: false,
      attributionControl: false,
    });
    map.touchZoomRotate.disableRotation();

    new mapboxgl.Marker({ color: "#E60023" })
      .setLngLat([longitude as number, latitude as number])
      .addTo(map);

    mapRef.current = map;

    // The sheet animates in, so the container starts at 0 height —
    // resize once the animation settles and whenever the box changes.
    const t = setTimeout(() => map.resize(), 350);
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);

    return () => {
      clearTimeout(t);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [open, token, hasCoords, latitude, longitude, container]);


  const mapsHref = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : locationName
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-border p-0 h-[70vh] flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-3 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{locationName || "Ubicación"}</span>
            {isSecret && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1.5 py-0.5 rounded-full border border-border">
                Secreta
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 relative bg-secondary/30">
          {hasCoords ? (
            <>
              {(tokenLoading || !token) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              )}
              <div ref={setContainer} className="absolute inset-0" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <MapPin className="w-6 h-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Mapa no disponible para esta ubicación.
              </p>
            </div>
          )}
        </div>

        {mapsHref && (
          <div className="px-5 py-4 border-t border-border">
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold active:opacity-80"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir en Mapas
            </a>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
