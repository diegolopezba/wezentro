import { supabase } from "@/integrations/supabase/client";

interface SendPushNotificationParams {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  url?: string;
}

export async function sendPushNotification({
  userIds,
  title,
  body,
  data,
  url,
}: SendPushNotificationParams) {
  if (userIds.length === 0) {
    console.log("No user IDs provided for push notification");
    return;
  }

  try {
    const { data: response, error } = await supabase.functions.invoke(
      "send-push-notification",
      {
        body: {
          user_ids: userIds,
          title,
          body,
          data,
          url,
        },
      }
    );

    if (error) {
      console.error("Error sending push notification:", error);
      return;
    }

    console.log("Push notification sent:", response);
    return response;
  } catch (error) {
    console.error("Failed to send push notification:", error);
  }
}
