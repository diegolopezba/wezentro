import { supabase } from "@/integrations/supabase/client";

export const FOR_YOU_EVENTS_KEY = ["for-you-events"];

export const fetchForYouEvents = async () => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      *,
      creator:profiles!events_creator_id_fkey(
        id, username, full_name, avatar_url
      ),
      guestlist_entries(
        user:profiles!guestlist_entries_user_id_fkey(
          id, avatar_url
        )
      )
    `
    )
    .eq("is_public", true)
    .is("deleted_at", null)
    .or(`is_post.eq.true,start_datetime.gte.${now}`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data;
};
