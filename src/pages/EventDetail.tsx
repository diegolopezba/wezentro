import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, MessageCircle, Send, Loader2, Check, Clock, Volume2, VolumeX, Heart, UserPlus, MoreVertical, Pencil, Trash2, Lock, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEvent, useEventGuestlist } from "@/hooks/useEvents";
import { useIsOnGuestlist, useJoinGuestlist, useLeaveGuestlist, useHasActiveSubscription, usePendingGuestlistRequests } from "@/hooks/useGuestlist";
import { useIsEventSaved, useSaveEvent, useUnsaveEvent } from "@/hooks/useSavedEvents";
import { useIsEventLiked, useLikeEvent, useUnlikeEvent } from "@/hooks/useEventLikes";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { GuestlistManagementSheet } from "@/components/events/GuestlistManagementSheet";
import { ShareEventModal } from "@/components/events/ShareEventModal";
import { ShareGuestlistModal } from "@/components/events/ShareGuestlistModal";
import { EditEventSheet } from "@/components/events/EditEventSheet";
import { DeleteEventDialog } from "@/components/events/DeleteEventDialog";
import { InvitationsSentSection } from "@/components/events/InvitationsSentSection";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { isVideoUrl } from "@/lib/mediaUtils";
import { trackEventView } from "@/lib/analyticsTracking";
const EventDetail = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [showManagement, setShowManagement] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGuestlistInviteModal, setShowGuestlistInviteModal] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
      const {
        videoWidth,
        videoHeight
      } = videoRef.current;
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

  // Track event view for analytics
  useEffect(() => {
    if (id && user?.id) {
      trackEventView(id, user.id);
    }
  }, [id, user?.id]);
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
  const {
    data: isSaved
  } = useIsEventSaved(id);
  const saveEvent = useSaveEvent();
  const unsaveEvent = useUnsaveEvent();
  const {
    data: isLiked
  } = useIsEventLiked(id!);
  const likeEvent = useLikeEvent();
  const unlikeEvent = useUnlikeEvent();
  const joinGuestlist = useJoinGuestlist();
  const leaveGuestlist = useLeaveGuestlist();
  const isOnGuestlist = !!guestlistStatus;
  const isPending = guestlistStatus?.status === "pending";
  const isApproved = guestlistStatus?.status === "approved";
  const isOwner = user && user.id === event?.creator_id;
  const canInviteToGuestlist = user && (isOwner || isApproved);
  const pendingCount = pendingRequests.length;
  const isAuthenticated = !!user;
  const handleSaveToggle = async () => {
    if (!user) {
      toast.error("Please sign in to save events");
      navigate("/auth");
      return;
    }
    try {
      if (isSaved) {
        await unsaveEvent.mutateAsync(id!);
        toast.success("Event removed from saved");
      } else {
        await saveEvent.mutateAsync(id!);
        toast.success("Event saved!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save event");
    }
  };
  const handleLikeToggle = async () => {
    if (!user) {
      toast.error("Please sign in to like events");
      navigate("/auth");
      return;
    }
    try {
      if (isLiked) {
        await unlikeEvent.mutateAsync(id!);
      } else {
        await likeEvent.mutateAsync(id!);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to like event");
    }
  };
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
  const formattedDate = event.start_datetime 
    ? format(new Date(event.start_datetime), "EEE, MMM d • h:mm a")
    : null;
  const formattedPrice = event.price ? `$${event.price}` : "Free";
  const isVideo = isVideoUrl(event.image_url);
  const isPost = event.is_post || !event.start_datetime;
  return <div className="min-h-screen bg-background">
      {/* Hero media */}
      <div className="relative w-full" style={{
      aspectRatio: aspectRatio ? `${aspectRatio}` : '16/9',
      minHeight: '250px',
      maxHeight: '70vh'
    }}>
        {isVideo ? <video ref={videoRef} src={event.image_url || ""} className={`w-full h-full object-cover transition-opacity duration-500 cursor-pointer ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`} onLoadedMetadata={handleVideoMetadata} onClick={togglePlayPause} playsInline autoPlay muted loop /> : <img src={event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"} alt={event.title || "Event"} className={`w-full h-full object-cover transition-opacity duration-500 ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`} onLoad={handleImageLoad} />}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />

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
            {isVideo && <button onClick={toggleMute} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
              </button>}
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
            {event.category && <span className="inline-block px-3 py-1 rounded-full text-xs font-medium gradient-primary mb-3 text-primary">
                {event.category.replace("_", " ")}
              </span>}
            {event.title && <h1 className="font-brand text-3xl font-bold text-foreground">{event.title}</h1>}
          </div>

          {/* Event action buttons */}
          <div className="flex items-center justify-between">
            {/* Left: Like, Send, Save, Invite */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleLikeToggle} disabled={likeEvent.isPending || unlikeEvent.isPending}>
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowShareModal(true)}>
                <Send className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSaveToggle} disabled={saveEvent.isPending || unsaveEvent.isPending}>
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-primary text-primary' : ''}`} />
              </Button>
              {!isPost && event.has_guestlist && canInviteToGuestlist && (
                <Button variant="ghost" size="icon" onClick={() => setShowGuestlistInviteModal(true)}>
                  <UserPlus className="w-5 h-5" />
                </Button>
              )}
            </div>

            {/* Right: Join/Manage, Edit dropdown */}
            <div className="flex items-center gap-1">
              {!isPost && event.has_guestlist && (
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
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowEditSheet(true)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Event
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Event
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Host */}
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => {
              if (event.creator_id) {
                navigate(`/user/${event.creator_id}`);
              }
            }}
          >
            <img 
              src={event.creator?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"} 
              alt="Host" 
              className="w-12 h-12 rounded-full object-cover hover:scale-105 transition-transform" 
            />
            <p className="font-semibold text-foreground hover:text-primary transition-colors">
              @{event.creator?.username || "unknown"}
            </p>
          </div>

          {/* Details - Only show for events, not posts */}
          {!isPost && (
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
                  <DollarSign className="w-5 h-5 text-accent bg-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{formattedPrice}</p>
                </div>
              </div>
            </div>
          )}

          {/* Location - Only show if location exists */}
          {event.location_name && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 py-[6px]">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">{event.location_name}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && <div className="space-y-2">
              <h2 className="font-brand text-lg font-semibold text-foreground">About</h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>}

          {/* Guestlist attendees - Only show for events, not posts */}
          {!isPost && event.has_guestlist && <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-brand text-lg font-semibold text-foreground">
                  Guestlist ({guestlist.length})
                </h2>
                {guestlist.length > 0 && hasSubscription && <span className="text-sm text-primary cursor-pointer">View all</span>}
              </div>

              {guestlist.length > 0 ? hasSubscription ? <>
                    {/* Avatars row - Premium users see real avatars */}
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
                          <img src={entry.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.id}`} alt={entry.user?.username || "User"} className="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate(`/user/${entry.user_id}`)} />
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
                  </> : <>
                    {/* Non-premium: show blurred real avatars */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex -space-x-3">
                        {guestlist.slice(0, 5).map((entry: any, i: number) => <img key={entry.id} src={entry.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt={`Attendee ${i + 1}`} className="w-10 h-10 rounded-full border-2 border-card object-cover blur-[3px]" />)}
                      </div>
                      {guestlist.length > 5 && <span className="text-sm text-muted-foreground">
                          +{guestlist.length - 5} more
                        </span>}
                    </div>

                    {/* Upsell card for non-premium users */}
                    <div className="p-4 rounded-2xl bg-secondary/50 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground text-sm">Members Only</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">
                        Become a Zentro member to see who's on the guestlist
                      </p>
                      <Button variant="hero" size="sm" className="w-full" onClick={() => navigate("/subscription")}>
                        Become a Member
                      </Button>
                    </div>
                  </> : <p className="text-muted-foreground text-sm">No one has joined yet. Be the first!</p>}
            </div>}

          {/* Invitations Sent Section - Owner only, for events with guestlist */}
          {!isPost && isOwner && event.has_guestlist && <InvitationsSentSection eventId={id!} />}

          {/* Sign up prompt for unauthenticated users */}
          {!isAuthenticated && <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
              <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
                Join Zentro to connect
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Sign up to join guestlists, save events, and connect with other attendees.
              </p>
              <Button variant="hero" className="w-full" onClick={() => navigate("/auth")}>
                Sign Up / Log In
              </Button>
            </div>}
        </motion.div>
      </div>


      {/* Guestlist Management Sheet */}
      {isOwner && event.has_guestlist && <GuestlistManagementSheet eventId={id!} open={showManagement} onOpenChange={setShowManagement} />}

      {/* Share Event Modal */}
      <ShareEventModal eventId={id!} open={showShareModal} onOpenChange={setShowShareModal} />

      {/* Share Guestlist Invite Modal */}
      {event.has_guestlist && canInviteToGuestlist && <ShareGuestlistModal eventId={id!} open={showGuestlistInviteModal} onOpenChange={setShowGuestlistInviteModal} />}

      {/* Edit Event Sheet - Owner only */}
      {isOwner && <EditEventSheet event={event} open={showEditSheet} onOpenChange={setShowEditSheet} />}

      {/* Delete Event Dialog - Owner only */}
      {isOwner && <DeleteEventDialog eventId={id!} eventTitle={event.title} open={showDeleteDialog} onOpenChange={setShowDeleteDialog} />}
    </div>;
};
export default EventDetail;