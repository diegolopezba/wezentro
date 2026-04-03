import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, MessageCircle, Send, Loader2, Check, Clock, Volume2, VolumeX, Heart, UserPlus, MoreVertical, Pencil, Trash2, Lock, X, Bookmark, Repeat, EyeOff, UtensilsCrossed, CalendarCheck } from "lucide-react";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GuestlistManagementSheet } from "@/components/events/GuestlistManagementSheet";
import { ShareEventModal } from "@/components/events/ShareEventModal";
import { ShareGuestlistModal } from "@/components/events/ShareGuestlistModal";
import { EditEventSheet } from "@/components/events/EditEventSheet";
import { DeleteEventDialog } from "@/components/events/DeleteEventDialog";
import { InvitationsSentSection } from "@/components/events/InvitationsSentSection";

import { PaymentQRModal } from "@/components/events/PaymentQRModal";
import { InviteFriendsSheet } from "@/components/events/InviteFriendsSheet";
import { isVideoUrl } from "@/lib/mediaUtils";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { MentionText } from "@/components/ui/MentionText";
import { RelatedEventsFeed } from "@/components/events/RelatedEventsFeed";
import { MenuSheet } from "@/components/menu/MenuSheet";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedEvent } from "@/contexts/SelectedEventContext";
import { useEventDetailState } from "@/hooks/useEventDetailState";
import { toast } from "sonner";
import { CommentsSheet } from "@/components/events/CommentsSheet";
import { useCommentCount, useLatestComment } from "@/hooks/useEventComments";

