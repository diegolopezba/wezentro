import { motion } from "framer-motion";
import { ChevronLeft, Users, UserCheck, Heart, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUserSettings, useUpdateUserSettings, AllowMessagesFrom } from "@/hooks/useUserSettings";
import { toast } from "sonner";

const PrivacySettings = () => {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const messagingOptions: {
    value: AllowMessagesFrom;
    label: string;
    description: string;
    icon: typeof Users;
  }[] = [
    {
      value: "everyone",
      label: "Everyone",
      description: "Anyone can message you",
      icon: Users,
    },
    {
      value: "followers",
      label: "Followers",
      description: "Only people who follow you",
      icon: UserCheck,
    },
    {
      value: "mutual",
      label: "Mutual followers",
      description: "Only people you both follow each other",
      icon: Heart,
    },
  ];

  const handleOptionChange = (value: AllowMessagesFrom) => {
    updateSettings.mutate(
      { allow_messages_from: value },
      {
        onSuccess: () => {
          toast.success("Privacy settings updated");
        },
        onError: () => {
          toast.error("Failed to update settings");
        },
      }
    );
  };

  const currentValue = settings?.allow_messages_from || "everyone";

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">Privacy</h1>
        </div>
      </header>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Section header */}
            <div className="mb-4">
              <h2 className="font-semibold text-foreground">Messaging</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Control who can start new conversations with you
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {messagingOptions.map((option, index) => {
                const Icon = option.icon;
                const isSelected = currentValue === option.value;

                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleOptionChange(option.value)}
                    disabled={updateSettings.isPending}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-secondary/50 hover:bg-secondary/70 border-2 border-transparent"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected ? "bg-primary/20" : "bg-muted"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className={`font-medium ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
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
                        isSelected ? "border-primary" : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2.5 h-2.5 rounded-full bg-primary"
                        />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default PrivacySettings;
