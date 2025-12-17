import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Heart, Calendar, MapPin, Users, DollarSign, MessageCircle, Send, Star, Loader2, Check, Clock, Settings2, UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvent, useEventGuestlist } from "@/hooks/useEvents";
import { useIsOnGuestlist, useJoinGuestlist, useLeaveGuestlist, useHasActiveSubscription, usePendingGuestlistRequests } from "@/hooks/useGuestlist";
import { useAuth } from "@/contexts/AuthContext";
import { useIsFollowing, useFollowUser, useUnfollowUser } from "@/hooks/useUserProfile";
import { format } from "date-fns";
import { toast } from "sonner";
import { GuestlistManagementSheet } from "@/components/events/GuestlistManagementSheet";
import { useSwipeBack } from "@/hooks/useSwipeBack";
const EventDetail = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [showManagement, setShowManagement] = useState(false);
  
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
  
  // Follow hooks for event creator
  const { data: isFollowingCreator, isLoading: followStatusLoading } = useIsFollowing(event?.creator_id);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  
  const joinGuestlist = useJoinGuestlist();
  const leaveGuestlist = useLeaveGuestlist();
  const isOnGuestlist = !!guestlistStatus;
  const isPending = guestlistStatus?.status === "pending";
  const isApproved = guestlistStatus?.status === "approved";
  const isOwner = user?.id === event?.creator_id;
  const pendingCount = pendingRequests.length;
  const isFollowPending = followMutation.isPending || unfollowMutation.isPending;

  const handleFollowToggle = () => {
    if (!event?.creator_id) return;
    if (!user) {
      toast.error("Please sign in to follow users");
      navigate("/auth");
      return;
    }
    if (isFollowingCreator) {
      unfollowMutation.mutate(event.creator_id);
    } else {
      followMutation.mutate(event.creator_id);
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
  const formattedDate = format(new Date(event.start_datetime), "EEE, MMM d • h:mm a");
  const formattedPrice = event.price ? `$${event.price}` : "Free";
  return <div className="min-h-screen bg-background">
      {/* Hero image */}
      <div className="relative h-[50vh]">
        <img src={event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"} alt={event.title || "Event"} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Back button */}
        <div className="absolute top-0 left-0 right-0 safe-top">
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
              <div>
                <p className="text-sm text-muted-foreground">Hosted by</p>
                <p className="font-semibold text-foreground">@{event.creator?.username || "unknown"}</p>
              </div>
            </div>
            {!isOwner && (
              <Button 
                variant={isFollowingCreator ? "secondary" : "hero"} 
                size="sm"
                onClick={handleFollowToggle}
                disabled={followStatusLoading || isFollowPending}
              >
                {isFollowPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowingCreator ? (
                  <>
                    <UserMinus className="w-3 h-3 mr-1" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            )}
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

      {/* Fixed bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass-strong safe-bottom">
        <div className="flex gap-3">
          <Button variant="secondary" size="icon-lg">
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="icon-lg">
            <Send className="w-5 h-5" />
          </Button>
          {event.has_guestlist ? isOwner ? <Button variant="hero" className="flex-1 relative" onClick={() => setShowManagement(true)}>
                <Settings2 className="w-5 h-5 mr-2" />
                Manage Guestlist
                {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                    {pendingCount}
                  </span>}
              </Button> : isOnGuestlist ? isPending ? <Button variant="secondary" className="flex-1" onClick={handleLeaveGuestlist} disabled={leaveGuestlist.isPending}>
                  {leaveGuestlist.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Clock className="w-5 h-5 mr-2" />}
                  Pending Approval
                </Button> : <Button variant="secondary" className="flex-1" onClick={handleLeaveGuestlist} disabled={leaveGuestlist.isPending}>
                  {leaveGuestlist.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Check className="w-5 h-5 mr-2" />}
                  On Guestlist
                </Button> : <Button variant="hero" className="flex-1" onClick={handleJoinGuestlist} disabled={joinGuestlist.isPending}>
                {joinGuestlist.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Users className="w-5 h-5 mr-2" />}
                Join Guestlist
              </Button> : <Button variant="hero" className="flex-1">
              <Star className="w-5 h-5 mr-2" />
              Interested
            </Button>}
        </div>
      </div>

      {/* Guestlist Management Sheet */}
      {isOwner && event.has_guestlist && <GuestlistManagementSheet eventId={id!} open={showManagement} onOpenChange={setShowManagement} />}
    </div>;
};
export default EventDetail;