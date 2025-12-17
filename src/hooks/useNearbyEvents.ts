import { useMemo } from "react";
import { Event } from "./useEvents";

interface UserLocation {
  lat: number;
  lng: number;
}

export interface EventWithDistance extends Event {
  distance: number | null; // in miles
}

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export interface FilterOptions {
  searchQuery: string;
  dateFilter: "all" | "tonight" | "this_weekend" | "custom";
  customDateRange?: { start: Date; end: Date };
  categories: string[];
  maxDistance: number | null; // in miles, null means no limit
  hasGuestlistOnly: boolean;
}

const isTonight = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const isThisWeekend = (date: Date): boolean => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Calculate Friday start and Sunday end
  const friday = new Date(today);
  friday.setDate(today.getDate() + (5 - dayOfWeek));
  friday.setHours(0, 0, 0, 0);
  
  const sundayEnd = new Date(friday);
  sundayEnd.setDate(friday.getDate() + 2);
  sundayEnd.setHours(23, 59, 59, 999);
  
  // If today is Saturday or Sunday, adjust
  if (dayOfWeek === 0) {
    // Sunday
    friday.setDate(today.getDate() - 2);
    sundayEnd.setDate(today.getDate());
  } else if (dayOfWeek === 6) {
    // Saturday
    friday.setDate(today.getDate() - 1);
    sundayEnd.setDate(today.getDate() + 1);
  }
  
  return date >= friday && date <= sundayEnd;
};

export const useNearbyEvents = (
  events: Event[],
  userLocation: UserLocation | null,
  filters: FilterOptions
): EventWithDistance[] => {
  return useMemo(() => {
    let result: EventWithDistance[] = events.map((event) => {
      let distance: number | null = null;
      
      if (userLocation && event.latitude && event.longitude) {
        distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          event.latitude,
          event.longitude
        );
      }
      
      return { ...event, distance };
    });

    // Apply search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (event) =>
          event.title?.toLowerCase().includes(query) ||
          event.location_name?.toLowerCase().includes(query) ||
          event.category?.toLowerCase().includes(query)
      );
    }

    // Apply date filter
    if (filters.dateFilter !== "all") {
      result = result.filter((event) => {
        const eventDate = new Date(event.start_datetime);
        
        switch (filters.dateFilter) {
          case "tonight":
            return isTonight(eventDate);
          case "this_weekend":
            return isThisWeekend(eventDate);
          case "custom":
            if (filters.customDateRange) {
              return (
                eventDate >= filters.customDateRange.start &&
                eventDate <= filters.customDateRange.end
              );
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      result = result.filter(
        (event) => event.category && filters.categories.includes(event.category)
      );
    }

    // Apply distance filter
    if (filters.maxDistance !== null) {
      result = result.filter(
        (event) => event.distance !== null && event.distance <= filters.maxDistance!
      );
    }

    // Apply guestlist filter
    if (filters.hasGuestlistOnly) {
      result = result.filter((event) => event.has_guestlist);
    }

    // Sort by distance if user location is available
    if (userLocation) {
      result.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    return result;
  }, [events, userLocation, filters]);
};

export const formatDistance = (distance: number | null): string => {
  if (distance === null) return "";
  if (distance < 0.1) return "< 0.1 mi";
  if (distance < 1) return `${distance.toFixed(1)} mi`;
  return `${Math.round(distance)} mi`;
};
