import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Search, Loader2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMapboxToken } from '@/hooks/useMapboxToken';

interface LocationPickerProps {
  value: {
    address: string;
    latitude: number | null;
    longitude: number | null;
  };
  onChange: (location: {
    address: string;
    latitude: number | null;
    longitude: number | null;
  }) => void;
}

interface SearchResult {
  id: string;
  text?: string;
  place_name: string;
  place_type?: string[];
  center: [number, number];
}

// Secondary line: the place_name minus the leading venue/street name
const secondaryText = (r: SearchResult) => {
  if (!r.text) return '';
  const rest = r.place_name.startsWith(r.text) ? r.place_name.slice(r.text.length) : r.place_name;
  return rest.replace(/^,\s*/, '');
};

const DEFAULT_PROXIMITY: [number, number] = [-63.1812, -17.7834]; // Santa Cruz, BO

export const LocationPicker = ({ value, onChange }: LocationPickerProps) => {
  const { token, isLoading: tokenLoading } = useMapboxToken();
  const [searchQuery, setSearchQuery] = useState(value.address);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proximity = useRef<[number, number]>(DEFAULT_PROXIMITY);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Initialize map when location is selected
  useEffect(() => {
    if (!token || !mapContainer.current || !showMap || !value.latitude || !value.longitude) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [value.longitude, value.latitude],
      zoom: 15,
      interactive: true,
    });

    // Add draggable marker
    marker.current = new mapboxgl.Marker({
      color: '#FFFFFF',
      draggable: true,
    })
      .setLngLat([value.longitude, value.latitude])
      .addTo(map.current);

    // Dragging only adjusts coordinates — the venue name stays as chosen
    marker.current.on('dragend', () => {
      const lngLat = marker.current?.getLngLat();
      if (lngLat) {
        onChange({
          address: valueRef.current.address,
          latitude: lngLat.lat,
          longitude: lngLat.lng,
        });
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [token, showMap, value.latitude, value.longitude]);

  // Bias results toward the user's area (falls back to Santa Cruz, Bolivia)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { proximity.current = [pos.coords.longitude, pos.coords.latitude]; },
      () => {},
      { maximumAge: 10 * 60 * 1000, timeout: 5000 }
    );
  }, []);

  // Search for venues (POIs) and addresses
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!query.trim() || !token) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setShowResults(true);
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [lng, lat] = proximity.current;
        const params = new URLSearchParams({
          access_token: token,
          limit: '7',
          language: 'es',
          types: 'poi,address,neighborhood,locality,place',
          proximity: `${lng},${lat}`,
        });
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`
        );
        const data = await response.json();
        setSearchResults(data.features || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Select a location from search results — keep the venue name when it's a POI
  const selectLocation = (result: SearchResult) => {
    const [lng, lat] = result.center;
    const isPoi = result.place_type?.includes('poi');
    const address = isPoi && result.text
      ? `${result.text}${secondaryText(result) ? `, ${secondaryText(result)}` : ''}`
      : result.place_name;
    onChange({ address, latitude: lat, longitude: lng });
    setSearchQuery(address);
    setSearchResults([]);
    setShowResults(false);
    setShowMap(true);
  };

  // Use whatever the user typed as the venue name, pinned near them
  const useCustomName = () => {
    const name = searchQuery.trim();
    if (!name) return;
    const hasCoords = value.latitude != null && value.longitude != null;
    const [lng, lat] = hasCoords
      ? [value.longitude as number, value.latitude as number]
      : searchResults[0]?.center ?? proximity.current;
    onChange({ address: name, latitude: lat, longitude: lng });
    setSearchResults([]);
    setShowResults(false);
    setShowMap(true);
  };

  if (tokenLoading) {
    return (
      <div className="flex items-center justify-center h-32 rounded-xl bg-secondary/50">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground block">
        Ubicación
      </label>

      {/* Search input */}
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscá un bar, local o dirección" className="pl-10 pr-10" value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => searchQuery.trim() && setShowResults(true)}
          maxLength={200}
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {!isSearching && searchQuery && (
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}

        {/* Search results dropdown */}
        {showResults && searchQuery.trim() && (
          <div className="absolute z-50 w-full mt-2 bg-secondary border border-border rounded-xl overflow-hidden shadow-lg max-h-80 overflow-y-auto">
            {searchResults.map((result) => {
              const title = result.text || result.place_name;
              const sub = secondaryText(result);
              return (
                <button
                  key={result.id}
                  type="button" onClick={() => selectLocation(result)}
                  className="w-full px-4 py-3 text-left transition-colors flex items-start gap-3 active:bg-muted" >
                  <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{title}</span>
                    {sub && <span className="block text-xs text-muted-foreground line-clamp-1">{sub}</span>}
                  </span>
                </button>
              );
            })}
            <button
              type="button" onClick={useCustomName}
              className="w-full px-4 py-3 text-left flex items-start gap-3 border-t border-border active:bg-muted" >
              <Plus className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground truncate">
                  Usar "{searchQuery.trim()}" como ubicación
                </span>
                <span className="block text-xs text-muted-foreground">
                  Después ajustá el pin en el mapa
                </span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Map preview */}
      {showMap && value.latitude && value.longitude && (
        <div className="relative">
          <div
            ref={mapContainer}
            className="h-40 rounded-xl overflow-hidden" />
          <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">
              Arrastrá el pin para ajustar la ubicación exacta
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
