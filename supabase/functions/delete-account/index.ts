import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { password } = await req.json();
    
    if (!password) {
      return new Response(
        JSON.stringify({ error: "Password required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's token to get their info
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password by attempting to sign in
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ error: "Invalid password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to delete the user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1) Wipe the user's uploaded files from storage. All uploads use the
    //    convention `{user.id}/...` (avatars, event media, payment QR images).
    //    We list and remove in batches; failures are logged but do NOT abort
    //    the auth deletion — better to fully delete the user and reap orphan
    //    files later than to leave a half-deleted account.
    const buckets = ["event-images"];
    for (const bucket of buckets) {
      try {
        let offset = 0;
        const pageSize = 1000;
        // Loop until we've listed everything under this user's folder
        while (true) {
          const { data: files, error: listError } = await adminClient.storage
            .from(bucket)
            .list(user.id, { limit: pageSize, offset });

          if (listError) {
            console.error(`[delete-account] list error in ${bucket}:`, listError);
            break;
          }
          if (!files || files.length === 0) break;

          const paths = files.map((f) => `${user.id}/${f.name}`);
          const { error: removeError } = await adminClient.storage
            .from(bucket)
            .remove(paths);
          if (removeError) {
            console.error(`[delete-account] remove error in ${bucket}:`, removeError);
          }

          if (files.length < pageSize) break;
          offset += pageSize;
        }
      } catch (storageErr) {
        console.error(`[delete-account] storage cleanup failed for ${bucket}:`, storageErr);
      }
    }

    // 2) Delete the user (cascades handle profile + all related rows;
    //    chat_participants trigger sweeps any now-empty 1:1 chats).
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
