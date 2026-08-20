import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2 } from "lucide-react";
import { useMapboxToken } from "@/hooks/useMapboxToken";

interface BusinessMiniMapProps {
  latitude: number;
  longitude: number;
  name?: string | null;
}

const BusinessMiniMap = ({ latitude, longitude, name }: BusinessMiniMapProps) => {
  const { token, isLoading } = useMapboxToken();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!token || !container) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/light-v11",
      center: [longitude, latitude],
      zoom: 15,
      interactive: false,
      attributionControl: false,
    });

    new mapboxgl.Marker({ color: "#FFFFFF" })
      .setLngLat([longitude, latitude])
      .addTo(map);

    mapRef.current = map;

    const t = setTimeout(() => map.resize(), 350);
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);

    return () => {
      clearTimeout(t);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [token, container, latitude, longitude]);

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <a
      href={mapsHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver ${name || "la ubicación"} en el mapa`}
      className="block relative mt-2 h-[140px] w-full rounded-xl overflow-hidden bg-secondary active:opacity-90"
    >
      {(isLoading || !token) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}
      <div ref={setContainer} className="absolute inset-0" />
    </a>
  );
};

export default BusinessMiniMap;
