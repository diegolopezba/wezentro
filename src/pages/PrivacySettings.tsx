import { m } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, Users, UserCheck, Heart, Loader2, Bell, BellOff, Send, AlertTriangle, HelpCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useUserSettings, useUpdateUserSettings, AllowMessagesFrom } from "@/hooks/useUserSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FeatureIntroSheet, useFeatureIntro } from "@/components/business/FeatureIntroSheet";
import { PRIVACY_INTRO } from "@/components/business/featureIntroSteps";

const PrivacySettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const intro = useFeatureIntro("privacy");
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { 
    isSubscribed, 
    isLoading: isPushLoading, 
    subscribe, 
    unsubscribe, 
    playerId,
    platformSupport,
    isReady,
  } = usePushNotifications();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const messagingOptions: {
    value: AllowMessagesFrom;
    label: string;
    description: string;
    icon: typeof Users;
  }[] = [
    {
      value: "everyone",
      label: "Todos",
      description: "Cualquiera puede enviarte mensajes",
      icon: Users,
    },
    {
      value: "followers",
      label: "Seguidores",
      description: "Solo personas que te siguen",
      icon: UserCheck,
    },
    {
      value: "mutual",
      label: "Mutuos",
      description: "Solo personas que ambos se siguen",
      icon: Heart,
    },
  ];

  const handleOptionChange = (value: AllowMessagesFrom) => {
    updateSettings.mutate(
      { allow_messages_from: value },
      {
        onSuccess: () => {
          toast.success("Configuración de privacidad actualizada");
        },
        onError: () => {
          toast.error("Error al actualizar configuración");
        },
      }
    );
  };

  const currentValue = settings?.allow_messages_from || "everyone";

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const sendTestNotification = async () => {
    if (!user?.id || !playerId) {
      toast.error("No suscrito a notificaciones push");
      return;
    }

    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          player_ids: [playerId],
          title: "Notificación de Prueba",
          body: "¡Las notificaciones push están funcionando!",
        },
      });

      if (error) {
        toast.error("Error al enviar notificación de prueba");
      } else {
        toast.success("¡Notificación de prueba enviada!");
      }
    } catch (error) {
      toast.error("Error al enviar notificación de prueba");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Disable toggle only when truly not supported (not just loading)
  const isPushDisabled = !platformSupport.supported && !platformSupport.canRetry;
  const showPushLoading = isPushLoading || !isReady;

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-medium text-foreground">Privacidad</h1>
        </div>
      </header>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Section header */}
            <div className="mb-4">
              <h2 className="font-semibold text-foreground">Mensajes</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Controla quién puede iniciar nuevas conversaciones contigo
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {messagingOptions.map((option, index) => {
                const Icon = option.icon;
                const isSelected = currentValue === option.value;

                return (
                  <m.button
                    key={option.value}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleOptionChange(option.value)}
                    disabled={updateSettings.isPending}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-2 border-primary" : "bg-secondary/50 border-2 border-transparent" }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected ? "bg-primary/20" : "bg-muted" }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isSelected ? "text-primary" : "text-muted-foreground" }`}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className={`font-medium ${
                          isSelected ? "text-primary" : "text-foreground" }`}
                      >
                        {option.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                    {/* Radio indicator */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-primary" : "border-muted-foreground" }`}
                    >
                      {isSelected && (
                        <m.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                  </m.button>
                );
              })}
            </div>

            {/* Notifications Section */}
            <div className="mt-8 mb-4">
              <h2 className="font-semibold text-foreground">Notificaciones</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Administra las preferencias de notificaciones push
              </p>
            </div>

            {/* Platform warning */}
            {!platformSupport.supported && platformSupport.reason && (
              <Alert variant="destructive" className="mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {platformSupport.reason}
                </AlertDescription>
              </Alert>
            )}

            {/* Push notification toggle */}
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-2xl">
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSubscribed ? "bg-primary/20" : "bg-muted" }`}
                >
                  {isSubscribed ? (
                    <Bell className="w-5 h-5 text-primary" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className={`font-medium ${isSubscribed ? "text-primary" : "text-foreground"}`}>
                    Notificaciones Push
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isSubscribed
                      ? "Activadas" : isPushDisabled
                      ? "No disponible" : "Desactivadas"}
                  </p>
                </div>
              </div>
              
              {showPushLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handlePushToggle}
                  disabled={isPushDisabled}
                />
              )}
            </div>

            {/* Test notification button */}
            {isSubscribed && (
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3" >
                <Button
                  variant="outline" size="sm" onClick={sendTestNotification}
                  disabled={isSendingTest}
                  className="w-full" >
                  {isSendingTest ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar Notificación de Prueba
                </Button>
              </m.div>
            )}
          </m.div>
        )}
      </div>
    </AppLayout>
  );
};

export default PrivacySettings;
