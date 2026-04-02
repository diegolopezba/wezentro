import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, X, Calendar, MapPin, Users, DollarSign, MessageCircle, Send, Loader2, Check, Clock, Volume2, VolumeX, Heart, UserPlus, MoreVertical, Pencil, Trash2, Lock, Bookmark, Repeat, AtSign, EyeOff, UtensilsCrossed, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEventGuestlist } from "@/hooks/useEvents";
import { GuestlistManagementSheet } from "@/components/events/GuestlistManagementSheet";
import { ShareEventModal } from "@/components/events/ShareEventModal";
import { ShareGuestlistModal } from "@/components/events/ShareGuestlistModal";
import { EditEventSheet } from "@/components/events/EditEventSheet";
import { DeleteEventDialog } from "@/components/events/DeleteEventDialog";
import { InvitationsSentSection } from "@/components/events/InvitationsSentSection";

import { PaymentQRModal } from "@/components/events/PaymentQRModal";
import { InviteFriendsSheet } from "@/components/events/InviteFriendsSheet";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { isVideoUrl } from "@/lib/mediaUtils";
import { trackEventView } from "@/lib/analyticsTracking";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { useEventTags, useRemoveTag } from "@/hooks/useEventTags";
import { RelatedEventsFeed } from "@/components/events/RelatedEventsFeed";
import { MentionText } from "@/components/ui/MentionText";
import { MenuSheet } from "@/components/menu/MenuSheet";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import { useEventDetailState } from "@/hooks/useEventDetailState";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CommentsSheet } from "@/components/events/CommentsSheet";
import { useCommentCount, useLatestComment } from "@/hooks/useEventComments";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromCreate = (location.state as { fromCreate?: boolean })?.fromCreate;
  const openGuestlistOnMount = (location.state as { openGuestlist?: boolean })?.openGuestlist;
  const { user } = useAuth();

  const {
    event, isLoading, error,
    guestlist,
    pendingCount, isSaved, isLiked, likeCount,
    hasReposted, repostCount, saveCount,
    isOnGuestlist, isPending, isApproved,
    isOwner, canInviteToGuestlist,
    hasPaymentQr, isInviteOnlyGuestlist,
    isAuthenticated,
    formattedDate, formattedPrice,
    videoRef, mediaLoaded, aspectRatio, isMuted,
    handleImageLoad, handleVideoMetadata, toggleMute, togglePlayPause,
    joinGuestlistPending, leaveGuestlistPending,
    saveEventPending, likeEventPending, repostPending,
    showManagement, setShowManagement,
    showShareModal, setShowShareModal,
    showGuestlistInviteModal, setShowGuestlistInviteModal,
    showEditSheet, setShowEditSheet,
    showDeleteDialog, setShowDeleteDialog,
    showPaymentModal, setShowPaymentModal,
    showInviteFriendsSheet, setShowInviteFriendsSheet,
    showMenuSheet, setShowMenuSheet,
    showReservationSheet, setShowReservationSheet,
    showComments, setShowComments,
    handleSaveToggle, handleLikeToggle, handleRepostToggle, handleSendToggle,
    handleJoinGuestlist, handlePaymentSubmitted, handleLeaveGuestlist,
  } = useEventDetailState(id, () => navigate(-1));

  const { data: eventTags } = useEventTags(id);
  const removeTag = useRemoveTag();
  const { data: commentCount = 0 } = useCommentCount(id);
  const { data: latestComment = null } = useLatestComment(id);

  // Enable swipe-from-left-edge to go back on mobile
  useSwipeBack();

  // Auto-open guestlist management sheet if navigated from a guestlist_request notification
  useEffect(() => {
    if (openGuestlistOnMount) {
      setShowManagement(true);
    }
  }, [openGuestlistOnMount]);

  // Track event view for analytics
  useEffect(() => {
    if (id && user?.id) {
      trackEventView(id, user.id);
      trackPreferenceSignal(user.id, id, "click");
    }
  }, [id, user?.id]);

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
  const isVideo = isVideoUrl(event.image_url);
  const isPost = !!event.is_post;
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
              <Button variant="ghost" size="sm" onClick={handleLikeToggle} disabled={likeEventPending} className="gap-1.5 px-2">
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                {likeCount > 0 && <span className="text-xs text-muted-foreground">{likeCount}</span>}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRepostToggle} disabled={repostPending} className="gap-1.5 px-2">
                <Repeat className={`w-5 h-5 ${hasReposted ? 'text-green-500' : ''}`} />
                {repostCount > 0 && <span className="text-xs text-muted-foreground">{repostCount}</span>}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSendToggle}>
                <Send className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSaveToggle} disabled={saveEventPending} className="gap-1.5 px-2">
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-primary text-primary' : ''}`} />
                {saveCount > 0 && <span className="text-xs text-muted-foreground">{saveCount}</span>}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowComments(true)} className="gap-1.5 px-2">
                <MessageCircle className="w-5 h-5" />
                {commentCount > 0 && <span className="text-xs text-muted-foreground">{commentCount}</span>}
              </Button>
              {!isPost && event.has_guestlist && canInviteToGuestlist && <Button variant="ghost" size="icon" onClick={() => setShowGuestlistInviteModal(true)}>
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
                    {isOwner &&
                <>
                        <DropdownMenuItem onClick={() => setShowEditSheet(true)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          {event.is_post ? "Editar post" : "Editar evento"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          {event.is_post ? "Eliminar post" : "Eliminar evento"}
                        </DropdownMenuItem>
                      </>
                }
                    {!isOwner && user &&
                <DropdownMenuItem onClick={() => {
                  trackPreferenceSignal(user.id, id!, "not_interested");
                  toast("Se mostrará menos contenido como este", { duration: 2000 });
                  navigate(-1);
                }}>
                        <EyeOff className="w-4 h-4 mr-2" />
                        No me interesa
                      </DropdownMenuItem>
                }
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
          {eventTags && eventTags.length > 0 &&
        <div className="flex items-center gap-2 flex-wrap">
              <AtSign className="w-4 h-4 text-muted-foreground shrink-0" />
              {eventTags.map((tag) =>
          <div
            key={tag.id}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
            onClick={() => navigate(`/user/${tag.tagged_user_id}`)}>

                  <img
              src={tag.tagged_user?.avatar_url || DEFAULT_AVATAR}
              alt={tag.tagged_user?.username || ""}
              className="w-5 h-5 rounded-full object-cover" />

                  <span className="text-xs font-medium text-foreground">
                    @{tag.tagged_user?.username || "user"}
                  </span>
                  {tag.status === "pending" &&
            <span className="text-[10px] text-muted-foreground">(pendiente)</span>
            }
                  {(tag.tagged_user_id === user?.id || isOwner) &&
            <button
              className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                removeTag.mutate(tag.id, {
                  onSuccess: () => toast.success("Etiqueta eliminada"),
                  onError: () => toast.error("Error al eliminar etiqueta")
                });
              }}>

                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
            }
                </div>
          )}
            </div>
        }

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
              <MentionText text={event.description} className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap" />
            </div>}

          {/* Comment preview teaser */}
          <div
            className="flex items-center gap-3 py-3 cursor-pointer group"
            onClick={() => setShowComments(true)}
          >
            {latestComment ? (
              <>
                <img
                  src={latestComment.user?.avatar_url || DEFAULT_AVATAR}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-semibold">@{latestComment.user?.username}</span>
                    {" "}{latestComment.content}
                  </p>
                  {commentCount > 1 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ver los {commentCount} comentarios →
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                💬 Sé el primero en comentar…
              </p>
            )}
          </div>

          {/* Guestlist attendees - Only show for events, not posts */}
          {!isPost && event.has_guestlist && <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-brand text-lg font-semibold text-foreground">
                  Lista de invitados ({guestlist.length})
                </h2>
                {guestlist.length > 0 && <span className="text-sm text-primary cursor-pointer">Ver todos</span>}
              </div>

              {guestlist.length > 0 ? <>
                    {/* Avatars row */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex -space-x-3">
                        {guestlist.slice(0, 5).map((entry: any, i: number) => <img key={entry.id} src={entry.user?.avatar_url || DEFAULT_AVATAR} alt={`Attendee ${i + 1}`} className="w-10 h-10 rounded-full border-2 border-card object-cover cursor-pointer hover:scale-110 transition-transform z-10" onClick={(e) => {
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
                              Joined {format(new Date(entry.joined_at), "d MMM", { locale: es })}
                            </p>
                          </div>
                          <MessageCircle className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/chats/${entry.user_id}`)} />
                        </div>)}
                    </div>
                  </> : <div className="text-center py-6 rounded-2xl bg-secondary/30">
                      <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">{isInviteOnlyGuestlist ? "Solo por invitación del organizador" : "Nadie se ha unido aún. ¡Sé el primero!"}</p>
                    </div>}
            </div>}

          {/* Invitations Sent Section - Owner only, for events with guestlist */}
          {!isPost && isOwner && event.has_guestlist && <InvitationsSentSection eventId={id!} />}

          {/* Related content */}
          <RelatedEventsFeed
            eventId={id!}
            category={event.category}
            creatorId={event.creator_id}
          />

          {/* Sign up prompt for unauthenticated users */}
          {!isAuthenticated && <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
              <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
                Únete a Zentro
              </h3>
              <p className="text-muted-foreground text-sm mb-4">Regístrate para unirte a listas, comprar entradas, guardar eventos y conectar con amigos.

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
      {isOwner && <EditEventSheet event={event} open={showEditSheet} onOpenChange={setShowEditSheet} isPost={!!event.is_post} />}

      {/* Delete Event Dialog - Owner only */}
      {isOwner && <DeleteEventDialog eventId={id!} eventTitle={event.title} open={showDeleteDialog} onOpenChange={setShowDeleteDialog} isPost={isPost} />}
      
      {/* Payment QR Modal */}
      {hasPaymentQr &&
    <PaymentQRModal
      open={showPaymentModal}
      onOpenChange={setShowPaymentModal}
      eventId={id!}
      eventTitle={event.title || "Evento"}
      price={event.price || 0}
      paymentQrUrl={event.payment_qr_url ?? undefined}
      onPaymentConfirmed={handlePaymentSubmitted} />

    }

      {event.has_guestlist &&
    <InviteFriendsSheet
      eventId={id!}
      eventTitle={event.title || "Evento"}
      open={showInviteFriendsSheet}
      onOpenChange={setShowInviteFriendsSheet} />

    }
      {/* Floating CTA Bar */}
      {!isPost && event.has_guestlist &&
    <div className="fixed bottom-0 left-0 right-0 z-30 glass-strong safe-bottom">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-brand text-lg font-semibold text-foreground">
              {formattedPrice}
            </span>
            {isOwner ?
        <Button variant="hero" size="default" onClick={() => setShowManagement(true)}>
                Gestionar
                {pendingCount > 0 &&
          <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                    {pendingCount}
                  </span>
          }
              </Button> :
        isOnGuestlist ?
        isPending ?
        <Button variant="ghost" size="default" disabled>
                  <Clock className="w-4 h-4 mr-1" /> Pendiente
                </Button> :

        <Button variant="ghost" size="default" onClick={handleLeaveGuestlist} disabled={leaveGuestlistPending}>
                  {leaveGuestlistPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Unido</>}
                </Button> :


        <Button variant="hero" size="default" onClick={handleJoinGuestlist} disabled={joinGuestlistPending}>
                {joinGuestlistPending ? <Loader2 className="w-4 h-4 animate-spin" /> : hasPaymentQr || isInviteOnlyGuestlist ? <><DollarSign className="w-4 h-4 mr-1" /> Comprar</> : <><Users className="w-4 h-4 mr-1" /> Unirse</>}
              </Button>
        }
          </div>
        </div>
    }

    {/* Floating Reservation CTA Bar — shown only when no guestlist bar */}
    {(isPost || !event.has_guestlist) && event.show_reservation_button && event.creator_id && (
      <div className="fixed bottom-0 left-0 right-0 z-30 glass-strong safe-bottom">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-brand text-base font-semibold text-foreground">
            {event.creator?.full_name || event.creator?.username || ""}
          </span>
          <Button
            variant="hero"
            size="default"
            onClick={() => setShowReservationSheet(true)}
          >
            <CalendarCheck className="w-4 h-4 mr-1" /> Reservar
          </Button>
        </div>
      </div>
    )}

    {/* Menu Sheet */}
    {event.show_menu_button && event.creator_id && (
      <MenuSheet
        open={showMenuSheet}
        onOpenChange={setShowMenuSheet}
        userId={event.creator_id}
        businessName={event.creator?.username}
      />
    )}

    {/* Reservation Sheet */}
    {event.show_reservation_button && event.creator_id && (
      <ReservationSheet
        open={showReservationSheet}
        onOpenChange={setShowReservationSheet}
        businessId={event.creator_id}
        businessName={event.creator?.username || ""}
      />
    )}

    {/* Comments Sheet */}
    <CommentsSheet
      open={showComments}
      onOpenChange={setShowComments}
      eventId={id!}
      eventCreatorId={event.creator_id}
      commentCount={commentCount}
    />
    </div>;
};
export default EventDetail;