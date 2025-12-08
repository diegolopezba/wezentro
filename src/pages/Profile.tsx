import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Edit2, Calendar, Users, Heart, Grid3X3, Star } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { mockEvents } from "@/data/mockEvents";

const Profile = () => {
  const [activeTab, setActiveTab] = useState<"all" | "created" | "joined">("all");

  const stats = [
    { label: "Events", value: 12 },
    { label: "Followers", value: "1.2K" },
    { label: "Following", value: 342 },
  ];

  const tabs = [
    { id: "all", label: "All", icon: Grid3X3 },
    { id: "created", label: "Created", icon: Star },
    { id: "joined", label: "Joined", icon: Heart },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="font-brand text-xl font-bold text-foreground">
            Profile
          </h1>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Profile info */}
      <div className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4"
        >
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80"
              alt="Profile"
              className="w-24 h-24 rounded-3xl object-cover border-2 border-primary"
            />
            <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow">
              <Edit2 className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>

          <div className="flex-1">
            <h2 className="font-brand text-xl font-bold text-foreground">
              @nightowl_mike
            </h2>
            <p className="text-sm text-muted-foreground mb-2">Mike Rodriguez</p>
            <p className="text-sm text-foreground/80">
              Living for the night vibes 🌙 LA scene explorer
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex justify-around mt-6 py-4 rounded-2xl bg-secondary/50"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-brand text-xl font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 mt-4"
        >
          <Button className="flex-1" variant="default">
            Edit Profile
          </Button>
          <Button className="flex-1" variant="secondary">
            Share Profile
          </Button>
        </motion.div>

        {/* Subscription badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4"
        >
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Free Plan</h3>
                  <p className="text-xs text-muted-foreground">
                    Upgrade to join guestlists
                  </p>
                </div>
              </div>
              <Button variant="premium" size="sm">
                Upgrade
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[72px] z-30 glass-strong">
        <div className="flex border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors relative ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="profileTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events grid */}
      <div className="px-4 py-4">
        <div className="masonry-grid">
          {mockEvents.slice(0, 8).map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="masonry-item"
            >
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-xs text-foreground font-medium line-clamp-2">
                    {event.title}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
