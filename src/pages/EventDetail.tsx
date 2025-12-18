import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, MessageCircle, Send, Loader2, Check, Clock, Volume2, VolumeX, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvent, useEventGuestlist } from "@/hooks/useEvents";
import { useIsOnGuestlist, useJoinGuestlist, useLeaveGuestlist, useHasActiveSubscription, usePendingGuestlistRequests } from "@/hooks/useGuestlist";
import { useAuth } from "@/contexts/AuthContext";

import { format } from "date-fns";
import { toast } from "sonner";
import { GuestlistManagementSheet } from "@/components/events/GuestlistManagementSheet";
import { ShareEventModal } from "@/components/events/ShareEventModal";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { isVideoUrl } from "@/lib/mediaUtils";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showManagement, setShowManagement] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setAspectRatio(img.naturalWidth / img.naturalHeight);
    setMediaLoaded(true);
  };

  const handleVideoMetadata = () => {
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current;
      setAspectRatio(videoWidth / videoHeight);
      setMediaLoaded(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  // Enable swipe-from-left-edge to go back on mobile
  useSwipeBack();
  const {
    data: event,
    isLoading,
    error
  } = useEvent(id);
  const {
    data: guestlistStatus
  } = useIsOnGuestlist(id);
  const {
    data: hasSubscription
  } = useHasActiveSubscription();
  const {
    data: pendingRequests = []
  } = usePendingGuestlistRequests(id);

  const joinGuestlist = useJoinGuestlist();
  const leaveGuestlist = useLeaveGuestlist();
  const isOnGuestlist = !!guestlistStatus;
  const isPending = guestlistStatus?.status === "pending";
  const isOwner = user?.id === event?.creator_id;
  const pendingCount = pendingRequests.length;
  const handleJoinGuestlist = async () => {
    if (!user) {
      toast.error("Please sign in to join guestlists");
      navigate("/auth");
      return;
    }
    if (!hasSubscription) {
      toast.error("Premium subscription required to join guestlists");
      return;
    }
    try {
      await joinGuestlist.mutateAsync(id!);
      toast.success("Guestlist request sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to join guestlist");
    }
  };
  const handleLeaveGuestlist = async () => {
    try {
      await leaveGuestlist.mutateAsync(id!);
      toast.success("Left the guestlist");
    } catch (error: any) {
      toast.error(error.message || "Failed to leave guestlist");
    }
  };
  const {
    data: guestlist = []
  } = useEventGuestlist(id);
  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  if (error || !event) {
    return <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <h1 className="font-brand text-xl font-bold text-foreground mb-2">Event not found</h1>
        <p className="text-muted-foreground mb-4">This event may have been removed or doesn't exist.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>;
  }
  const formattedDate = format(new Date(event.start_datetime), "EEE, MMM d • h:mm a");
  const formattedPrice = event.price ? `$${event.price}` : "Free";
  const isVideo = isVideoUrl(event.image_url);
  
  return <div className="min-h-screen bg-background">
      {/* Hero media */}
      <div 
        className="relative w-full"
        style={{ 
          aspectRatio: aspectRatio ? `${aspectRatio}` : '16/9',
          minHeight: '250px',
          maxHeight: '70vh',
        }}
      >
        {isVideo ? (
          <video 
            ref={videoRef}
            src={event.image_url || ""} 
            className={`w-full h-full object-cover transition-opacity duration-500 cursor-pointer ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoadedMetadata={handleVideoMetadata}
            onClick={togglePlayPause}
            playsInline
            autoPlay
            muted
            loop
          />
        ) : (
          <img 
            src={event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"} 
            alt={event.title || "Event"} 
            className={`w-full h-full object-cover transition-opacity duration-500 ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleImageLoad}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />

        {/* Back button */}
        <div className="absolute top-0 left-0 right-0 safe-top z-20">
          <div className="flex items-center justify-between px-4 py-4">
            <Button variant="glass" size="icon" onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {isVideo && (
              <button
                onClick={toggleMute}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-16 px-4 pb-8">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="space-y-6">
          {/* Category & title */}
          <div>
            {event.category && <span className="inline-block px-3 py-1 rounded-full text-xs font-medium gradient-primary text-primary-foreground mb-3">
                {event.category.replace("_", " ")}
              </span>}
            {event.title && <h1 className="font-brand text-3xl font-bold text-foreground">{event.title}</h1>}
          </div>

          {/* Host */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/user/${event.creator_id}`)}>
              <img src={event.creator?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"} alt="Host" className="w-12 h-12 rounded-xl object-cover" />
              <p className="font-semibold text-foreground">@{event.creator?.username || "unknown"}</p>
            </div>
            
            {/* Event action buttons */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setShowShareModal(true)}>
                <Send className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Heart className="w-5 h-5" />
              </Button>
              {event.has_guestlist && (
                isOwner ? (
                  <Button variant="hero" size="sm" onClick={() => setShowManagement(true)}>
                    Manage
                    {pendingCount > 0 && (
                      <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                        {pendingCount}
                      </span>
                    )}
                  </Button>
                ) : isOnGuestlist ? (
                  isPending ? (
                    <Button variant="ghost" size="sm" disabled>
                      <Clock className="w-4 h-4 mr-1" /> Pending
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={handleLeaveGuestlist} disabled={leaveGuestlist.isPending}>
                      {leaveGuestlist.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Joined</>}
                    </Button>
                  )
                ) : (
                  <Button variant="hero" size="sm" onClick={handleJoinGuestlist} disabled={joinGuestlist.isPending}>
                    {joinGuestlist.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Users className="w-4 h-4 mr-1" /> Join</>}
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 py-[6px]">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                
                <p className="font-semibold text-foreground text-xs">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 py-[6px]">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-accent" />
              </div>
              <div>
                
                <p className="font-semibold text-foreground">{formattedPrice}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 py-[6px]">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-semibold text-foreground">{event.location_name || "Location TBA"}</p>
            </div>
          </div>

          {/* Description */}
          {event.description && <div>
              <h2 className="font-brand text-lg font-semibold text-foreground mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed">{event.description}</p>
            </div>}

          {/* Guestlist attendees */}
          {event.has_guestlist && <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-brand text-lg font-semibold text-foreground">
                  Guestlist ({guestlist.length})
                </h2>
                {guestlist.length > 0 && <span className="text-sm text-primary cursor-pointer">View all</span>}
              </div>

              {guestlist.length > 0 ? <>
                  {/* Avatars row */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex -space-x-3">
                      {guestlist.slice(0, 5).map((entry: any, i: number) => <img key={entry.id} src={entry.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt={`Attendee ${i + 1}`} className="w-10 h-10 rounded-full border-2 border-card object-cover cursor-pointer hover:scale-110 transition-transform z-10" onClick={e => {
                  e.stopPropagation();
                  navigate(`/user/${entry.user_id}`);
                }} />)}
                    </div>
                    {guestlist.length > 5 && <span className="text-sm text-muted-foreground">
                        +{guestlist.length - 5} more
                      </span>}
                  </div>

                  {/* Attendee list */}
                  <div className="space-y-3">
                    {guestlist.slice(0, 3).map((entry: any) => <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                        <img src={entry.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.id}`} alt={entry.user?.username || "User"} className="w-10 h-10 rounded-xl object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate(`/user/${entry.user_id}`)} />
                        <div className="flex-1 cursor-pointer" onClick={() => navigate(`/user/${entry.user_id}`)}>
                          <p className="font-medium text-foreground text-sm">
                            @{entry.user?.username || "user"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {format(new Date(entry.joined_at), "MMM d")}
                          </p>
                        </div>
                        <MessageCircle className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/chats/${entry.user_id}`)} />
                      </div>)}
                  </div>
                </> : <p className="text-muted-foreground text-sm">No one has joined yet. Be the first!</p>}
            </div>}
        </motion.div>
      </div>


      {/* Guestlist Management Sheet */}
      {isOwner && event.has_guestlist && <GuestlistManagementSheet eventId={id!} open={showManagement} onOpenChange={setShowManagement} />}

      {/* Share Event Modal */}
      <ShareEventModal eventId={id!} open={showShareModal} onOpenChange={setShowShareModal} />
    </div>;
};
export default EventDetail;