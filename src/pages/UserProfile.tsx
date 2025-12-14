import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, UserPlus, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockUsers: Record<string, {
  name: string;
  username: string;
  avatar: string;
  bio: string;
  location: string;
  followers: number;
  following: number;
  eventsAttended: number;
}> = {
  "user-1": {
    name: "Alex Martinez",
    username: "@partygoer_1",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    bio: "Nightlife enthusiast. Always chasing the best vibes 🎉",
    location: "Los Angeles, CA",
    followers: 1234,
    following: 567,
    eventsAttended: 89
  },
  "user-2": {
    name: "Sarah Chen",
    username: "@partygoer_2",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    bio: "Music lover & festival addict ✨",
    location: "San Francisco, CA",
    followers: 2341,
    following: 432,
    eventsAttended: 156
  },
  "user-3": {
    name: "Jordan Lee",
    username: "@partygoer_3",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80",
    bio: "Living for the weekend 🌙",
    location: "New York, NY",
    followers: 876,
    following: 234,
    eventsAttended: 45
  }
};

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const user = mockUsers[id || "user-1"] || mockUsers["user-1"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-foreground">{user.username}</h1>
        </div>
      </header>

      {/* Profile content */}
      <div className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Avatar and name */}
          <div className="flex flex-col items-center text-center">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-28 h-28 rounded-3xl object-cover mb-4"
            />
            <h2 className="font-brand text-2xl font-bold text-foreground">
              {user.name}
            </h2>
            <p className="text-muted-foreground">{user.username}</p>
          </div>

          {/* Bio */}
          <p className="text-center text-foreground/80">{user.bio}</p>

          {/* Location */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{user.location}</span>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="font-bold text-foreground text-xl">{user.followers.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground text-xl">{user.following.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground text-xl">{user.eventsAttended}</p>
              <p className="text-sm text-muted-foreground">Events</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
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
          </div>

          {/* Recent events section placeholder */}
          <div className="pt-4">
            <h3 className="font-brand text-lg font-semibold text-foreground mb-4">
              Recent Events
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-secondary/50"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UserProfile;
