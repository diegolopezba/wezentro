import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Calendar, MapPin, DollarSign, Users, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const categories = [
  { id: "club", label: "Club", emoji: "🪩" },
  { id: "bar", label: "Bar", emoji: "🍸" },
  { id: "concert", label: "Concert", emoji: "🎵" },
  { id: "festival", label: "Festival", emoji: "🎪" },
  { id: "house_party", label: "House Party", emoji: "🏠" },
];

const Create = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [hasGuestlist, setHasGuestlist] = useState(false);

  return (
    <AppLayout hideNav>
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <div className="flex items-center gap-4 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">
            Create Event
          </h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 pb-32">
        {/* Media upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <label className="block">
            <div className="relative h-48 rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                Upload cover image or video
              </span>
              <span className="text-xs text-muted-foreground/60 mt-1">
                Recommended: 1080 x 1350px
              </span>
            </div>
            <input type="file" accept="image/*,video/*" className="hidden" />
          </label>
        </motion.div>

        {/* Category selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <label className="text-sm font-medium text-foreground mb-3 block">
            Event Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  selectedCategory === category.id
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <span>{category.emoji}</span>
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Event details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Event Title
            </label>
            <Input placeholder="Give your event a catchy name" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Description *
            </label>
            <textarea
              placeholder="Tell people what your event is about..."
              className="flex w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary min-h-[120px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="date" className="pl-10" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Time *
              </label>
              <Input type="time" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Enter venue or address" className="pl-10" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Price
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" placeholder="0" className="pl-10" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Capacity
              </label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" placeholder="Unlimited" className="pl-10" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Tags
            </label>
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="music, dance, rooftop..." className="pl-10" />
            </div>
          </div>
        </motion.div>

        {/* Guestlist toggle - Premium feature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="glass border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Enable Guestlist</h3>
                  <p className="text-xs text-muted-foreground">Requires Business Premium</p>
                </div>
              </div>
              <button
                onClick={() => setHasGuestlist(!hasGuestlist)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  hasGuestlist ? "bg-primary" : "bg-secondary"
                }`}
              >
                <motion.div
                  animate={{ x: hasGuestlist ? 22 : 2 }}
                  className="absolute top-1 w-5 h-5 rounded-full bg-foreground"
                />
              </button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass-strong safe-bottom">
        <Button variant="hero" className="w-full">
          Create Event
        </Button>
      </div>
    </AppLayout>
  );
};

export default Create;
