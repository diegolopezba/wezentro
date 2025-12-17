import React, { useEffect, useRef, useState } from 'react';
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
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const { token: mapboxToken, isLoading: tokenLoading, error: tokenError } = useMapboxToken();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: userLocation ? [userLocation.lng, userLocation.lat] : [-74.006, 40.7128], // Default: NYC
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
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

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

  // Update event markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove old markers that are no longer in events
    const eventIds = new Set(events.map(e => e.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!eventIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers for events with coordinates
    events.forEach(event => {
      if (!event.latitude || !event.longitude) return;

      const isSelected = event.id === selectedEventId;
      const isTonight = isEventTonight(event.start_datetime);

      if (markersRef.current[event.id]) {
        // Update existing marker position and style
        markersRef.current[event.id].setLngLat([event.longitude, event.latitude]);
        const el = markersRef.current[event.id].getElement();
        updateMarkerElement(el, event, isSelected, isTonight);
      } else {
        // Create new marker
        const el = createMarkerElement(event, isSelected, isTonight);
        
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onMarkerClick?.(event);
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([event.longitude, event.latitude])
          .addTo(map.current!);

        markersRef.current[event.id] = marker;
      }
    });
  }, [events, selectedEventId, mapLoaded, onMarkerClick]);

  // Center map on selected event
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedEventId) return;

    const event = events.find(e => e.id === selectedEventId);
    if (event?.latitude && event?.longitude) {
      map.current.flyTo({
        center: [event.longitude, event.latitude],
        zoom: 14,
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

// Helper functions
function isEventTonight(startDatetime: string): boolean {
  const eventDate = new Date(startDatetime);
  const today = new Date();
  return (
    eventDate.getDate() === today.getDate() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getFullYear() === today.getFullYear()
  );
}

function getCategoryColor(category: string | null): string {
  const colors: { [key: string]: string } = {
    'Club': 'hsl(351, 100%, 45%)', // Primary red
    'Bar': 'hsl(200, 80%, 50%)',   // Blue
    'Concert': 'hsl(280, 80%, 60%)', // Purple
    'Festival': 'hsl(45, 100%, 50%)', // Gold
    'Lounge': 'hsl(160, 70%, 45%)',  // Teal
    'Rooftop': 'hsl(30, 90%, 55%)',  // Orange
  };
  return colors[category || ''] || 'hsl(351, 100%, 45%)';
}

function createMarkerElement(event: Event, isSelected: boolean, isTonight: boolean): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'event-marker cursor-pointer transition-transform duration-200 hover:scale-110';
  updateMarkerElement(el, event, isSelected, isTonight);
  return el;
}

function updateMarkerElement(el: HTMLElement, event: Event, isSelected: boolean, isTonight: boolean): void {
  const color = getCategoryColor(event.category);
  const size = isSelected ? 'w-6 h-6' : 'w-4 h-4';
  const pulseClass = isTonight && !isSelected ? 'animate-pulse' : '';
  
  el.innerHTML = `
    <div class="relative">
      <div class="${size} rounded-full shadow-lg transition-all duration-200 ${pulseClass}" 
           style="background-color: ${color}; box-shadow: 0 0 ${isSelected ? '20px' : '10px'} ${color}40;">
      </div>
      ${isTonight ? `
        <div class="absolute inset-0 ${size} rounded-full animate-ping opacity-40" 
             style="background-color: ${color};"></div>
      ` : ''}
    </div>
  `;
}

export default MapView;
