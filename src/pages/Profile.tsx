import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Edit2, Calendar, Users, Heart, Grid3X3, Star } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { mockEvents } from "@/data/mockEvents";
const Profile = () => {
  const [activeTab, setActiveTab] = useState<"all" | "created" | "joined">("all");
  const stats = [{
    label: "Events",
    value: 12
  }, {
    label: "Followers",
    value: "1.2K"
  }, {
    label: "Following",
    value: 342
  }];
  const tabs = [{
    id: "all",
    label: "All",
    icon: Grid3X3
  }, {
    id: "created",
    label: "Created",
    icon: Star
  }, {
    id: "joined",
    label: "Joined",
    icon: Heart
  }];
  return <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center justify-between px-4 py-0 bg-background">
          <h1 className="font-brand text-xl font-bold text-foreground">
            @nightowl_mike
          </h1>
          <Button variant="ghost" size="icon" onClick={() => window.location.href = '/settings'}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Profile info */}
      <div className="px-4 py-0 bg-background">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="flex items-start gap-4">
          <div className="relative">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80" alt="Profile" className="w-24 h-24 rounded-full object-cover border-primary border-0" />
            
          </div>

          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">Mike Rodriguez</p>
            {/* Stats */}
            <div className="flex gap-6 mt-2">
              {stats.map(stat => <div key={stat.label} className="text-center">
                  <p className="font-brand text-lg font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>)}
            </div>
          </div>
        </motion.div>

        {/* Bio */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.05
      }} className="mt-4">
          <p className="text-sm text-foreground/80">
            Living for the night vibes 🌙 LA scene explorer
          </p>
        </motion.div>

        {/* Subscription badge */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.15
      }} className="mt-4">
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
      <div className="sticky top-[72px] z-30">
        <div className="flex border-b border-border bg-background">
          {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors relative ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                {isActive && <motion.div layoutId="profileTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>;
        })}
        </div>
      </div>

      {/* Events grid */}
      <div className="py-4">
        <div className="masonry-grid">
          {mockEvents.slice(0, 8).map((event, index) => <motion.div key={event.id} initial={{
          opacity: 0,
          scale: 0.9
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          delay: index * 0.05
        }} className="masonry-item">
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-xs text-foreground line-clamp-2 font-normal">
                    {event.title}
                  </p>
                </div>
              </div>
            </motion.div>)}
        </div>
      </div>
    </AppLayout>;
};
export default Profile;