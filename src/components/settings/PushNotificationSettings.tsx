import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export const PushNotificationSettings = () => {
  const { isSubscribed, isLoading, subscribe, unsubscribe, playerId } = usePushNotifications();
  const { user } = useAuth();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const sendTestNotification = async () => {
    if (!user?.id || !playerId) {
      toast.error("Not subscribed to push notifications");
      return;
    }

    setIsSendingTest(true);
    try {
      console.log("[Push Test] Sending test notification to player:", playerId);
      
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          player_ids: [playerId],
          title: "Test Notification",
          body: "Push notifications are working! 🎉",
        },
      });

      if (error) {
        console.error("[Push Test] Error:", error);
        toast.error("Failed to send test notification");
      } else {
        console.log("[Push Test] Response:", data);
        toast.success("Test notification sent!");
      }
    } catch (error) {
      console.error("[Push Test] Exception:", error);
      toast.error("Failed to send test notification");
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">Push Notifications</p>
            <p className="text-sm text-muted-foreground">
              {isSubscribed
                ? "You'll receive push notifications"
                : "Enable to receive push notifications"}
            </p>
          </div>
        </div>
        
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
          />
        )}
      </div>
      
      {isSubscribed && (
        <Button
          variant="outline"
          size="sm"
          onClick={sendTestNotification}
          disabled={isSendingTest}
          className="w-full"
        >
          {isSendingTest ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Test Notification
        </Button>
      )}
    </div>
  );
};
