import { motion } from "framer-motion";
import { User, Shield, CreditCard, HelpCircle, LogOut, Bookmark, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const settingsItems = [
    { icon: Bookmark, label: "Saved", path: "/saved" },
    { icon: User, label: "Edit Profile", path: "/edit-profile" },
    { icon: Shield, label: "Privacy", path: "/settings/privacy" },
    { icon: CreditCard, label: "Subscription", path: "/settings/subscription" },
    { icon: HelpCircle, label: "Help & Support", path: "/settings/help" },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <h1 className="font-brand text-xl font-bold text-foreground">
            Settings
          </h1>
        </div>
      </header>

      <div className="px-4 py-2">
        <div className="divide-y divide-border">
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-4 py-4 hover:bg-secondary/30 -mx-4 px-4 transition-colors"
              >
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground font-medium flex-1 text-left">
                  {item.label}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            );
          })}
        </div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 py-4 mt-8 hover:bg-destructive/10 -mx-4 px-4 transition-colors"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-destructive font-medium flex-1 text-left">
            Log Out
          </span>
        </motion.button>
      </div>
    </AppLayout>
  );
};

export default Settings;
