import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface UserLocation {
  lat: number;
  lng: number;
}

interface LocationContextType {
  location: UserLocation | null;
  error: string | null;
  isLoading: boolean;
  requestLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const CACHE_KEY = 'zentro_user_location';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CachedLocation {
  location: UserLocation;
  timestamp: number;
}

const getCachedLocation = (): UserLocation | null => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedLocation = JSON.parse(cached);
    const isStale = Date.now() - parsed.timestamp > CACHE_DURATION_MS;
    
    // Return cached location even if stale (we'll refresh in background)
    return parsed.location;
  } catch {
    return null;
  }
};

const setCachedLocation = (location: UserLocation) => {
  try {
    const cached: CachedLocation = {
      location,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
};

const isCacheStale = (): boolean => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return true;
    
    const parsed: CachedLocation = JSON.parse(cached);
    return Date.now() - parsed.timestamp > CACHE_DURATION_MS;
  } catch {
    return true;
  }
};

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<UserLocation | null>(() => getCachedLocation());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRequestedFresh, setHasRequestedFresh] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(newLocation);
        setCachedLocation(newLocation);
        setIsLoading(false);
      },
      (err) => {
        let errorMessage = 'Unable to get your location';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // On mount: if no cache or cache is stale, request fresh location
  useEffect(() => {
    if (!hasRequestedFresh && (location === null || isCacheStale())) {
      setHasRequestedFresh(true);
      requestLocation();
    }
  }, [hasRequestedFresh, location, requestLocation]);

  return (
    <LocationContext.Provider value={{ location, error, isLoading, requestLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};
