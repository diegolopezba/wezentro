import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  user_ids?: string[];
  player_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  url?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = "5b6aae46-50f4-4a83-b3cf-bf62ec1138f1";
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    
    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error("ONESIGNAL_REST_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_ids, player_ids, title, body, data, url }: PushNotificationRequest = await req.json();

    let targetPlayerIds: string[] = [];

    // If user_ids provided, look up their player IDs
    if (user_ids && user_ids.length > 0) {
      const { data: subscriptions, error } = await supabase
        .from("push_subscriptions")
        .select("onesignal_player_id")
        .in("user_id", user_ids);

      if (error) {
        console.error("Error fetching subscriptions:", error);
        throw error;
      }

      targetPlayerIds = subscriptions?.map((s) => s.onesignal_player_id) || [];
    } else if (player_ids && player_ids.length > 0) {
      targetPlayerIds = player_ids;
    }

    if (targetPlayerIds.length === 0) {
      console.log("No player IDs found for notification");
      return new Response(
        JSON.stringify({ success: true, message: "No subscribers to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push notification to ${targetPlayerIds.length} devices`);

    // Send notification via OneSignal API
    const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: targetPlayerIds,
        headings: { en: title },
        contents: { en: body },
        data: data || {},
        url: url,
      }),
    });

    const oneSignalResult = await oneSignalResponse.json();
    
    if (!oneSignalResponse.ok) {
      console.error("OneSignal API error:", oneSignalResult);
      throw new Error(oneSignalResult.errors?.[0] || "Failed to send notification");
    }

    console.log("Push notification sent successfully:", oneSignalResult);

    return new Response(
      JSON.stringify({ success: true, result: oneSignalResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
