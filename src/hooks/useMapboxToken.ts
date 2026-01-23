import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMapboxToken = () => {
  const { data: token, isLoading, error } = useQuery({
    queryKey: ['mapbox-token'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      
      if (error) {
        throw error;
      }
      
      if (data?.token) {
        return data.token as string;
      }
      
      throw new Error('No token returned');
    },
    staleTime: 1000 * 60 * 60, // 1 hour - token rarely changes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
    retry: 2,
    refetchOnMount: true, // Always fetch on mount for critical resource
  });

  return { 
    token: token ?? null, 
    isLoading, 
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch token') : null 
  };
};
