import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, MessageCircle, Send, Loader2, Check, Clock, Volume2, VolumeX, Heart, UserPlus, MoreVertical, Pencil, Trash2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEvent, useEventGuestlist } from "@/hooks/useEvents";
import { useIsOnGuestlist, useJoinGuestlist, useLeaveGuestlist, useHasActiveSubscription, usePendingGuestlistRequests } from "@/hooks/useGuestlist";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedEvent } from "@/contexts/SelectedEventContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { GuestlistManagementSheet } from "@/components/events/GuestlistManagementSheet";
import { ShareEventModal } from "@/components/events/ShareEventModal";
import { ShareGuestlistModal } from "@/components/events/ShareGuestlistModal";
import { EditEventSheet } from "@/components/events/EditEventSheet";
import { DeleteEventDialog } from "@/components/events/DeleteEventDialog";
import { InvitationsSentSection } from "@/components/events/InvitationsSentSection";
import { isVideoUrl } from "@/lib/mediaUtils";

export const EventDetailOverlay = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedEventId, closeEvent } = useSelectedEvent();
  
  const [showManagement, setShowManagement] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGuestlistInviteModal, setShowGuestlistInviteModal] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: event, isLoading, error } = useEvent(selectedEventId || undefined);
  const { data: guestlistStatus } = useIsOnGuestlist(selectedEventId || undefined);
  const { data: hasSubscription } = useHasActiveSubscription();
  const { data: pendingRequests = [] } = usePendingGuestlistRequests(selectedEventId || undefined);
  const { data: guestlist = [] } = useEventGuestlist(selectedEventId || undefined);

  const joinGuestlist = useJoinGuestlist();
  const leaveGuestlist = useLeaveGuestlist();
  
  const isOnGuestlist = !!guestlistStatus;
  const isPending = guestlistStatus?.status === "pending";
  const isApproved = guestlistStatus?.status === "approved";
  const isOwner = user?.id === event?.creator_id;
  const canInviteToGuestlist = isOwner || isApproved;
  const pendingCount = pendingRequests.length;

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

  const handleJoinGuestlist = async () => {
    if (!user) {
      toast.error("Please sign in to join guestlists");
      closeEvent();
      navigate("/auth");
      return;
    }
    if (!hasSubscription) {
      toast.error("Premium subscription required to join guestlists");
      return;
    }
    try {
      await joinGuestlist.mutateAsync(selectedEventId!);
      toast.success("Guestlist request sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to join guestlist");
    }
  };

  const handleLeaveGuestlist = async () => {
    try {
      await leaveGuestlist.mutateAsync(selectedEventId!);
      toast.success("Left the guestlist");
    } catch (error: any) {
      toast.error(error.message || "Failed to leave guestlist");
    }
  };

  const formattedDate = event ? format(new Date(event.start_datetime), "EEE, MMM d • h:mm a") : "";
  const formattedPrice = event?.price ? `$${event.price}` : "Free";
  const isVideo = event ? isVideoUrl(event.image_url) : false;

  return (
    <AnimatePresence>
      {selectedEventId && (
        <motion.div
          layoutId={`event-card-${selectedEventId}`}
          className="fixed inset-0 z-50 bg-background overflow-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {isLoading ? (
            <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error || !event ? (
            <div className="min-h-screen flex flex-col items-center justify-center px-4">
              <h1 className="font-brand text-xl font-bold text-foreground mb-2">Event not found</h1>
              <p className="text-muted-foreground mb-4">This event may have been removed.</p>
              <Button onClick={closeEvent}>Go Back</Button>
            </div>
          ) : (
            <>
              {/* Hero media */}
              <motion.div 
                layoutId={`event-image-${selectedEventId}`}
                className="relative w-full"
                style={{ 
                  aspectRatio: '16/9',
                  minHeight: '250px',
                  maxHeight: '70vh',
                }}
              >
                {isVideo ? (
                  <video 
                    ref={videoRef}
                    src={event.image_url || ""} 
                    className="w-full h-full object-cover"
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
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />

                {/* Close button */}
                <div className="absolute top-0 left-0 right-0 safe-top z-20">
                  <div className="flex items-center justify-between px-4 py-4">
                    <Button variant="glass" size="icon" onClick={closeEvent}>
                      <X className="w-5 h-5" />
                    </Button>
                    {isVideo && (
                      <button
                        onClick={toggleMute}
                        className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Content */}
              <motion.div 
                className="relative -mt-16 px-4 pb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="space-y-6">
                  {/* Category & title */}
                  <div>
                    {event.category && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium gradient-primary text-primary-foreground mb-3">
                        {event.category.replace("_", " ")}
                      </span>
                    )}
                    {event.title && <h1 className="font-brand text-3xl font-bold text-foreground">{event.title}</h1>}
                  </div>

                  {/* Host */}
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 cursor-pointer" 
                      onClick={() => {
                        closeEvent();
                        navigate(`/user/${event.creator_id}`);
                      }}
                    >
                      <img 
                        src={event.creator?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"} 
                        alt="Host" 
                        className="w-12 h-12 rounded-full object-cover" 
                      />
                      <p className="font-semibold text-foreground">@{event.creator?.username || "unknown"}</p>
                    </div>
                    
                    {/* Event action buttons */}
                    <div className="flex items-center gap-1">
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
                            <DropdownMenuItem
                              onClick={() => setShowDeleteDialog(true)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Event
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setShowShareModal(true)}>
                        <Send className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Heart className="w-5 h-5" />
                      </Button>
                      {event.has_guestlist && canInviteToGuestlist && (
                        <Button variant="ghost" size="icon" onClick={() => setShowGuestlistInviteModal(true)}>
                          <UserPlus className="w-5 h-5" />
                        </Button>
                      )}
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
                  {event.description && (
                    <div>
                      <h2 className="font-brand text-lg font-semibold text-foreground mb-3">About</h2>
                      <p className="text-muted-foreground leading-relaxed">{event.description}</p>
                    </div>
                  )}

                  {/* Guestlist attendees */}
                  {event.has_guestlist && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-brand text-lg font-semibold text-foreground">
                          Guestlist ({guestlist.length})
                        </h2>
                        {guestlist.length > 0 && hasSubscription && (
                          <span className="text-sm text-primary cursor-pointer">View all</span>
                        )}
                      </div>

                      {guestlist.length > 0 ? (
                        hasSubscription ? (
                          <>
                            <div className="flex items-center gap-2 mb-4">
                              <div className="flex -space-x-3">
                                {guestlist.slice(0, 5).map((entry: any, i: number) => (
                                  <img 
                                    key={entry.id} 
                                    src={entry.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                                    alt={`Attendee ${i + 1}`}
                                    className="w-10 h-10 rounded-full border-2 border-card object-cover cursor-pointer hover:scale-110 transition-transform z-10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      closeEvent();
                                      navigate(`/user/${entry.user_id}`);
                                    }}
                                  />
                                ))}
                              </div>
                              {guestlist.length > 5 && (
                                <span className="text-sm text-muted-foreground">
                                  +{guestlist.length - 5} more
                                </span>
                              )}
                            </div>

                            <div className="space-y-3">
                              {guestlist.slice(0, 3).map((entry: any) => (
                                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                                  <img 
                                    src={entry.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.id}`}
                                    alt={entry.user?.username || "User"}
                                    className="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => {
                                      closeEvent();
                                      navigate(`/user/${entry.user_id}`);
                                    }}
                                  />
                                  <div 
                                    className="flex-1 cursor-pointer" 
                                    onClick={() => {
                                      closeEvent();
                                      navigate(`/user/${entry.user_id}`);
                                    }}
                                  >
                                    <p className="font-medium text-foreground text-sm">
                                      @{entry.user?.username || "user"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Joined {format(new Date(entry.joined_at), "MMM d")}
                                    </p>
                                  </div>
                                  <MessageCircle 
                                    className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => {
                                      closeEvent();
                                      navigate(`/chats/${entry.user_id}`);
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-4">
                              <div className="flex -space-x-3">
                                {guestlist.slice(0, 5).map((entry: any, i: number) => (
                                  <img 
                                    key={entry.id} 
                                    src={entry.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                                    alt={`Attendee ${i + 1}`}
                                    className="w-10 h-10 rounded-full border-2 border-card object-cover blur-[3px]"
                                  />
                                ))}
                              </div>
                              {guestlist.length > 5 && (
                                <span className="text-sm text-muted-foreground">
                                  +{guestlist.length - 5} more
                                </span>
                              )}
                            </div>

                            <div className="p-4 rounded-2xl bg-secondary/50 border border-border/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Lock className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-foreground text-sm">Members Only</span>
                              </div>
                              <p className="text-muted-foreground text-sm mb-4">
                                Become a Zentro member to see who's on the guestlist
                              </p>
                              <Button 
                                variant="hero" 
                                size="sm" 
                                className="w-full"
                                onClick={() => {
                                  closeEvent();
                                  navigate("/subscription");
                                }}
                              >
                                Unlock Premium
                              </Button>
                            </div>
                          </>
                        )
                      ) : (
                        <div className="text-center py-6 rounded-2xl bg-secondary/30">
                          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">
                            No one has joined yet. Be the first!
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Invitations Sent Section - Owner only */}
                  {isOwner && event.has_guestlist && (
                    <InvitationsSentSection eventId={selectedEventId!} />
                  )}
                </div>
              </motion.div>

              {/* Modals */}
              {event && (
                <>
                  <GuestlistManagementSheet
                    eventId={selectedEventId!}
                    open={showManagement}
                    onOpenChange={setShowManagement}
                  />
                  <ShareEventModal
                    open={showShareModal}
                    onOpenChange={setShowShareModal}
                    eventId={selectedEventId!}
                  />
                  <ShareGuestlistModal
                    open={showGuestlistInviteModal}
                    onOpenChange={setShowGuestlistInviteModal}
                    eventId={selectedEventId!}
                  />
                  <EditEventSheet
                    open={showEditSheet}
                    onOpenChange={setShowEditSheet}
                    event={event}
                  />
                  <DeleteEventDialog
                    open={showDeleteDialog}
                    onOpenChange={(open) => {
                      setShowDeleteDialog(open);
                      if (!open) {
                        // If dialog closed via success (event deleted), the component handles navigation
                        // But we should still close the overlay
                        closeEvent();
                      }
                    }}
                    eventId={selectedEventId!}
                    eventTitle={event.title}
                  />
                </>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
