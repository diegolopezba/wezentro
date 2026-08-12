import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ModalErrorBoundary } from "@/components/events/ModalErrorBoundary";
import {
  Calendar, MapPin, Users, DollarSign, MessageCircle, Send, Loader2, Check, Clock,
  Volume2, VolumeX, Heart, MoreVertical, Pencil, Trash2, X, Bookmark, Repeat,
  EyeOff, UtensilsCrossed, CalendarCheck, Flag, Lock,
} from "lucide-react";
import { ReportSheet } from "@/components/moderation/ReportSheet";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { trackEventImpression } from "@/lib/analyticsTracking";
import { Button } from "@/components/ui/button";
import { GuestlistManagementSheet } from "@/components/events/GuestlistManagementSheet";
import { ShareEventModal } from "@/components/events/ShareEventModal";
import { LocationSheet } from "@/components/events/LocationSheet";
import { EventActionsSheet } from "@/components/events/EventActionsSheet";

import { InvitationsSentSection } from "@/components/events/InvitationsSentSection";
import { PaymentQRModal } from "@/components/events/PaymentQRModal";
import { TicketTierPicker } from "@/components/events/TicketTierPicker";
import { AreaPickerSheet } from "@/components/venue/AreaPickerSheet";
import { InviteFriendsSheet } from "@/components/events/InviteFriendsSheet";
import { isVideoUrl } from "@/lib/mediaUtils";
import { MediaCarousel } from "@/components/events/MediaCarousel";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { MentionText } from "@/components/ui/MentionText";
import { RelatedEventsFeed } from "@/components/events/RelatedEventsFeed";
import { MenuSheet } from "@/components/menu/MenuSheet";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useEventDetailState } from "@/hooks/useEventDetailState";
import { toast } from "sonner";
import { CommentsSheet } from "@/components/events/CommentsSheet";
import { useCommentCount, useLatestComment } from "@/hooks/useEventComments";
import { EventDetailSkeleton } from "@/components/skeletons/EventDetailSkeleton";
import { AttachedBusinessCtas } from "@/components/events/AttachedBusinessCtas";

/**
 * Pinterest-style modal wrapper around the event detail UI.
 *
 * Mounted by App.tsx's modal <Routes> tree only when the user navigated
 * from the feed (state.backgroundLocation present). The feed remains
 * mounted underneath, which eliminates the previous overlay/page route
 * collision and the lag when tapping in-overlay links.
 *
 * Closing simply does navigate(-1) — the router pops back to the
 * background location, the modal unmounts, the feed is right where
 * it was. Browser/Android back button works for free.
 */
