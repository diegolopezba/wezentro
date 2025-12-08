import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Share2, 
  Heart, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign,
  MessageCircle,
  Send,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockEvents } from "@/data/mockEvents";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const event = mockEvents.find((e) => e.id === id) || mockEvents[0];

  const attendees = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
    "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&q=80",
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&q=80",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero image */}
      <div className="relative h-[50vh]">
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        {/* Back button */}
        <div className="absolute top-0 left-0 right-0 safe-top">
          <div className="flex items-center justify-between px-4 py-4">
            <Button
              variant="glass"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex gap-2">
              <Button variant="glass" size="icon">
                <Heart className="w-5 h-5" />
              </Button>
              <Button variant="glass" size="icon">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-16 px-4 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Category & title */}
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium gradient-primary text-primary-foreground mb-3">
              {event.category.replace("_", " ")}
            </span>
            <h1 className="font-brand text-3xl font-bold text-foreground">
              {event.title}
            </h1>
          </div>

          {/* Host */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"
                alt="Host"
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <p className="text-sm text-muted-foreground">Hosted by</p>
                <p className="font-semibold text-foreground">@club_pulse</p>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              Follow
            </Button>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">When</p>
                <p className="font-semibold text-foreground">{event.date}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-semibold text-foreground">$25</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-semibold text-foreground">{event.location}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="font-brand text-lg font-semibold text-foreground mb-3">
              About
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Get ready for an unforgettable night at {event.title}! Join us for the best 
              music, incredible vibes, and an atmosphere you won't want to miss. Our world-class 
              DJs will keep you dancing until sunrise. Dress to impress and prepare for an epic 
              experience.
            </p>
          </div>

          {/* Guestlist attendees */}
          {event.hasGuestlist && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-brand text-lg font-semibold text-foreground">
                  Guestlist ({event.attendees})
                </h2>
                <span className="text-sm text-primary">View all</span>
              </div>
              
              {/* Avatars row */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex -space-x-3">
                  {attendees.map((avatar, i) => (
                    <img
                      key={i}
                      src={avatar}
                      alt={`Attendee ${i + 1}`}
                      className="w-10 h-10 rounded-full border-2 border-card object-cover"
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  +{(event.attendees || 0) - 5} more
                </span>
              </div>

              {/* Attendee list */}
              <div className="space-y-3">
                {attendees.slice(0, 3).map((avatar, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30"
                  >
                    <img
                      src={avatar}
                      alt={`Attendee ${i + 1}`}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">
                        @partygoer_{i + 1}
                      </p>
                      <p className="text-xs text-muted-foreground">Joined 2h ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Fixed bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass-strong safe-bottom">
        <div className="flex gap-3">
          <Button variant="secondary" size="icon-lg">
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="icon-lg">
            <Send className="w-5 h-5" />
          </Button>
          {event.hasGuestlist ? (
            <Button variant="hero" className="flex-1">
              <Users className="w-5 h-5 mr-2" />
              Join Guestlist
            </Button>
          ) : (
            <Button variant="hero" className="flex-1">
              <Star className="w-5 h-5 mr-2" />
              Interested
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
