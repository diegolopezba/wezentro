import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Search, Loader2 } from 'lucide-react';
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
  place_name: string;
  center: [number, number];
}

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
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

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
      color: '#E60023',
      draggable: true,
    })
      .setLngLat([value.longitude, value.latitude])
      .addTo(map.current);

    // Update coordinates when marker is dragged
    marker.current.on('dragend', async () => {
      const lngLat = marker.current?.getLngLat();
      if (lngLat) {
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${token}`
          );
          const data = await response.json();
          const placeName = data.features?.[0]?.place_name || value.address;
          
          onChange({
            address: placeName,
            latitude: lngLat.lat,
            longitude: lngLat.lng,
          });
          setSearchQuery(placeName);
        } catch (error) {
          onChange({
            ...value,
            latitude: lngLat.lat,
            longitude: lngLat.lng,
          });
        }
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [token, showMap, value.latitude, value.longitude]);

  // Search for locations
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

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5`
        );
        const data = await response.json();
        setSearchResults(data.features || []);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Select a location from search results
  const selectLocation = (result: SearchResult) => {
    const [lng, lat] = result.center;
    onChange({
      address: result.place_name,
      latitude: lat,
      longitude: lng,
    });
    setSearchQuery(result.place_name);
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
        Location
      </label>
      
      {/* Search input */}
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search for a venue or address"
          className="pl-10 pr-10"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          maxLength={200}
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {!isSearching && searchQuery && (
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}

        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-secondary border border-border rounded-xl overflow-hidden shadow-lg">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => selectLocation(result)}
                className="w-full px-4 py-3 text-left hover:bg-background/50 transition-colors flex items-start gap-3"
              >
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground line-clamp-2">
                  {result.place_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map preview */}
      {showMap && value.latitude && value.longitude && (
        <div className="relative">
          <div
            ref={mapContainer}
            className="h-40 rounded-xl overflow-hidden"
          />
          <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">
              Drag the pin to adjust location
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
