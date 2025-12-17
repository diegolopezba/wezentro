import { useLocationContext } from '@/contexts/LocationContext';

interface UserLocation {
  lat: number;
  lng: number;
}

interface UseUserLocationResult {
  location: UserLocation | null;
  error: string | null;
  isLoading: boolean;
  requestLocation: () => void;
}

export const useUserLocation = (): UseUserLocationResult => {
  return useLocationContext();
};
