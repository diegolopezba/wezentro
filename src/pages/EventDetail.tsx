import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, X, Calendar, MapPin, Users, DollarSign, MessageCircle, Send, Loader2, Check, Clock, Volume2, VolumeX, Heart, UserPlus, MoreVertical, Pencil, Trash2, Lock, Bookmark, Repeat, AtSign, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEvent, useEventGuestlist } from "@/hooks/useEvents";
import { useIsOnGuestlist, useJoinGuestlist, useJoinGuestlistWithPayment, useLeaveGuestlist, useHasActiveSubscription, usePendingGuestlistRequests, usePendingPayments } from "@/hooks/useGuestlist";
import { useIsEventSaved, useSaveEvent, useUnsaveEvent, useSaveCount } from "@/hooks/useSavedEvents";
import { useIsEventLiked, useLikeEvent, useUnlikeEvent, useEventLikes } from "@/hooks/useEventLikes";
import { useHasReposted, useToggleRepost, useRepostCount } from "@/hooks/useReposts";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { format } from "date-fns";
import { toast } from "sonner";
import { GuestlistManagementSheet } from "@/components/events/GuestlistManagementSheet";
import { ShareEventModal } from "@/components/events/ShareEventModal";
import { ShareGuestlistModal } from "@/components/events/ShareGuestlistModal";
import { EditEventSheet } from "@/components/events/EditEventSheet";
import { DeleteEventDialog } from "@/components/events/DeleteEventDialog";
import { InvitationsSentSection } from "@/components/events/InvitationsSentSection";
import { PremiumGateModal } from "@/components/events/PremiumGateModal";
import { PaymentQRModal } from "@/components/events/PaymentQRModal";
import { InviteFriendsSheet } from "@/components/events/InviteFriendsSheet";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { isVideoUrl } from "@/lib/mediaUtils";
import { trackEventView } from "@/lib/analyticsTracking";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { useEventTags, useRemoveTag } from "@/hooks/useEventTags";

