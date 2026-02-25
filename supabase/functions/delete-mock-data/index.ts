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
    const { adminPassword } = await req.json();
    
    if (adminPassword !== "Zentro@Admin2025") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // List all users (paginated)
    let allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    
    while (true) {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      if (!users || users.length === 0) break;
      allUsers = allUsers.concat(users);
      if (users.length < perPage) break;
      page++;
    }

    console.log(`Total users found: ${allUsers.length}`);

    // Identify mock accounts by email pattern
    // Mock accounts use: zentro.mock.*, zentro.business.*, zentro.user.* or similar patterns
    const mockPatterns = [
      /zentro\.mock\./i,
      /zentro\.business\./i,
      /zentro\.user\./i,
      /mock\d+@zentro/i,
      /business\d+@zentro/i,
      /user\d+@zentro/i,
      /@zentromock\./i,
      /testuser\d+@/i,
      /mockuser\d+@/i,
      /zentro\d+@/i,
    ];

    // Also get mock profile usernames to cross-reference
    const { data: mockProfiles } = await adminClient
      .from("profiles")
      .select("id, username")
      .or("username.like.mock_%,username.like.business_%,username.like.user_%")
      .limit(500);

    const mockProfileIds = new Set((mockProfiles || []).map((p: any) => p.id));

    const mockUsers = allUsers.filter(user => {
      const email = user.email || "";
      const matchesPattern = mockPatterns.some(p => p.test(email));
      const isInMockProfiles = mockProfileIds.has(user.id);
      return matchesPattern || isInMockProfiles;
    });

    console.log(`Mock users identified: ${mockUsers.length}`);

    if (mockUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No mock users found to delete", deleted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete users in batches
    const errors: string[] = [];
    let deletedCount = 0;

    for (const user of mockUsers) {
      const { error } = await adminClient.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`Failed to delete user ${user.id} (${user.email}):`, error.message);
        errors.push(`${user.email}: ${error.message}`);
      } else {
        deletedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${deletedCount} mock accounts`,
        deleted: deletedCount,
        failed: errors.length,
        errors: errors.slice(0, 10),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
