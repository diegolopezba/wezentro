import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMapboxToken = () => {
  const { data: token, isLoading, error, isFetching } = useQuery({
    queryKey: ['mapbox-token'],
    queryFn: async () => {
      console.log('[MapboxToken] Fetching token...');
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      
      if (error) {
        console.error('[MapboxToken] Error:', error);
        throw error;
      }
      
      if (data?.token) {
        console.log('[MapboxToken] Token received');
        return data.token as string;
      }
      
      throw new Error('No token returned');
    },
    staleTime: 1000 * 60 * 60, // 1 hour - token rarely changes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
    retry: 2,
  });

  // Consider loading only if we don't have data yet
  const actuallyLoading = isLoading && !token;

  return { 
    token: token ?? null, 
    isLoading: actuallyLoading, 
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch token') : null 
  };
};