const EventDetail = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromCreate = (location.state as { fromCreate?: boolean })?.fromCreate;
  const {
    user
  } = useAuth();
  const { promptAuth } = useAuthPrompt();
  const isGuest = !user;
  const [showManagement, setShowManagement] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGuestlistInviteModal, setShowGuestlistInviteModal] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInviteFriendsSheet, setShowInviteFriendsSheet] = useState(false);
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
      // Track click signal for preference learning
      trackPreferenceSignal(user.id, id, "click");
    }
  }, [id, user?.id]);
  const {
    data: event,
    isLoading,
    error
  } = useEvent(id);
  const { data: eventTags } = useEventTags(id);
  const removeTag = useRemoveTag();
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
    data: pendingPayments = []
  } = usePendingPayments(id);
  const {
    data: isSaved
  } = useIsEventSaved(id);
  const saveEvent = useSaveEvent();
  const unsaveEvent = useUnsaveEvent();
  const {
    data: isLiked
  } = useIsEventLiked(id!);
  const { data: likeCount = 0 } = useEventLikes(id!);
  const likeEvent = useLikeEvent();
  const unlikeEvent = useUnlikeEvent();
  const {
    data: hasReposted
  } = useHasReposted(id);
  const { data: repostCount = 0 } = useRepostCount(id);
  const toggleRepost = useToggleRepost();
  const { data: saveCount = 0 } = useSaveCount(id);
  const joinGuestlist = useJoinGuestlist();
  const joinGuestlistWithPayment = useJoinGuestlistWithPayment();
  const leaveGuestlist = useLeaveGuestlist();
  const isOnGuestlist = !!guestlistStatus;
  const isPending = guestlistStatus?.status === "pending";
  const isApproved = guestlistStatus?.status === "approved";
  const isOwner = user && user.id === event?.creator_id;
  const canInviteToGuestlist = user && (isOwner || isApproved);
  // Count pending requests AND pending payments for the badge
  const pendingCount = pendingRequests.length + pendingPayments.length;
  const isAuthenticated = !!user;
  
  // Check if event has QR payment enabled
  const hasPaymentQr = !!(event?.payment_qr_url && (event?.price || 0) > 0);
  const handleSaveToggle = async () => {
    if (isGuest) {
      promptAuth({ action: "guardar este evento" });
      return;
    }
    try {
      if (isSaved) {
        await unsaveEvent.mutateAsync(id!);
        toast.success("Evento eliminado de guardados");
      } else {
        await saveEvent.mutateAsync(id!);
        toast.success("¡Evento guardado!");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al guardar evento");
    }
  };
  const handleLikeToggle = async () => {
    if (isGuest) {
      promptAuth({ action: "dar like a este evento" });
      return;
    }
    try {
      if (isLiked) {
        await unlikeEvent.mutateAsync(id!);
      } else {
        await likeEvent.mutateAsync(id!);
      }
    } catch (error: any) {
      toast.error(error.message || "Error al dar like");
    }
  };
  const handleRepostToggle = async () => {
    if (isGuest) {
      promptAuth({ action: "repostear este evento" });
      return;
    }
    try {
      await toggleRepost.mutateAsync({
        eventId: id!,
        isReposted: !!hasReposted,
      });
    } catch (error: any) {
      // Error handled in hook
    }
  };
  const handleJoinGuestlist = async () => {
    if (isGuest) {
      promptAuth({ action: "unirte a esta lista" });
      return;
    }
    
    // Check premium subscription first
    if (!hasSubscription) {
      setShowPremiumGate(true);
      return;
    }
    
    // Check if this is a paid event with QR payment
    if (hasPaymentQr) {
      setShowPaymentModal(true);
      return;
    }
    
    // Normal free event join
    try {
      await joinGuestlist.mutateAsync(id!);
      toast.success("¡Solicitud enviada!");
      setShowInviteFriendsSheet(true);
    } catch (error: any) {
      toast.error(error.message || "Error al unirse a la lista");
    }
  };
  
  const handlePaymentSubmitted = async () => {
    try {
      await joinGuestlistWithPayment.mutateAsync(id!);
      setShowInviteFriendsSheet(true);
    } catch (error: any) {
      toast.error(error.message || "Error al registrar pago");
      throw error;
    }
  };
  const handleLeaveGuestlist = async () => {
    try {
      await leaveGuestlist.mutateAsync(id!);
      toast.success("Has salido de la lista");
    } catch (error: any) {
      toast.error(error.message || "Error al salir de la lista");
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
        <h1 className="font-brand text-xl font-bold text-foreground mb-2">Evento no encontrado</h1>
        <p className="text-muted-foreground mb-4">Este evento puede haber sido eliminado o no existe.</p>
        <Button onClick={() => navigate("/")}>Ir al Inicio</Button>
      </div>;
  }
  const formattedDate = event.start_datetime ? format(new Date(event.start_datetime), "EEE, MMM d • h:mm a") : null;
  const formattedPrice = event.price ? `$${event.price}` : "Gratis";
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
        <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-gradient-to-t from-background to-transparent pointer-events-none" />

        {/* Back button */}
        <div className="absolute top-0 left-0 right-0 safe-top z-20">
          <div className="flex items-center justify-between px-4 py-4">
            <Button variant="glass" size="icon" onClick={() => {
            if (fromCreate) {
              navigate("/", { replace: true });
            } else if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }}>
              {fromCreate ? <X className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </Button>
            {isVideo && <button onClick={toggleMute} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
              </button>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-16 px-4 pb-28">
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
            {/* Left: Like, Repost, Send, Save, Invite */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleLikeToggle} disabled={likeEvent.isPending || unlikeEvent.isPending} className="gap-1.5 px-2">
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                {likeCount > 0 && <span className="text-xs text-muted-foreground">{likeCount}</span>}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRepostToggle} disabled={toggleRepost.isPending} className="gap-1.5 px-2">
                <Repeat className={`w-5 h-5 ${hasReposted ? 'text-green-500' : ''}`} />
                {repostCount > 0 && <span className="text-xs text-muted-foreground">{repostCount}</span>}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowShareModal(true)}>
                <Send className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSaveToggle} disabled={saveEvent.isPending || unsaveEvent.isPending} className="gap-1.5 px-2">
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-primary text-primary' : ''}`} />
                {saveCount > 0 && <span className="text-xs text-muted-foreground">{saveCount}</span>}
              </Button>
              {!isPost && event.has_guestlist && canInviteToGuestlist && <Button variant="ghost" size="icon" onClick={() => setShowGuestlistInviteModal(true)}>
                  <UserPlus className="w-5 h-5" />
                </Button>}
            </div>

            {/* Right: Edit dropdown */}
            <div className="flex items-center gap-1">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner && (
                      <>
                        <DropdownMenuItem onClick={() => setShowEditSheet(true)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar evento
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar evento
                        </DropdownMenuItem>
                      </>
                    )}
                    {!isOwner && user && (
                      <DropdownMenuItem onClick={() => {
                        trackPreferenceSignal(user.id, id!, "not_interested");
                        toast("Se mostrará menos contenido como este", { duration: 2000 });
                        navigate(-1);
                      }}>
                        <EyeOff className="w-4 h-4 mr-2" />
                        No me interesa
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>

          {/* Host */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
          if (event.creator_id) {
            navigate(`/user/${event.creator_id}`);
          }
        }}>
            <img src={event.creator?.avatar_url || DEFAULT_AVATAR} alt="Host" className="w-12 h-12 rounded-full object-cover hover:scale-105 transition-transform" />
            <p className="font-semibold text-foreground hover:text-primary transition-colors">
              @{event.creator?.username || "unknown"}
            </p>
          </div>

          {/* Tagged users */}
          {eventTags && eventTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <AtSign className="w-4 h-4 text-muted-foreground shrink-0" />
              {eventTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => navigate(`/user/${tag.tagged_user_id}`)}
                >
                  <img
                    src={tag.tagged_user?.avatar_url || DEFAULT_AVATAR}
                    alt={tag.tagged_user?.username || ""}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="text-xs font-medium text-foreground">
                    @{tag.tagged_user?.username || "user"}
                  </span>
                  {tag.status === "pending" && (
                    <span className="text-[10px] text-muted-foreground">(pendiente)</span>
                  )}
                  {(tag.tagged_user_id === user?.id || isOwner) && (
                    <button
                      className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTag.mutate(tag.id, {
                          onSuccess: () => toast.success("Etiqueta eliminada"),
                          onError: () => toast.error("Error al eliminar etiqueta"),
                        });
                      }}
                    >
                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Details - Only show for events, not posts */}
          {!isPost && <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-foreground">{formattedDate}</p>
              </div>}

          {/* Location - Only show if location exists */}
          {event.location_name && <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-foreground">{event.location_name}</p>
              </div>}

          {/* Description */}
          {event.description && <div className="space-y-2">
              <h2 className="font-brand text-lg font-semibold text-foreground">Acerca de</h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>}

          {/* Guestlist attendees - Only show for events, not posts */}
          {!isPost && event.has_guestlist && <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-brand text-lg font-semibold text-foreground">
                  Lista de invitados ({guestlist.length})
                </h2>
                {guestlist.length > 0 && hasSubscription && <span className="text-sm text-primary cursor-pointer">Ver todos</span>}
              </div>

              {guestlist.length > 0 ? hasSubscription ? <>
                    {/* Avatars row - Premium users see real avatars */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex -space-x-3">
                        {guestlist.slice(0, 5).map((entry: any, i: number) => <img key={entry.id} src={entry.user?.avatar_url || DEFAULT_AVATAR} alt={`Attendee ${i + 1}`} className="w-10 h-10 rounded-full border-2 border-card object-cover cursor-pointer hover:scale-110 transition-transform z-10" onClick={e => {
                  e.stopPropagation();
                  navigate(`/user/${entry.user_id}`);
                }} />)}
                      </div>
                      {guestlist.length > 5 && <span className="text-sm text-muted-foreground">
                          +{guestlist.length - 5} más
                        </span>}
                    </div>

                    {/* Attendee list */}
                    <div className="space-y-3">
                      {guestlist.slice(0, 3).map((entry: any) => <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                          <img src={entry.user?.avatar_url || DEFAULT_AVATAR} alt={entry.user?.username || "User"} className="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate(`/user/${entry.user_id}`)} />
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
                        {guestlist.slice(0, 5).map((entry: any, i: number) => <img key={entry.id} src={entry.user?.avatar_url || DEFAULT_AVATAR} alt={`Attendee ${i + 1}`} className="w-10 h-10 rounded-full border-2 border-card object-cover blur-[3px]" />)}
                      </div>
                      {guestlist.length > 5 && <span className="text-sm text-muted-foreground">
                          +{guestlist.length - 5} more
                        </span>}
                    </div>

                    {/* Upsell card for non-premium users */}
                    <div className="p-4 rounded-2xl bg-secondary/50 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground text-sm">Solo para Miembros</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">
                        Hazte miembro de Zentro para ver quién está en la lista
                      </p>
                      <Button variant="hero" size="sm" className="w-full" onClick={() => navigate("/subscription")}>
                        Hacerse Miembro
                      </Button>
                    </div>
                  </> : <p className="text-muted-foreground text-sm">Nadie se ha unido aún. ¡Sé el primero!</p>}
            </div>}

          {/* Invitations Sent Section - Owner only, for events with guestlist */}
          {!isPost && isOwner && event.has_guestlist && <InvitationsSentSection eventId={id!} />}

          {/* Sign up prompt for unauthenticated users */}
          {!isAuthenticated && <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
              <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
                Únete a Zentro
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Regístrate para unirte a listas, guardar eventos y conectar con otros asistentes.
              </p>
              <Button variant="hero" className="w-full" onClick={() => navigate("/auth")}>
                Registrarse / Iniciar Sesión
              </Button>
            </div>}
        </motion.div>
      </div>


      {/* Guestlist Management Sheet */}
      {isOwner && event.has_guestlist && <GuestlistManagementSheet eventId={id!} eventHasPaymentQr={hasPaymentQr} open={showManagement} onOpenChange={setShowManagement} />}

      {/* Share Event Modal */}
      <ShareEventModal eventId={id!} open={showShareModal} onOpenChange={setShowShareModal} />

      {/* Share Guestlist Invite Modal */}
      {event.has_guestlist && canInviteToGuestlist && <ShareGuestlistModal eventId={id!} open={showGuestlistInviteModal} onOpenChange={setShowGuestlistInviteModal} />}

      {/* Edit Event Sheet - Owner only */}
      {isOwner && <EditEventSheet event={event} open={showEditSheet} onOpenChange={setShowEditSheet} />}

      {/* Delete Event Dialog - Owner only */}
      {isOwner && <DeleteEventDialog eventId={id!} eventTitle={event.title} open={showDeleteDialog} onOpenChange={setShowDeleteDialog} />}
      
      {/* Premium Gate Modal */}
      <PremiumGateModal open={showPremiumGate} onOpenChange={setShowPremiumGate} />
      
      {/* Payment QR Modal */}
      {hasPaymentQr && (
        <PaymentQRModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          eventTitle={event.title || "Evento"}
          price={event.price || 0}
          paymentQrUrl={event.payment_qr_url!}
          onPaymentSubmitted={handlePaymentSubmitted}
          isSubmitting={joinGuestlistWithPayment.isPending}
        />
      )}

      {event.has_guestlist && (
        <InviteFriendsSheet
          eventId={id!}
          eventTitle={event.title || "Evento"}
          open={showInviteFriendsSheet}
          onOpenChange={setShowInviteFriendsSheet}
        />
      )}
      {/* Floating CTA Bar */}
      {!isPost && event.has_guestlist && (
        <div className="fixed bottom-0 left-0 right-0 z-30 glass-strong safe-bottom">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-brand text-lg font-semibold text-foreground">
              {formattedPrice}
            </span>
            {isOwner ? (
              <Button variant="hero" size="default" onClick={() => setShowManagement(true)}>
                Gestionar
                {pendingCount > 0 && (
                  <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                    {pendingCount}
                  </span>
                )}
              </Button>
            ) : isOnGuestlist ? (
              isPending ? (
                <Button variant="ghost" size="default" disabled>
                  <Clock className="w-4 h-4 mr-1" /> Pendiente
                </Button>
              ) : (
                <Button variant="ghost" size="default" onClick={handleLeaveGuestlist} disabled={leaveGuestlist.isPending}>
                  {leaveGuestlist.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Unido</>}
                </Button>
              )
            ) : (
              <Button variant="hero" size="default" onClick={handleJoinGuestlist} disabled={joinGuestlist.isPending || joinGuestlistWithPayment.isPending}>
                {(joinGuestlist.isPending || joinGuestlistWithPayment.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : hasPaymentQr ? <><DollarSign className="w-4 h-4 mr-1" /> Comprar</> : <><Users className="w-4 h-4 mr-1" /> Unirse</>}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>;
};
export default EventDetail;