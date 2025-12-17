import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Event } from '@/hooks/useEvents';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { Loader2 } from 'lucide-react';

interface MapViewProps {
  events: Event[];
  onMarkerClick?: (event: Event) => void;
  selectedEventId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
}

const MapView: React.FC<MapViewProps> = ({ 
  events, 
  onMarkerClick, 
  selectedEventId,
  userLocation 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const { token: mapboxToken, isLoading: tokenLoading, error: tokenError } = useMapboxToken();

  // Convert events to GeoJSON for clustering
  const eventsGeoJSON = useMemo(() => {
    const features = events
      .filter(event => event.latitude && event.longitude)
      .map(event => ({
        type: 'Feature' as const,
        properties: {
          id: event.id,
          title: event.title,
          category: event.category,
          start_datetime: event.start_datetime,
          isTonight: isEventTonight(event.start_datetime),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [event.longitude!, event.latitude!],
        },
      }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [events]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: userLocation ? [userLocation.lng, userLocation.lat] : [-74.006, 40.7128],
      zoom: 12,
      pitch: 0,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
      'top-right'
    );

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      if (!map.current) return;

      // Add clustered source
      map.current.addSource('events', {
        type: 'geojson',
        data: eventsGeoJSON,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles layer
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'events',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            'hsl(351, 100%, 45%)', // Primary red for small clusters
            10, 'hsl(351, 100%, 40%)', // Darker for medium
            50, 'hsl(351, 100%, 35%)', // Even darker for large
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, // Small clusters
            10, 25, // Medium clusters
            50, 35, // Large clusters
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': 'hsla(351, 100%, 60%, 0.5)',
        },
      });

      // Cluster count labels
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'events',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 14,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Unclustered event points
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'events',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'case',
            ['get', 'isTonight'],
            'hsl(351, 100%, 55%)', // Brighter for tonight
            'hsl(351, 100%, 45%)', // Normal primary
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'hsla(351, 100%, 70%, 0.6)',
        },
      });

      // Pulsing effect layer for tonight's events
      map.current.addLayer({
        id: 'unclustered-point-pulse',
        type: 'circle',
        source: 'events',
        filter: ['all', ['!', ['has', 'point_count']], ['get', 'isTonight']],
        paint: {
          'circle-color': 'hsl(351, 100%, 45%)',
          'circle-radius': 12,
          'circle-opacity': 0.3,
        },
      });

      setMapLoaded(true);
    });

    // Click on cluster to zoom
    map.current.on('click', 'clusters', (e) => {
      if (!map.current) return;
      const features = map.current.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;

      const clusterId = features[0].properties?.cluster_id;
      const source = map.current.getSource('events') as mapboxgl.GeoJSONSource;
      
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || !map.current) return;
        const geometry = features[0].geometry as GeoJSON.Point;
        map.current.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: zoom ?? 14,
        });
      });
    });

    // Click on individual event
    map.current.on('click', 'unclustered-point', (e) => {
      if (!e.features?.length) return;
      const eventId = e.features[0].properties?.id;
      const event = events.find(ev => ev.id === eventId);
      if (event && onMarkerClick) {
        onMarkerClick(event);
      }
    });

    // Cursor changes
    map.current.on('mouseenter', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
    map.current.on('mouseenter', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Update GeoJSON source when events change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('events') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(eventsGeoJSON);
    }
  }, [eventsGeoJSON, mapLoaded]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    } else {
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.innerHTML = `
        <div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg relative">
          <div class="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75"></div>
        </div>
      `;

      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current);
    }
  }, [userLocation, mapLoaded]);

  // Center map on selected event
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedEventId) return;

    const event = events.find(e => e.id === selectedEventId);
    if (event?.latitude && event?.longitude) {
      map.current.flyTo({
        center: [event.longitude, event.latitude],
        zoom: 15,
        duration: 1000,
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
    <div ref={mapContainer} className="absolute inset-0" />
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
