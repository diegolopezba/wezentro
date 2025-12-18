import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SearchUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const useSearchUsers = (searchQuery: string) => {
  return useQuery({
    queryKey: ["search-users", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      return data as SearchUser[];
    },
    enabled: searchQuery.length >= 2,
  });
};
