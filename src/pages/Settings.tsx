import { motion } from "framer-motion";
import { ChevronLeft, User, Shield, CreditCard, HelpCircle, LogOut } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
const Settings = () => {
  const navigate = useNavigate();
  const {
    signOut
  } = useAuth();
  const settingsItems = [{
    icon: User,
    label: "Edit Profile",
    path: "/edit-profile"
  }, {
    icon: Shield,
    label: "Privacy",
    path: "/settings/privacy"
  }, {
    icon: CreditCard,
    label: "Subscription",
    path: "/settings/subscription"
  }, {
    icon: HelpCircle,
    label: "Help & Support",
    path: "/settings/help"
  }];
  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };
  return <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          
          <h1 className="font-brand text-xl font-bold text-foreground">
            Settings
          </h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-2">
        {settingsItems.map((item, index) => {
        const Icon = item.icon;
        return <motion.button key={item.label} initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: index * 0.05
        }} onClick={() => navigate(item.path)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 hover:bg-secondary/70 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-foreground font-medium">{item.label}</span>
            </motion.button>;
      })}

        <motion.button initial={{
        opacity: 0,
        x: -20
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        delay: 0.3
      }} onClick={handleSignOut} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-destructive/10 hover:bg-destructive/20 transition-colors mt-6">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <span className="text-destructive font-medium">Log Out</span>
        </motion.button>
      </div>
    </AppLayout>;
};
export default Settings;