const EventDetailModalInner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pinterest pattern: when navigating from one event to another inside the
  // modal (same component, different :id), reset scroll synchronously before
  // paint so the new event renders at the top instead of preserving the
  // previous scroll position.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [id]);

  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [showActions, setShowActions] = useState(false);


  const close = () => navigate(-1);

  const {
    event, isLoading, error,
    pendingCount, isSaved, isLiked, likeCount,
    hasReposted, repostCount, saveCount,
    attendeesGoing,
    isOnGuestlist, isPending,
    isOwner,
    approvedCount, maxGuestlistCapacity, isGuestlistFull, allTiersSoldOut,
    hasPaidTickets, usesPaidCheckout,
    isLocationSecret, canSeeLocation,
    formattedDate, formattedPrice, hasEnded,
    videoRef, mediaLoaded, aspectRatio, isMuted,
    handleImageLoad, handleVideoMetadata, toggleMute, togglePlayPause,
    buyTicketPending, leaveGuestlistPending,
    saveEventPending, likeEventPending, repostPending,
    showManagement, setShowManagement,
    showShareModal, setShowShareModal,
    showEditSheet, setShowEditSheet,
    showDeleteDialog, setShowDeleteDialog,
    showPaymentModal, setShowPaymentModal,
    showInviteFriendsSheet, setShowInviteFriendsSheet,
    showMenuSheet, setShowMenuSheet,
    showReservationSheet, setShowReservationSheet,
    showComments, setShowComments,
    showTierPicker, setShowTierPicker,
    showAreaPicker, setShowAreaPicker,
    eventAreas, hasAreas, selectedArea, areaBooking, openPaymentForArea,
    showLeaveConfirm, setShowLeaveConfirm,
    ticketTiers, hasTiers, isSequential, selectedTier, openPaymentForTier,
    handleSaveToggle, handleLikeToggle, handleRepostToggle, handleSendToggle,
    handleBuyTicket, handleConfirmFreeJoin, handlePaymentSubmitted, handleLeaveGuestlist,
  } = useEventDetailState(id, close);

  const { data: commentCount = 0 } = useCommentCount(id);
  const { data: latestComment = null } = useLatestComment(id);

  const isVideo = isVideoUrl(event?.image_url);
  const isPost = !!(event?.is_post);

  // Body-scroll lock intentionally removed: the modal is `fixed inset-0`
  // and fully covers the viewport, so background scroll is invisible. The
  // previous overflow toggle caused race conditions on rapid open/close in
  // iOS PWA that occasionally crashed the app to a white screen. Pinterest
  // mobile web takes the same no-lock approach.

  // Check for showPayment query param (returned from checkout success)
  useEffect(() => {
    const shouldShowPayment = searchParams.get("showPayment") === "true";
    if (shouldShowPayment && usesPaidCheckout && !isOnGuestlist) {
      setShowPaymentModal(true);
      searchParams.delete("showPayment");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, usesPaidCheckout, isOnGuestlist, setSearchParams, setShowPaymentModal]);

  // Track impression for the open event (IG/TikTok-style; helper handles self-view & dedupe)
  useEffect(() => {
    if (!id || !event) return;
    if (user?.id && event.creator_id === user.id) return;
    trackEventImpression(id, user?.id ?? null);
  }, [id, event, user?.id]);

  return (
    <m.div
      ref={scrollRef}
      className="fixed inset-0 z-[60] bg-background overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {isLoading ? (
        <EventDetailSkeleton />
      ) : error || !event ? (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4">
          <h1 className="font-brand text-xl font-bold text-foreground mb-2">Evento no encontrado</h1>
          <p className="text-muted-foreground mb-4">Este evento puede haber sido eliminado.</p>
          <Button onClick={close}>Volver</Button>
        </div>
      ) : (
        <>
          {/* Hero media carousel */}
          {(() => {
            const mediaArr = ((event as any).media as any[]) || [];
            const items = mediaArr.length > 0
              ? mediaArr.map((m: any) => ({
                  id: m.id,
                  media_url: m.media_url,
                  media_type: m.media_type,
                  aspect_ratio: m.aspect_ratio,
                }))
              : [{ media_url: event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80", media_type: undefined as any }];
            return (
              <div className="relative w-full overflow-hidden rounded-b-3xl">
                <MediaCarousel items={items} isHero />
                {/* Close button */}
                <div className="absolute top-0 left-0 right-0 safe-top z-20">
                  <div className="flex items-center justify-between px-4 py-4">
                    <Button variant="glass" size="icon" onClick={close}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Content */}
          <m.div
            className="relative px-4 pt-3 pb-28"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="space-y-3">
              {/* Category & title */}
              <div>
                {event.category && (
                  <span className="inline-block px-3 py-1 rounded-full text-xs gradient-primary mb-3 text-primary font-medium">
                    {event.category.replace("_", " ")}
                  </span>
                )}
                {event.title && <h1 className="font-brand text-foreground font-semibold text-2xl">{event.title}</h1>}
              </div>

              {/* Action buttons row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={handleLikeToggle} disabled={likeEventPending} className="gap-1.5 px-2">
                    <Heart className={`w-5 h-5 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                    {likeCount > 0 && <span className="text-xs text-muted-foreground">{likeCount}</span>}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRepostToggle} disabled={repostPending} className="gap-1.5 px-2">
                    <Repeat className={`w-5 h-5 ${hasReposted ? "text-green-500" : ""}`} />
                    {repostCount > 0 && <span className="text-xs text-muted-foreground">{repostCount}</span>}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleSendToggle}>
                    <Send className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSaveToggle} disabled={saveEventPending} className="gap-1.5 px-2">
                    <Bookmark className={`w-5 h-5 ${isSaved ? "fill-primary text-primary" : ""}`} />
                    {saveCount > 0 && <span className="text-xs text-muted-foreground">{saveCount}</span>}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowComments(true)} className="gap-1.5 px-2">
                    <MessageCircle className="w-5 h-5" />
                    {commentCount > 0 && <span className="text-xs text-muted-foreground">{commentCount}</span>}
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  {event.show_menu_button && event.creator_id && (
                    <Button variant="ghost" size="sm" onClick={() => setShowMenuSheet(true)} className="gap-1.5 px-2">
                      <UtensilsCrossed className="w-5 h-5" />
                      <span className="text-xs">Menú</span>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setShowActions(true)}>
                    <MoreVertical className="w-5 h-5" />
                  </Button>

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
                  src={event.creator?.avatar_url || DEFAULT_AVATAR}
                  alt="Host"
                  className="w-12 h-12 rounded-full object-cover transition-transform"
                />
                <p className="font-semibold text-foreground transition-colors">
                  {event.creator?.username || "unknown"}
                </p>
              </div>

              {/* Details */}
              {!isPost && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-foreground">{formattedDate}</p>
                </div>
              )}

              {isLocationSecret && !canSeeLocation ? (
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-secondary/40 border border-border">
                  <Lock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Ubicación secreta</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      La verás cuando el organizador te apruebe.
                    </p>
                  </div>
                </div>
              ) : (
                event.location_name && (
                  <button
                    type="button"
                    onClick={() => setShowLocationSheet(true)}
                    className="flex items-center gap-2 w-full text-left active:opacity-70"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-foreground underline-offset-2 underline decoration-muted-foreground/40">{event.location_name}</p>
                    {isLocationSecret && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1.5 py-0.5 rounded-full border border-border">
                        Secreta
                      </span>
                    )}
                  </button>
                )
              )}

              {/* People Going */}
              {!isPost && attendeesGoing.length > 0 && (
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2.5">
                      {attendeesGoing.slice(0, 5).map((attendee, i) => (
                        <img
                          key={attendee.user_id}
                          src={attendee.avatar_url || DEFAULT_AVATAR}
                          alt={attendee.username}
                          className={`w-8 h-8 rounded-full object-cover cursor-pointer transition-transform z-10 ${
                            attendee.isFollowed ? "border-primary" : "border-card"
                          } border-0`}
                          style={{ zIndex: 5 - i }}
                          onClick={() => navigate(`/user/${attendee.user_id}`)}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {attendeesGoing.length}
                    </span>
                  </div>
                </div>
              )}

              {event.description && (
                <div className="space-y-2">
                  <h2 className="font-brand text-lg font-semibold text-foreground">Acerca de</h2>
                  <MentionText
                    text={event.description}
                    className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap"
                  />
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
                        <span className="font-semibold">{latestComment.user?.username}</span>{" "}
                        {latestComment.content}
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

              {!isPost && isOwner && event.has_guestlist && <InvitationsSentSection eventId={id!} />}

              <RelatedEventsFeed eventId={id!} category={event.category} creatorId={event.creator_id} />
            </div>
          </m.div>

          {/* Modals & sheets */}
          <GuestlistManagementSheet eventId={id!} open={showManagement} onOpenChange={setShowManagement} />
          <ShareEventModal open={showShareModal} onOpenChange={setShowShareModal} eventId={id!} />
          <EventActionsSheet
            open={showActions}
            onOpenChange={setShowActions}
            event={event}
            isOwner={isOwner}
            onClosed={close}
          />
          <LocationSheet
            open={showLocationSheet}
            onOpenChange={setShowLocationSheet}
            locationName={event.location_name}
            latitude={event.latitude}
            longitude={event.longitude}
            isSecret={isLocationSecret}
          />

          <PaymentQRModal
            open={showPaymentModal}
            onOpenChange={setShowPaymentModal}
            eventId={id!}
            eventTitle={event.title || "Evento"}
            price={selectedArea ? Number(selectedArea.price) : selectedTier ? Number(selectedTier.price) : (event.price || 0)}
            ticketTierId={selectedTier?.id ?? null}
            ticketTierName={selectedArea?.name ?? selectedTier?.name ?? null}
            eventAreaId={selectedArea?.id ?? null}
            areaBookingId={areaBooking?.bookingId ?? null}
            partySize={areaBooking?.partySize ?? null}
            mode={
              selectedArea
                ? (Number(selectedArea.price) > 0 ? "paid" : "free")
                : (usesPaidCheckout || hasTiers) ? "paid" : "free"
            }
            onJoinFree={handleConfirmFreeJoin}
            onPaymentConfirmed={handlePaymentSubmitted}
          />
          {hasAreas && (
            <AreaPickerSheet
              open={showAreaPicker}
              onOpenChange={setShowAreaPicker}
              eventId={id!}
              eventTitle={event.title || "Evento"}
              areas={eventAreas}
              onAreaHeld={openPaymentForArea}
            />
          )}
          {hasTiers && (
            <TicketTierPicker
              open={showTierPicker}
              onOpenChange={setShowTierPicker}
              tiers={ticketTiers}
              sequential={isSequential}
              onSelect={openPaymentForTier}
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
          {!isPost && (
            <div className="fixed bottom-0 left-0 right-0 z-[60] glass-strong safe-bottom">
              {hasEnded && !isOwner && !isOnGuestlist ? (
                <div className="flex items-center justify-center px-4 py-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    Este evento ha terminado
                  </span>
                </div>
              ) : (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-col">
                  {hasEnded ? (
                    <span className="text-sm font-medium text-muted-foreground">
                      Este evento ha terminado
                    </span>
                  ) : (
                  <>
                  <span className="font-brand text-lg font-semibold text-foreground">{formattedPrice}</span>
                  {maxGuestlistCapacity != null && (
                    <span className="text-xs text-muted-foreground">
                      {approvedCount}/{maxGuestlistCapacity} entradas vendidas
                    </span>
                  )}
                  </>
                  )}
                </div>
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
                    <Button
                      variant="secondary"
                      size="default"
                      onClick={() => navigate(`/going/${id}`)}
                      className="bg-white text-black border border-border"
                    >
                      <Check className="w-4 h-4 mr-1 text-black" /> Ver entrada
                    </Button>


                  )
                ) : (allTiersSoldOut || isGuestlistFull) ? (
                  <Button variant="outline" size="default" disabled>
                    Entradas agotadas
                  </Button>
                ) : (
                  <Button variant="hero" size="default" onClick={handleBuyTicket} disabled={buyTicketPending}>
                    {buyTicketPending ? <Loader2 className="w-4 h-4 animate-spin" /> : hasPaidTickets ? (
                      <>
                        <DollarSign className="w-4 h-4 mr-1" /> Comprar
                      </>
                    ) : (
                      <>Free</>
                    )}
                  </Button>
                )}
              </div>
              )}
            </div>
          )}

          {isPost && event.show_reservation_button && event.creator_id && (
            <div className="fixed bottom-0 left-0 right-0 z-[60] glass-strong safe-bottom">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-brand text-base font-semibold text-foreground">
                  {event.creator?.full_name || event.creator?.username || ""}
                </span>
                <Button variant="hero" size="default" onClick={() => setShowReservationSheet(true)}>
                  <CalendarCheck className="w-4 h-4 mr-1" /> Reservar
                </Button>
              </div>
            </div>
          )}

          {/* Buttons from other tagged businesses (accepted CTA requests) */}
          <AttachedBusinessCtas eventId={id} excludeBusinessId={event.creator_id} />

          {event.show_menu_button && event.creator_id && (
            <MenuSheet
              open={showMenuSheet}
              onOpenChange={setShowMenuSheet}
              userId={event.creator_id}
              businessName={event.creator?.username}
            />
          )}

          {event.show_reservation_button && event.creator_id && (
            <ReservationSheet
              open={showReservationSheet}
              onOpenChange={setShowReservationSheet}
              businessId={event.creator_id}
              businessName={event.creator?.username || ""}
            />
          )}

          <CommentsSheet
            open={showComments}
            onOpenChange={setShowComments}
            eventId={id!}
            eventCreatorId={event?.creator_id}
            commentCount={commentCount}
          />

          {id && (
            <ReportSheet
              open={showReportSheet}
              onOpenChange={setShowReportSheet}
              targetType={event?.is_post ? "post" : "event"}
              targetId={id}
            />
          )}

        </>
      )}
    </m.div>
  );
};

/**
 * Public wrapper. The local ModalErrorBoundary catches any render error
 * inside the modal tree and dismisses the modal route via navigate(-1),
 * so a single broken event never blanks the whole app.
 */
export const EventDetailModal = () => {
  const navigate = useNavigate();
  return (
    <ModalErrorBoundary
      onError={() => {
        try {
          navigate(-1);
        } catch {
          // no-op
        }
      }}
    >
      <EventDetailModalInner />
    </ModalErrorBoundary>
  );
};

