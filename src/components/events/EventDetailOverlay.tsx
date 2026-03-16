import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, MessageCircle, Send, Loader2, Check, Clock, Volume2, VolumeX, Heart, UserPlus, MoreVertical, Pencil, Trash2, Lock, X, Bookmark, Repeat, EyeOff, UtensilsCrossed, CalendarCheck } from "lucide-react";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEvent, useEventGuestlist } from "@/hooks/useEvents";
import { useIsOnGuestlist, useJoinGuestlist, useJoinGuestlistWithPayment, useLeaveGuestlist, useHasActiveSubscription, usePendingGuestlistRequests, usePendingPayments } from "@/hooks/useGuestlist";
import { useIsEventSaved, useSaveEvent, useUnsaveEvent, useSaveCount } from "@/hooks/useSavedEvents";
import { useIsEventLiked, useLikeEvent, useUnlikeEvent, useEventLikes } from "@/hooks/useEventLikes";
import { useHasReposted, useToggleRepost, useRepostCount } from "@/hooks/useReposts";
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
import { PremiumGateModal } from "@/components/events/PremiumGateModal";
import { PaymentQRModal } from "@/components/events/PaymentQRModal";
import { InviteFriendsSheet } from "@/components/events/InviteFriendsSheet";
import { isVideoUrl } from "@/lib/mediaUtils";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { MentionText } from "@/components/ui/MentionText";
import { RelatedEventsFeed } from "@/components/events/RelatedEventsFeed";
import { MenuSheet } from "@/components/menu/MenuSheet";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
export const EventDetailOverlay = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user
  } = useAuth();
  const {
    selectedEventId,
    closeEvent
  } = useSelectedEvent();
  const [showManagement, setShowManagement] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGuestlistInviteModal, setShowGuestlistInviteModal] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInviteFriendsSheet, setShowInviteFriendsSheet] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [showReservationSheet, setShowReservationSheet] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    data: event,
    isLoading,
    error
  } = useEvent(selectedEventId || undefined);
  const {
    data: guestlistStatus
  } = useIsOnGuestlist(selectedEventId || undefined);
  const {
    data: hasSubscription
  } = useHasActiveSubscription();
  const {
    data: pendingRequests = []
  } = usePendingGuestlistRequests(event ? (selectedEventId || undefined) : undefined);
  const {
    data: pendingPayments = []
  } = usePendingPayments(event ? (selectedEventId || undefined) : undefined);
  const {
    data: guestlist = []
  } = useEventGuestlist(selectedEventId || undefined);
  const joinGuestlist = useJoinGuestlist();
  const joinGuestlistWithPayment = useJoinGuestlistWithPayment();
  const leaveGuestlist = useLeaveGuestlist();
  const {
    data: isSaved
  } = useIsEventSaved(selectedEventId || undefined);
  const saveEvent = useSaveEvent();
  const unsaveEvent = useUnsaveEvent();
  const {
    data: isLiked
  } = useIsEventLiked(selectedEventId!);
  const { data: likeCount = 0 } = useEventLikes(event ? selectedEventId! : undefined);
  const likeEvent = useLikeEvent();
  const unlikeEvent = useUnlikeEvent();
  const {
    data: hasReposted
  } = useHasReposted(event ? (selectedEventId || undefined) : undefined);
  const { data: repostCount = 0 } = useRepostCount(event ? (selectedEventId || undefined) : undefined);
  const toggleRepost = useToggleRepost();
  const { data: saveCount = 0 } = useSaveCount(event ? (selectedEventId || undefined) : undefined);
  const isOnGuestlist = !!guestlistStatus;
  const isPending = guestlistStatus?.status === "pending";
  const isApproved = guestlistStatus?.status === "approved";
  const isOwner = user?.id === event?.creator_id;
  const canInviteToGuestlist = isOwner || isApproved;
  const pendingCount = pendingRequests.length + pendingPayments.length;
  
  // Check if event has QR payment enabled
  const hasPaymentQr = !!(event?.payment_qr_url && (event?.price || 0) > 0);
  // When event has both a price and guestlist, tickets take priority — guestlist becomes invite-only
  const isInviteOnlyGuestlist = !!(event?.price && event.price > 0 && event?.has_guestlist);

  // Check for showPayment query param (returned from checkout success)
  useEffect(() => {
    const shouldShowPayment = searchParams.get("showPayment") === "true";
    if (shouldShowPayment && hasPaymentQr && hasSubscription && !isOnGuestlist) {
      setShowPaymentModal(true);
      // Remove the query param after showing the modal
      searchParams.delete("showPayment");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, hasPaymentQr, hasSubscription, isOnGuestlist, setSearchParams]);

  const handleSaveToggle = async () => {
    if (!user) {
      toast.error("Inicia sesión para guardar eventos");
      closeEvent();
      navigate("/auth");
      return;
    }
    try {
      if (isSaved) {
        await unsaveEvent.mutateAsync(selectedEventId!);
        toast.success("Evento eliminado de guardados");
      } else {
        await saveEvent.mutateAsync(selectedEventId!);
        toast.success("¡Evento guardado!");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al guardar evento");
    }
  };
  const handleLikeToggle = async () => {
    if (!user) {
      toast.error("Inicia sesión para dar me gusta");
      closeEvent();
      navigate("/auth");
      return;
    }
    try {
      if (isLiked) {
        await unlikeEvent.mutateAsync(selectedEventId!);
      } else {
        await likeEvent.mutateAsync(selectedEventId!);
      }
    } catch (error: any) {
      toast.error(error.message || "Error al dar me gusta");
    }
  };
  const handleRepostToggle = async () => {
    if (!user) {
      toast.error("Inicia sesión para repostear");
      closeEvent();
      navigate("/auth");
      return;
    }
    try {
      await toggleRepost.mutateAsync({
        eventId: selectedEventId!,
        isReposted: !!hasReposted,
      });
    } catch (error: any) {
      // Error handled in hook
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
  const handleJoinGuestlist = async () => {
    if (!user) {
      toast.error("Inicia sesión para unirte a listas");
      closeEvent();
      navigate("/auth");
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
      await joinGuestlist.mutateAsync(selectedEventId!);
      toast.success("¡Solicitud enviada!");
      setShowInviteFriendsSheet(true);
    } catch (error: any) {
      toast.error(error.message || "Error al unirse a la lista");
    }
  };
  
  const handlePaymentSubmitted = async () => {
    try {
      await joinGuestlistWithPayment.mutateAsync(selectedEventId!);
      setShowInviteFriendsSheet(true);
    } catch (error: any) {
      toast.error(error.message || "Error al registrar pago");
      throw error;
    }
  };
  const handleLeaveGuestlist = async () => {
    try {
      await leaveGuestlist.mutateAsync(selectedEventId!);
      toast.success("Saliste de la lista");
    } catch (error: any) {
      toast.error(error.message || "Error al salir de la lista");
    }
  };
  const formattedDate = event?.start_datetime ? format(new Date(event.start_datetime), "EEE, MMM d • h:mm a") : "";
  const formattedPrice = event?.price ? `Bs. ${event.price}` : "Gratis";
  const isVideo = event ? isVideoUrl(event.image_url) : false;
  return <AnimatePresence>
      {selectedEventId && <motion.div layoutId={`event-card-${selectedEventId}`} className="fixed inset-0 z-50 bg-background overflow-auto" initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} transition={{
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }}>
          {isLoading ? <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div> : error || !event ? <div className="min-h-screen flex flex-col items-center justify-center px-4">
              <h1 className="font-brand text-xl font-bold text-foreground mb-2">Evento no encontrado</h1>
              <p className="text-muted-foreground mb-4">Este evento puede haber sido eliminado.</p>
              <Button onClick={closeEvent}>Volver</Button>
            </div> : <>
              {/* Hero media */}
              <motion.div layoutId={`event-image-${selectedEventId}`} className="relative w-full" style={{
          aspectRatio: aspectRatio ? `${aspectRatio}` : '16/9',
          minHeight: '250px',
          maxHeight: '70vh'
        }}>
                {isVideo ? <video ref={videoRef} src={event.image_url || ""} className={`w-full h-full object-cover transition-opacity duration-500 ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`} onLoadedMetadata={handleVideoMetadata} onClick={togglePlayPause} playsInline autoPlay muted loop /> : <img src={event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"} alt={event.title || "Event"} className={`w-full h-full object-cover transition-opacity duration-500 ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`} onLoad={handleImageLoad} />}
                <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-gradient-to-t from-background to-transparent pointer-events-none" />

                {/* Close button */}
                <div className="absolute top-0 left-0 right-0 safe-top z-20">
                  <div className="flex items-center justify-between px-4 py-4">
                    <Button variant="glass" size="icon" onClick={closeEvent}>
                      <X className="w-5 h-5" />
                    </Button>
                    {isVideo && <button onClick={toggleMute} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
                        {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                      </button>}
                  </div>
                </div>
              </motion.div>

              {/* Content */}
              <motion.div className="relative -mt-16 px-4 pb-28" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.15
        }}>
                <div className="space-y-6">
                  {/* Category & title */}
                  <div>
                    {event.category && <span className="inline-block px-3 py-1 rounded-full text-xs gradient-primary mb-3 text-primary font-normal">
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
                      {event.has_guestlist && canInviteToGuestlist && <Button variant="ghost" size="icon" onClick={() => setShowGuestlistInviteModal(true)}>
                          <UserPlus className="w-5 h-5" />
                        </Button>}
                    </div>

                    {/* Right: Edit dropdown */}
                    <div className="flex items-center gap-1">
                      {event.show_menu_button && event.creator_id && (
                        <Button variant="ghost" size="sm" onClick={() => setShowMenuSheet(true)} className="gap-1.5 px-2">
                          <UtensilsCrossed className="w-5 h-5" />
                          <span className="text-xs">Menú</span>
                        </Button>
                      )}
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
                                trackPreferenceSignal(user.id, selectedEventId!, "not_interested");
                                toast("Se mostrará menos contenido como este", { duration: 2000 });
                                closeEvent();
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

                  {/* Details - Only show for events, not posts */}
                  {!event.is_post && <>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm text-foreground">{formattedDate}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm text-foreground">{event.location_name || "Ubicación por definir"}</p>
                      </div>
                    </>}

                  {/* Description */}
                  {event.description && <div className="space-y-2">
                      <h2 className="font-brand text-lg font-semibold text-foreground">Acerca de</h2>
                      <MentionText text={event.description} className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap" />
                    </div>}

                  {/* Guestlist attendees */}
                  {event.has_guestlist && <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-brand text-lg font-semibold text-foreground">
                          Lista de invitados ({guestlist.length})
                        </h2>
                        {guestlist.length > 0 && hasSubscription && <span className="text-sm text-primary cursor-pointer">Ver todos</span>}
                      </div>

                      {guestlist.length > 0 ? hasSubscription ? <>
                            <div className="flex items-center gap-2 mb-4">
                              <div className="flex -space-x-3">
                              {guestlist.slice(0, 5).map((entry: any, i: number) => <img key={entry.id} src={entry.user?.avatar_url || DEFAULT_AVATAR} alt={`Attendee ${i + 1}`} className="w-10 h-10 rounded-full border-2 border-card object-cover cursor-pointer hover:scale-110 transition-transform z-10" onClick={() => navigate(`/user/${entry.user_id}`)} />)}
                              </div>
                              {guestlist.length > 5 && <span className="text-sm text-muted-foreground">
                                  +{guestlist.length - 5} más
                                </span>}
                            </div>

                            <div className="space-y-3">
                              {guestlist.slice(0, 3).map((entry: any) => <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                                  <img src={entry.user?.avatar_url || DEFAULT_AVATAR} alt={entry.user?.username || "User"} className="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate(`/user/${entry.user_id}`)} />
                                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/user/${entry.user_id}`)}>
                                    <p className="font-medium text-foreground text-sm">
                                      @{entry.user?.username || "user"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Se unió el {format(new Date(entry.joined_at), "d MMM")}
                                    </p>
                                  </div>
                                  <MessageCircle className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/chats/${entry.user_id}`)} />
                                </div>)}
                            </div>
                          </> : <>
                            <div className="flex items-center gap-2 mb-4">
                              <div className="flex -space-x-3">
                                {guestlist.slice(0, 5).map((entry: any, i: number) => <img key={entry.id} src={entry.user?.avatar_url || DEFAULT_AVATAR} alt={`Attendee ${i + 1}`} className="w-10 h-10 rounded-full border-2 border-card object-cover blur-[3px]" />)}
                              </div>
                              {guestlist.length > 5 && <span className="text-sm text-muted-foreground">
                                  +{guestlist.length - 5} más
                                </span>}
                            </div>

                            <div className="p-4 rounded-2xl bg-secondary/50 border border-border/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Lock className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-foreground text-sm">Solo para miembros</span>
                              </div>
                              <p className="text-muted-foreground text-sm mb-4">
                                Hazte miembro de Zentro para ver quién está en la lista
                              </p>
                              <Button variant="hero" size="sm" className="w-full" onClick={() => {
                    closeEvent();
                    navigate("/subscription");
                  }}>
                                Desbloquear Premium
                              </Button>
                            </div>
                          </> : <div className="text-center py-6 rounded-2xl bg-secondary/30">
                          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">
                            {isInviteOnlyGuestlist ? "Solo por invitación del organizador" : "Nadie se ha unido aún. ¡Sé el primero!"}
                          </p>
                        </div>}
                    </div>}

                  {/* Invitations Sent Section - Owner only */}
                  {isOwner && event.has_guestlist && <InvitationsSentSection eventId={selectedEventId!} />}

                  {/* Related content */}
                  <RelatedEventsFeed
                    eventId={selectedEventId!}
                    category={event.category}
                    creatorId={event.creator_id}
                  />
                </div>
              </motion.div>

              {/* Modals */}
              {event && <>
                  <GuestlistManagementSheet eventId={selectedEventId!} open={showManagement} onOpenChange={setShowManagement} />
                  <ShareEventModal open={showShareModal} onOpenChange={setShowShareModal} eventId={selectedEventId!} />
                  <ShareGuestlistModal open={showGuestlistInviteModal} onOpenChange={setShowGuestlistInviteModal} eventId={selectedEventId!} />
                  <EditEventSheet open={showEditSheet} onOpenChange={setShowEditSheet} event={event} />
                  <DeleteEventDialog open={showDeleteDialog} onOpenChange={open => {
            setShowDeleteDialog(open);
            if (!open) {
              // If dialog closed via success (event deleted), the component handles navigation
              // But we should still close the overlay
              closeEvent();
            }
          }} eventId={selectedEventId!} eventTitle={event.title} />
                  <PremiumGateModal 
                    open={showPremiumGate} 
                    onOpenChange={setShowPremiumGate}
                    eventId={selectedEventId || undefined}
                  />
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
                      eventId={selectedEventId!}
                      eventTitle={event.title || "Evento"}
                      open={showInviteFriendsSheet}
                      onOpenChange={setShowInviteFriendsSheet}
                    />
                  )}
                  {/* Floating CTA Bar */}
                  {event.has_guestlist && (
                    <div className="fixed bottom-0 left-0 right-0 z-[60] glass-strong safe-bottom">
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
                            {(joinGuestlist.isPending || joinGuestlistWithPayment.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : (hasPaymentQr || isInviteOnlyGuestlist) ? <><DollarSign className="w-4 h-4 mr-1" /> Comprar</> : <><Users className="w-4 h-4 mr-1" /> Unirse</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Floating Reservation CTA Bar — shown only when no guestlist bar */}
                  {!event.has_guestlist && event.show_reservation_button && event.creator_id && (
                    <div className="fixed bottom-0 left-0 right-0 z-[60] glass-strong safe-bottom">
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="font-brand text-base font-semibold text-foreground">
                          {event.creator?.full_name || event.creator?.username || ""}
                        </span>
                        <Button
                          size="default"
                          className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:from-orange-400 hover:to-amber-400 shadow-lg rounded-full"
                          onClick={() => setShowReservationSheet(true)}
                        >
                          <CalendarCheck className="w-4 h-4 mr-1" /> Reservar
                        </Button>
                      </div>
                    </div>
                  )}
                </>}
            </>}
        </motion.div>}

        {/* Menu Sheet */}
        {event && event.show_menu_button && event.creator_id && (
          <MenuSheet
            open={showMenuSheet}
            onOpenChange={setShowMenuSheet}
            userId={event.creator_id}
            businessName={event.creator?.username}
          />
        )}

        {/* Reservation Sheet */}
        {event && event.show_reservation_button && event.creator_id && (
          <ReservationSheet
            open={showReservationSheet}
            onOpenChange={setShowReservationSheet}
            businessId={event.creator_id}
            businessName={event.creator?.username || ""}
          />
        )}
    </AnimatePresence>;
};