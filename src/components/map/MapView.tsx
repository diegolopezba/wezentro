// src/components/map/MapView.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Event } from "@/hooks/useEvents";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { Loader2, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapViewProps {
  events: Event[];
  onMarkerClick?: (events: Event[]) => void;
  selectedEventId?: string | null;
  onGeolocationSuccess?: () => void;
  onGeolocationError?: (error: string) => void;
}

const WORLD_VIEW = {
  center: [-80, 25] as [number, number], // Centered above Latin America/Caribbean
  zoom: 1.2,
  pitch: 0,
  bearing: 0,
};

// Runs only once per app session (until the PWA/browser context is closed)
const INTRO_SESSION_KEY = "zentro.discoveryIntroPlayed.v1";

const MapView: React.FC<MapViewProps> = ({
  events,
  onMarkerClick,
  selectedEventId,
  onGeolocationSuccess,
  onGeolocationError,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);

  // IMPORTANT: refs avoid stale closures inside mapbox event handlers
  const hasAnimatedRef = useRef(false);
  const geoTriggeredRef = useRef(false);

  // track timeouts so we can clean up safely on unmount
  const timeoutsRef = useRef<number[]>([]);

  const { token: mapboxToken, isLoading: tokenLoading, error: tokenError } = useMapboxToken();

  const handleRefreshLocation = () => {
    geolocateControlRef.current?.trigger();
  };

  // Convert events to GeoJSON for clustering
  const eventsGeoJSON = useMemo(() => {
    const features = events
      .filter((event) => event.latitude && event.longitude)
      .map((event) => ({
        type: "Feature" as const,
        properties: {
          id: event.id,
          title: event.title,
          category: event.category,
          start_datetime: event.start_datetime,
          isTonight: isEventTonight(event.start_datetime),
        },
        geometry: {
          type: "Point" as const,
          coordinates: [event.longitude!, event.latitude!],
        },
      }));

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [events]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  };

  const scheduleTimeout = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  // "Subtle premium" timings (total ~4–5s)
  const SPIN_DURATION_MS = 2600;
  const FLY_DURATION_MS = 2200;
  const SPIN_START_DELAY_MS = 150;
  const GAP_AFTER_SPIN_MS = 250; // small pause between spin and zoom

  // Full-globe spin → then fly to user (only once per session)
  const playGlobeSpinAnimation = (targetLocation: [number, number]) => {
    if (!map.current || hasAnimatedRef.current) return;

    hasAnimatedRef.current = true;

    // Phase 0: jump to world center (full globe view)
    map.current.jumpTo({
      center: WORLD_VIEW.center,
      zoom: WORLD_VIEW.zoom,
      pitch: WORLD_VIEW.pitch,
      bearing: 0,
    });

    // Optional: globe atmosphere (safe-guarded)
    try {
      map.current.setFog({
        range: [-1, 2],
        color: "rgba(255,255,255,0.15)",
        "high-color": "rgba(255,255,255,0.08)",
        "space-color": "rgba(0,0,0,1)",
        "horizon-blend": 0.2,
      } as any);
    } catch {
      // ignore
    }

    // Phase 1: spin
    scheduleTimeout(() => {
      if (!map.current) return;

      map.current.easeTo({
        bearing: 360,
        duration: SPIN_DURATION_MS,
        easing: (t) => t,
      });
    }, SPIN_START_DELAY_MS);

    // Phase 2: fly to user (starts after spin + small gap)
    scheduleTimeout(() => {
      if (!map.current) return;

      map.current.flyTo({
        center: targetLocation,
        zoom: 12.5,
        pitch: 0,
        bearing: 0,
        duration: FLY_DURATION_MS,
        essential: true,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    }, SPIN_START_DELAY_MS + SPIN_DURATION_MS + GAP_AFTER_SPIN_MS);
  };

  const flyToUserNoIntro = (targetLocation: [number, number]) => {
    if (!map.current) return;

    map.current.flyTo({
      center: targetLocation,
      zoom: Math.max(map.current.getZoom(), 12),
      duration: 900,
      essential: true,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: WORLD_VIEW.center,
      zoom: WORLD_VIEW.zoom,
      pitch: WORLD_VIEW.pitch,
      bearing: WORLD_VIEW.bearing,
      projection: { name: "globe" } as any,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: false,
      }),
      "top-right",
    );

    // IMPORTANT: trackUserLocation false prevents constant geolocate updates
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        timeout: 8000,
      },
      trackUserLocation: false,
      showUserHeading: true,
    });

    geolocateControlRef.current = geolocateControl;
    map.current.addControl(geolocateControl, "top-right");

    const handleGeoLocate = (e: any) => {
      const userLocation: [number, number] = [e.coords.longitude, e.coords.latitude];

      const introPlayedThisSession = sessionStorage.getItem(INTRO_SESSION_KEY) === "1";

      // Intro animation only once per session; otherwise do a normal fly
      if (!introPlayedThisSession && !hasAnimatedRef.current) {
        sessionStorage.setItem(INTRO_SESSION_KEY, "1");
        playGlobeSpinAnimation(userLocation);
      } else {
        flyToUserNoIntro(userLocation);
      }

      onGeolocationSuccess?.();
    };

    const handleGeoError = (e: GeolocationPositionError) => {
      const errorMessages: Record<number, string> = {
        1: "Location access denied. Enable location in your browser settings.",
        2: "Location unavailable. Please try again.",
        3: "Location request timed out. Please try again.",
      };
      onGeolocationError?.(errorMessages[e.code] || "Failed to get location");

      // If location fails, do NOT block UX. Keep world view.
      // Optionally play intro once per session using a fallback location (NYC).
      const introPlayedThisSession = sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
      if (!introPlayedThisSession && !hasAnimatedRef.current && map.current) {
        sessionStorage.setItem(INTRO_SESSION_KEY, "1");
        playGlobeSpinAnimation([-74.006, 40.7128]); // fallback NYC
      }
    };

    geolocateControl.on("geolocate", handleGeoLocate);
    geolocateControl.on("error", handleGeoError);

    // Single load handler: add sources/layers + trigger geolocation once
    map.current.on("load", () => {
      if (!map.current) return;

      // Ensure we start on full globe (world center)
      map.current.jumpTo({
        center: WORLD_VIEW.center,
        zoom: WORLD_VIEW.zoom,
        pitch: WORLD_VIEW.pitch,
        bearing: WORLD_VIEW.bearing,
      });

      // Add clustered source
      map.current.addSource("events", {
        type: "geojson",
        data: eventsGeoJSON,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles layer
      map.current.addLayer({
        id: "clusters",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "hsl(351, 100%, 45%)",
            10,
            "hsl(351, 100%, 40%)",
            50,
            "hsl(351, 100%, 35%)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 25, 50, 35],
          "circle-stroke-width": 2,
          "circle-stroke-color": "hsla(351, 100%, 60%, 0.5)",
        },
      });

      // Cluster count labels
      map.current.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 14,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Unclustered event points
      map.current.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["case", ["get", "isTonight"], "hsl(351, 100%, 55%)", "hsl(351, 100%, 45%)"],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "hsla(351, 100%, 70%, 0.6)",
        },
      });

      // Pulsing effect layer for tonight's events
      map.current.addLayer({
        id: "unclustered-point-pulse",
        type: "circle",
        source: "events",
        filter: ["all", ["!", ["has", "point_count"]], ["get", "isTonight"]],
        paint: {
          "circle-color": "hsl(351, 100%, 45%)",
          "circle-radius": 12,
          "circle-opacity": 0.3,
        },
      });

      setMapLoaded(true);

      // Trigger geolocation ONCE after load
      if (!geoTriggeredRef.current) {
        geoTriggeredRef.current = true;
        scheduleTimeout(() => geolocateControl.trigger(), 150);
      }
    });

    // Click on cluster to zoom
    map.current.on("click", "clusters", (e) => {
      if (!map.current) return;

      const features = map.current.queryRenderedFeatures(e.point, { layers: ["clusters"] });
      if (!features.length) return;

      const clusterId = features[0].properties?.cluster_id;
      const source = map.current.getSource("events") as mapboxgl.GeoJSONSource;

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || !map.current) return;
        const geometry = features[0].geometry as GeoJSON.Point;
        map.current.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: zoom ?? 14,
        });
      });
    });

    // Click on individual event marker
    map.current.on("click", "unclustered-point", (e) => {
      if (!e.features?.length) return;
      const clickedCoords = (e.features[0].geometry as GeoJSON.Point).coordinates;
      const tolerance = 0.0001;

      const eventsAtLocation = events.filter(
        (ev) =>
          ev.latitude &&
          ev.longitude &&
          Math.abs(ev.latitude - clickedCoords[1]) < tolerance &&
          Math.abs(ev.longitude - clickedCoords[0]) < tolerance,
      );

      if (eventsAtLocation.length > 0 && onMarkerClick) {
        onMarkerClick(eventsAtLocation);
      }
    });

    // Cursor changes
    map.current.on("mouseenter", "clusters", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "clusters", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });
    map.current.on("mouseenter", "unclustered-point", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "unclustered-point", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });

    return () => {
      clearAllTimeouts();
      geolocateControl.off("geolocate", handleGeoLocate);
      geolocateControl.off("error", handleGeoError);

      map.current?.remove();
      map.current = null;
      geolocateControlRef.current = null;

      // reset runtime-only flags (sessionStorage remains)
      hasAnimatedRef.current = false;
      geoTriggeredRef.current = false;
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // Update GeoJSON source when events change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource("events") as mapboxgl.GeoJSONSource | undefined;
    if (source) source.setData(eventsGeoJSON);
  }, [eventsGeoJSON, mapLoaded]);

  // Center map on selected event
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedEventId) return;
    const event = events.find((e) => e.id === selectedEventId);
    if (event?.latitude && event?.longitude) {
      map.current.flyTo({
        center: [event.longitude, event.latitude],
        zoom: 15,
        duration: 1000,
        essential: true,
      });
    }
  }, [selectedEventId, events, mapLoaded]);

  // Loading state
  if (tokenLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (tokenError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-secondary">
        <div className="text-center text-muted-foreground">
          <p>Failed to load map</p>
          <p className="text-sm">{tokenError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Refresh Location Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleRefreshLocation}
        className="absolute bottom-4 right-3 z-10 shadow-lg gap-2"
      >
        <LocateFixed className="w-4 h-4" />
      </Button>
    </div>
  );
};

// Helper function
function isEventTonight(startDatetime: string): boolean {
  const eventDate = new Date(startDatetime);
  const today = new Date();
  return (
    eventDate.getDate() === today.getDate() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getFullYear() === today.getFullYear()
  );
}

export default MapView;
