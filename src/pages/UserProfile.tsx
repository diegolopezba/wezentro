import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, UserPlus, Grid3X3, Star, Heart } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { mockEvents } from "@/data/mockEvents";

const mockUsers: Record<string, {
  name: string;
  username: string;
  avatar: string;
  bio: string;
  followers: string;
  following: number;
  events: number;
}> = {
  "user-1": {
    name: "Alex Martinez",
    username: "partygoer_1",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    bio: "Nightlife enthusiast. Always chasing the best vibes 🎉",
    followers: "1.2K",
    following: 567,
    events: 89
  },
  "user-2": {
    name: "Sarah Chen",
    username: "partygoer_2",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    bio: "Music lover & festival addict ✨",
    followers: "2.3K",
    following: 432,
    events: 156
  },
  "user-3": {
    name: "Jordan Lee",
    username: "partygoer_3",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80",
    bio: "Living for the weekend 🌙",
    followers: "876",
    following: 234,
    events: 45
  }
};

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "created" | "joined">("all");
  
  const user = mockUsers[id || "user-1"] || mockUsers["user-1"];

  const stats = [
    { label: "Events", value: user.events },
    { label: "Followers", value: user.followers },
    { label: "Following", value: user.following }
  ];

  const tabs = [
    { id: "all", label: "All", icon: Grid3X3 },
    { id: "created", label: "Created", icon: Star },
    { id: "joined", label: "Joined", icon: Heart }
  ];

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-3 px-4 py-0 bg-background">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">
            @{user.username}
          </h1>
        </div>
      </header>

      {/* Profile info */}
      <div className="px-4 py-0 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4"
        >
          <div className="relative">
            <img
              src={user.avatar}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-primary border-0"
            />
          </div>

          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">{user.name}</p>
            {/* Stats */}
            <div className="flex gap-6 mt-2">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-brand text-lg font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4"
        >
          <p className="text-sm text-foreground/80">{user.bio}</p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 mt-4"
        >
          <Button variant="hero" className="flex-1">
            <UserPlus className="w-4 h-4 mr-2" />
            Follow
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => navigate(`/chats/${id}`)}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Message
          </Button>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[72px] z-30 mt-4">
        <div className="flex border-b border-border bg-background">
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
                    layoutId="userProfileTabIndicator"
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
          {mockEvents.slice(0, 6).map((event, index) => (
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
                  <p className="text-xs text-foreground line-clamp-2 font-normal">
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

export default UserProfile;