export const EventDetailOverlay = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { selectedEventId, closeEvent } = useSelectedEvent();

  const {
    event, isLoading, error,
    guestlist,
    pendingCount, isSaved, isLiked, likeCount,
    hasReposted, repostCount, saveCount,
    attendeesGoing,
    isOnGuestlist, isPending, isApproved,
    isOwner, canInviteToGuestlist,
    hasPaidTickets, hasPaymentQr, isInviteOnlyGuestlist,
    formattedDate, formattedPrice,
    videoRef, mediaLoaded, aspectRatio, isMuted,
    handleImageLoad, handleVideoMetadata, toggleMute, togglePlayPause,
    buyTicketPending, leaveGuestlistPending,
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
    handleBuyTicket, handlePaymentSubmitted, handleLeaveGuestlist,
  } = useEventDetailState(selectedEventId || undefined, closeEvent);

  const { data: commentCount = 0 } = useCommentCount(selectedEventId || undefined);
  const { data: latestComment = null } = useLatestComment(selectedEventId || undefined);

  const isVideo = isVideoUrl(event?.image_url);
  const isPost = !!(event?.is_post);

  // Check for showPayment query param (returned from checkout success)
  useEffect(() => {
    const shouldShowPayment = searchParams.get("showPayment") === "true";
    if (shouldShowPayment && hasPaymentQr && !isOnGuestlist) {
      setShowPaymentModal(true);
      searchParams.delete("showPayment");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, hasPaymentQr, isOnGuestlist, setSearchParams]);

  return (
    <AnimatePresence>
      {selectedEventId && (
        <motion.div
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
              <h1 className="font-brand text-xl font-bold text-foreground mb-2">Evento no encontrado</h1>
              <p className="text-muted-foreground mb-4">Este evento puede haber sido eliminado.</p>
              <Button onClick={closeEvent}>Volver</Button>
            </div>
          ) : (
            <>
              {/* Hero media */}
              <div
                className="relative w-full"
                style={{
                  aspectRatio: aspectRatio ? `${aspectRatio}` : '16/9',
                  minHeight: '250px',
                  maxHeight: '70vh'
                }}
              >
                {isVideo ? (
                  <video
                    ref={videoRef}
                    src={event.image_url || ""}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`}
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
                <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-gradient-to-t from-background to-transparent pointer-events-none" />

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
              </div>

              {/* Content */}
              <motion.div
                className="relative -mt-16 px-4 pb-28"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="space-y-6">
                  {/* Category & title */}
                  <div>
                    {event.category && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs gradient-primary mb-3 text-primary font-medium">
                        {event.category.replace("_", " ")}
                      </span>
                    )}
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
                                {event.is_post ? "Editar post" : "Editar evento"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                {event.is_post ? "Eliminar post" : "Eliminar evento"}
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
                  {!isPost && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-foreground">{formattedDate}</p>
                    </div>
                  )}

                  {event.location_name && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-foreground">{event.location_name}</p>
                    </div>
                  )}

                  {/* Description */}
                  {event.description && (
                    <div className="space-y-2">
                      <h2 className="font-brand text-lg font-semibold text-foreground">Acerca de</h2>
                      <MentionText text={event.description} className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap" />
                    </div>
                  )}

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

                  {/* People Going section */}
                  {!isPost && attendeesGoing.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-primary" />
                        <h2 className="font-brand text-lg font-semibold text-foreground">
                          {attendeesGoing.some(a => a.isFollowed)
                            ? `Personas que sigues que van (${attendeesGoing.filter(a => a.isFollowed).length})`
                            : `Personas que van (${attendeesGoing.length})`}
                        </h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-3">
                          {attendeesGoing.slice(0, 5).map((attendee, i) => (
                            <img
                              key={attendee.user_id}
                              src={attendee.avatar_url || DEFAULT_AVATAR}
                              alt={attendee.username}
                              className={`w-10 h-10 rounded-full border-2 object-cover cursor-pointer hover:scale-110 transition-transform z-10 ${
                                attendee.isFollowed ? "border-primary" : "border-card"
                              }`}
                              style={{ zIndex: 5 - i }}
                              onClick={() => navigate(`/user/${attendee.user_id}`)}
                            />
                          ))}
                        </div>
                        {attendeesGoing.length > 5 && (
                          <span className="text-sm text-muted-foreground">+{attendeesGoing.length - 5} más</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {attendeesGoing.slice(0, 2).map(a => `@${a.username}`).join(", ")}
                        {attendeesGoing.length > 2 && ` y ${attendeesGoing.length - 2} más van`}
                        {attendeesGoing.length <= 2 && attendeesGoing.length > 0 && " van"}
                      </p>
                    </div>
                  )}

                  {/* Invitations Sent Section - Owner only */}
                  {!isPost && isOwner && event.has_guestlist && <InvitationsSentSection eventId={selectedEventId!} />}

                  {/* Related content */}
                  <RelatedEventsFeed
                    eventId={selectedEventId!}
                    category={event.category}
                    creatorId={event.creator_id}
                  />
                </div>
              </motion.div>

              {/* Modals */}
              {event && (
                <>
                  <GuestlistManagementSheet eventId={selectedEventId!} open={showManagement} onOpenChange={setShowManagement} />
                  <ShareEventModal open={showShareModal} onOpenChange={setShowShareModal} eventId={selectedEventId!} />
                  <ShareGuestlistModal open={showGuestlistInviteModal} onOpenChange={setShowGuestlistInviteModal} eventId={selectedEventId!} />
                  <EditEventSheet open={showEditSheet} onOpenChange={setShowEditSheet} event={event} isPost={!!event.is_post} />
                  <DeleteEventDialog
                    open={showDeleteDialog}
                    onOpenChange={open => {
                      setShowDeleteDialog(open);
                      if (!open) closeEvent();
                    }}
                    eventId={selectedEventId!}
                    eventTitle={event.title}
                    isPost={isPost}
                  />
                  {hasPaymentQr && (
                    <PaymentQRModal
                      open={showPaymentModal}
                      onOpenChange={setShowPaymentModal}
                      eventId={selectedEventId!}
                      eventTitle={event.title || "Evento"}
                      price={event.price || 0}
                      paymentQrUrl={event.payment_qr_url ?? undefined}
                      onPaymentConfirmed={handlePaymentSubmitted}
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
                  {/* Floating CTA Bar — always show for events */}
                  {!isPost && (
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
                            <Button variant="ghost" size="default" onClick={handleLeaveGuestlist} disabled={leaveGuestlistPending}>
                              {leaveGuestlistPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Unido</>}
                            </Button>
                          )
                        ) : (
                          <Button variant="hero" size="default" onClick={handleBuyTicket} disabled={buyTicketPending}>
                            {buyTicketPending ? <Loader2 className="w-4 h-4 animate-spin" /> : hasPaidTickets ? <><DollarSign className="w-4 h-4 mr-1" /> Comprar</> : <>Free</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Floating Reservation CTA Bar — shown only for posts */}
                  {isPost && event.show_reservation_button && event.creator_id && (
                    <div className="fixed bottom-0 left-0 right-0 z-[60] glass-strong safe-bottom">
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
                </>
              )}
            </>
          )}
        </motion.div>
      )}

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

      {/* Comments Sheet */}
      {selectedEventId && (
        <CommentsSheet
          open={showComments}
          onOpenChange={setShowComments}
          eventId={selectedEventId}
          eventCreatorId={event?.creator_id}
          commentCount={commentCount}
        />
      )}
    </AnimatePresence>
  );
};
