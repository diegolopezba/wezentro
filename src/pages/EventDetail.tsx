import { useRef, useEffect, useLayoutEffect } from "react";
import { m } from "framer-motion";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, X, Calendar, MapPin, Users, DollarSign, MessageCircle, Send, Loader2, Check, Clock, Volume2, VolumeX, Heart, MoreVertical, Pencil, Trash2, Lock, Bookmark, Repeat, EyeOff, UtensilsCrossed, CalendarCheck, Flag, HelpCircle } from "lucide-react";
import { useState } from "react";
import { ReportSheet } from "@/components/moderation/ReportSheet";
import { Button } from "@/components/ui/button";
import { useEventGuestlist } from "@/hooks/useEvents";
import { GuestlistManagementSheet } from "@/components/events/GuestlistManagementSheet";
import { ShareEventModal } from "@/components/events/ShareEventModal";

import { LocationSheet } from "@/components/events/LocationSheet";
import { EventActionsSheet } from "@/components/events/EventActionsSheet";
import { InvitationsSentSection } from "@/components/events/InvitationsSentSection";


import { PaymentQRModal } from "@/components/events/PaymentQRModal";
import { useSpecialInvite, useRedeemSpecialInvite } from "@/hooks/useSpecialInvites";
import { TicketTierPicker } from "@/components/events/TicketTierPicker";
import { AreaPickerSheet } from "@/components/venue/AreaPickerSheet";
import { InviteFriendsSheet } from "@/components/events/InviteFriendsSheet";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { isVideoUrl } from "@/lib/mediaUtils";
import { MediaCarousel } from "@/components/events/MediaCarousel";
import { trackEventView, trackEventImpression } from "@/lib/analyticsTracking";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

import { RelatedEventsFeed } from "@/components/events/RelatedEventsFeed";
import { MentionText } from "@/components/ui/MentionText";
import { MenuSheet } from "@/components/menu/MenuSheet";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import { ExperienceBookingSheet } from "@/components/experiences/ExperienceBookingSheet";
import { useExperience } from "@/hooks/useExperiences";
import { useEventDetailState } from "@/hooks/useEventDetailState";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CommentsSheet } from "@/components/events/CommentsSheet";
import { FeatureIntroSheet, useFeatureIntro } from "@/components/business/FeatureIntroSheet";
import { EVENT_ACTIONS_INTRO } from "@/components/business/featureIntroSteps";
import { useCommentCount, useLatestComment } from "@/hooks/useEventComments";
import { AttachedBusinessCtas } from "@/components/events/AttachedBusinessCtas";
import { captureFromUrl } from "@/lib/promoterAttribution";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const intro = useFeatureIntro("event");
  const fromCreate = (location.state as { fromCreate?: boolean })?.fromCreate;
  const openGuestlistOnMount = (location.state as { openGuestlist?: boolean })?.openGuestlist;
  const { user } = useAuth();
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Special guest invitation (?invite=<token>)
  const inviteToken = new URLSearchParams(location.search).get("invite") || undefined;
  const { data: specialInvite } = useSpecialInvite(inviteToken);
  const redeemSpecialInvite = useRedeemSpecialInvite();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const hasActiveInvite =
    !!specialInvite && specialInvite.status === "pending" && specialInvite.event_id === id;
  const handleAcceptSpecialInvite = async () => {
    if (!inviteToken) return;
    await redeemSpecialInvite.mutateAsync(inviteToken);
  };


  const {
    event, isLoading, error,
    guestlist,
    pendingCount, isSaved, isLiked, likeCount,
    hasReposted, repostCount, saveCount,
    attendeesGoing,
    isOnGuestlist, isPending, isApproved,
    isOwner,
    approvedCount, maxGuestlistCapacity, isGuestlistFull, allTiersSoldOut,
    hasPaidTickets, usesPaidCheckout, isInviteOnlyGuestlist,
    isLocationSecret, canSeeLocation,
    isAuthenticated,
    formattedDate, formattedPrice, hasEnded,
    waitlistEnabled, isWaitlistPhase, isEarlyAccessPhase,
    isOnWaitlist, waitlistPosition, waitlistTotal,
    publicSaleStarts, canPurchaseNow, waitlistTierId,
    handleToggleWaitlist, handleReleaseTickets, waitlistPending, releasePending,
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
  } = useEventDetailState(id, () => (window.history.length > 1 ? navigate(-1) : navigate("/")));

  const [showExperienceSheet, setShowExperienceSheet] = useState(false);
  const { data: rawLinkedExperience = null } = useExperience((event as any)?.experience_id ?? null);
  const linkedExperience = rawLinkedExperience?.is_active ? rawLinkedExperience : null;

  const { data: commentCount = 0 } = useCommentCount(id);
  const { data: latestComment = null } = useLatestComment(id);

  // Enable swipe-from-left-edge to go back on mobile
  useSwipeBack();

  // Defensive scroll-reset on id change (e.g. deep-link nav between events)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);

  // Track impression for the open event (IG/TikTok-style; helper handles self-view & dedupe)
  useEffect(() => {
    if (!id || !event) return;
    if (user?.id && event.creator_id === user.id) return;
    trackEventImpression(id, user?.id ?? null);
  }, [id, event, user?.id]);

  // Auto-open guestlist management sheet if navigated from a guestlist_request notification
  useEffect(() => {
    if (openGuestlistOnMount) {
      setShowManagement(true);
    }
  }, [openGuestlistOnMount]);

  // Track event view for analytics. trackEventView / trackPreferenceSignal are imported
  // module-level functions and stable; only re-fire when the viewed event or user changes.
  useEffect(() => {
    if (id && user?.id) {
      trackEventView(id, user.id);
      trackPreferenceSignal(user.id, id, "click");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // Capture ?p=<code> promoter attribution into localStorage + log click
  useEffect(() => {
    if (!id) return;
    captureFromUrl(id, location.search);
  }, [id, location.search]);



  if (isLoading) {
    return <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  if (error || !event) {
    return <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4">
        <h1 className="font-brand text-xl font-medium text-foreground mb-2">Evento no encontrado</h1>
        <p className="text-muted-foreground mb-4">Este evento puede haber sido eliminado o no existe.</p>
        <Button onClick={() => navigate("/")}>Ir al Inicio</Button>
      </div>;
  }
  const isVideo = isVideoUrl(event.image_url);
  const isPost = !!event.is_post;
  const mediaArr = ((event as any).media as any[]) || [];
  const carouselItems = mediaArr.length > 0
    ? mediaArr.map((m: any) => ({
        id: m.id,
        media_url: m.media_url,
        media_type: m.media_type,
        aspect_ratio: m.aspect_ratio,
      }))
    : [{ media_url: event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80", media_type: undefined as any }];
  return <div className="min-h-[100dvh] bg-background">
      {/* Hero media carousel */}
      <div className="relative w-full overflow-hidden rounded-b-3xl">
        <MediaCarousel items={carouselItems} isHero />
        {/* Back button */}
        <div className="absolute top-0 left-0 right-0 safe-top z-20 pointer-events-none">
          <div className="flex items-center justify-between px-4 py-4">
            <Button variant="glass" size="icon" className="pointer-events-auto" onClick={() => {
            if (fromCreate) {
              navigate("/", { replace: true });
            } else if (window.history.length > 1) {
              (window.history.length > 1 ? navigate(-1) : navigate("/"));
            } else {
              navigate("/");
            }
          }}>
              {fromCreate ? <X className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative px-4 pt-3 pb-28">
        <m.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="space-y-3">
          {/* Category & title */}
          <div>
            {event.category && <span className="inline-block px-3 py-1 rounded-full text-xs font-medium gradient-primary mb-3 text-primary">
                {event.category.replace("_", " ")}
              </span>}
            {event.title && <h1 className="font-brand text-3xl font-medium text-foreground">{event.title}</h1>}
          </div>

          {/* Event action buttons */}
          <div className="flex items-center justify-between">
            {/* Left: Like, Repost, Send, Save, Invite */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleLikeToggle} disabled={likeEventPending} className="gap-1.5 px-2">
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-brand-red text-brand-red' : ''}`} />
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
              <Button variant="ghost" size="icon" onClick={() => setShowActions(true)}>
                <MoreVertical className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={intro.reopen} aria-label="¿Cómo funciona?">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Host */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
          if (event.creator_id) {
            navigate(`/user/${event.creator_id}`);
          }
        }}>
            <img src={event.creator?.avatar_url || DEFAULT_AVATAR} alt="Host" className="w-12 h-12 rounded-full object-cover transition-transform" />
            <p className="font-semibold text-foreground transition-colors">
              {event.creator?.username || "unknown"}
            </p>
          </div>

          {/* Details - Only show for events, not posts */}
          {!isPost && <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-foreground">{formattedDate}</p>
              </div>}

          {/* Location - hidden for non-approved viewers on secret-location events */}
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
            event.location_name && <button
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
          )}

          {/* People Going section */}
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
                        attendee.isFollowed ? "border-primary" : "border-card" } border-0`}
                      style={{ zIndex: 5 - i }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/user/${attendee.user_id}`);
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {attendeesGoing.length}
                </span>
              </div>
            </div>
          )}

          {/* Ticket tiers preview while the pre-sale waiting list is open */}
          {isWaitlistPhase && hasTiers && (
            <WaitlistTiersPreview tiers={ticketTiers} waitlistTierId={waitlistTierId} />
          )}

          {/* Description */}
          {event.description && <div className="space-y-2">
              <h2 className="font-brand text-lg font-semibold text-foreground">Acerca de</h2>
              <MentionText text={event.description} className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap" />
            </div>}


          {/* Comment preview teaser */}
          <div
            className="flex items-center gap-3 py-3 cursor-pointer group" onClick={() => setShowComments(true)}
          >
            {latestComment ? (
              <>
                <img
                  src={latestComment.user?.avatar_url || DEFAULT_AVATAR}
                  alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-semibold">{latestComment.user?.username}</span>
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
              <Button variant="sheet-action" className="w-full" onClick={() => navigate("/auth")}>
                Registrarse / Iniciar Sesión
              </Button>
            </div>}
        </m.div>
      </div>


      {/* Guestlist Management Sheet */}
      {isOwner && <GuestlistManagementSheet eventId={id!} eventHasPaymentQr={usesPaidCheckout} open={showManagement} onOpenChange={setShowManagement} />}

      {/* Share Event Modal */}
      <ShareEventModal eventId={id!} open={showShareModal} onOpenChange={setShowShareModal} />


      {/* Unified actions sheet — edit + delete + report + copy link */}
      <EventActionsSheet
        open={showActions}
        onOpenChange={setShowActions}
        event={event}
        isOwner={isOwner}
      />
      <LocationSheet
        open={showLocationSheet}
        onOpenChange={setShowLocationSheet}
        locationName={event.location_name}
        latitude={event.latitude}
        longitude={event.longitude}
        isSecret={isLocationSecret}
      />

      
      {/* Checkout Modal — paid (QR) OR free (confirm to join) */}
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

      {/* Visual venue layout picker (opt-in per event) */}
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



      {/* Special guest invitation confirmation */}
      {hasActiveInvite && (
        <PaymentQRModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          eventId={id!}
          eventTitle={event.title || "Evento"}
          price={0}
          ticketTierId={specialInvite?.ticket_tier_id ?? null}
          ticketTierName={specialInvite?.label ?? null}
          mode="invite"
          onJoinFree={handleAcceptSpecialInvite}
          onPaymentConfirmed={handlePaymentSubmitted}
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

      {event.has_guestlist &&
    <InviteFriendsSheet
      eventId={id!}
      eventTitle={event.title || "Evento"}
      open={showInviteFriendsSheet}
      onOpenChange={setShowInviteFriendsSheet} />

    }
      {/* Floating CTA Bar — always show for events */}
      {!isPost && !linkedExperience &&
    <div className="fixed bottom-0 left-0 right-0 z-30 glass-strong safe-bottom">
          {hasEnded && !isOwner && !isOnGuestlist ?
      <div className="flex items-center justify-center px-4 py-4">
              <span className="text-sm font-medium text-muted-foreground">
                Este evento ha terminado
              </span>
            </div> :
      <div className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col">
              {hasEnded ?
          <span className="text-sm font-medium text-muted-foreground">
                  Este evento ha terminado
                </span> :
          <>
              <span className="font-brand text-lg font-semibold text-foreground">
                {formattedPrice}
              </span>
              {isWaitlistPhase ? (
                <span className="text-xs text-muted-foreground">
                  Lista de espera{waitlistTotal > 0 ? ` · ${waitlistTotal} interesados` : ""}
                </span>
              ) : isEarlyAccessPhase ? (
                <span className="text-xs text-muted-foreground">
                  {canPurchaseNow
                    ? "Acceso anticipado para la lista"
                    : publicSaleStarts
                    ? `Venta general ${format(publicSaleStarts, "d MMM • HH:mm", { locale: es })}`
                    : "Acceso anticipado en curso"}
                </span>
              ) : maxGuestlistCapacity != null ? (
                <span className="text-xs text-muted-foreground">
                  {approvedCount}/{maxGuestlistCapacity} entradas vendidas
                </span>
              ) : null}
              </>
          }
            </div>
            {isOwner ?
        <div className="flex items-center gap-2">
                {waitlistEnabled && isWaitlistPhase && (
                  <Button variant="outline" size="default" onClick={handleReleaseTickets} disabled={releasePending}>
                    {releasePending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar entradas"}
                  </Button>
                )}
                <Button variant="sheet-action" size="default" onClick={() => setShowManagement(true)}>
                  Gestionar
                  {pendingCount > 0 &&
            <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                      {pendingCount}
                    </span>
            }
                </Button>
              </div> :
        isOnGuestlist ?
        isPending ?
        <Button variant="ghost" size="default" disabled>
                  <Clock className="w-4 h-4 mr-1" /> Pendiente
                </Button> :
        <span className="glow-border">
                  <Button variant="outline" size="default" className="bg-white text-black border-0 hover:bg-white/90" onClick={() => navigate(`/going/${id}`)}>
                    <Check className="w-4 h-4 mr-1 text-black" /> Ver entrada
                  </Button>
                </span> :
        hasActiveInvite ?

        <Button variant="sheet-action" size="default" onClick={() => setShowInviteModal(true)}>
                Aceptar invitación especial
              </Button> :
        isWaitlistPhase ?
        <Button
          variant={isOnWaitlist ? "outline" : "sheet-action"}
          size="default"
          onClick={handleToggleWaitlist}
          disabled={waitlistPending}>
                {waitlistPending ? <Loader2 className="w-4 h-4 animate-spin" /> :
                isOnWaitlist ? <><Check className="w-4 h-4 mr-1" /> En la lista{waitlistPosition ? ` #${waitlistPosition}` : ""}</> :
                <>Unirme a la lista</>}
              </Button> :
        (allTiersSoldOut || isGuestlistFull) ?
        <Button variant="outline" size="default" disabled>
                Entradas agotadas
              </Button> :
        <Button variant="sheet-action" size="default" onClick={handleBuyTicket} disabled={buyTicketPending || !canPurchaseNow}>
                {buyTicketPending ? <Loader2 className="w-4 h-4 animate-spin" /> : !canPurchaseNow ? <>Venta general pronto</> : hasPaidTickets ? <><DollarSign className="w-4 h-4 mr-1" /> Comprar</> : <>Free</>}
              </Button>
        }
          </div>
      }
        </div>
    }

    {/* Floating experience booking CTA — post/event linked to a bookable experience */}
    {linkedExperience && (
      <>
        <div className="fixed bottom-0 left-0 right-0 z-30 glass-strong safe-bottom">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col">
              <span className="font-brand text-base font-medium text-foreground">
                {linkedExperience.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {linkedExperience.duration_minutes} min
              </span>
            </div>
            <Button variant="sheet-action" size="default" onClick={() => setShowExperienceSheet(true)}>
              <CalendarCheck className="w-4 h-4 mr-1" /> Reservar
            </Button>
          </div>
        </div>
        <ExperienceBookingSheet
          open={showExperienceSheet}
          onOpenChange={setShowExperienceSheet}
          experience={linkedExperience}
        />
      </>
    )}

    {/* Floating Reservation CTA Bar — shown only for posts */}
    {isPost && !linkedExperience && event.show_reservation_button && event.creator_id && (
      <div className="fixed bottom-0 left-0 right-0 z-30 glass-strong safe-bottom">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-brand text-base font-semibold text-foreground">
            {event.creator?.full_name || event.creator?.username || ""}
          </span>
          <Button
            variant="sheet-action" size="default" onClick={() => setShowReservationSheet(true)}
          >
            <CalendarCheck className="w-4 h-4 mr-1" /> Reservar
          </Button>
        </div>
      </div>
    )}

    {/* Buttons from other tagged businesses (CTA requests accepted by the post owner) */}
    <AttachedBusinessCtas eventId={id} excludeBusinessId={event.creator_id} />
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

    {/* Report Sheet */}
    {id && (
      <ReportSheet
        open={showReportSheet}
        onOpenChange={setShowReportSheet}
        targetType={event.is_post ? "post" : "event"}
        targetId={id}
      />
    )}

    <FeatureIntroSheet open={intro.open} onOpenChange={intro.setOpen} steps={EVENT_ACTIONS_INTRO} />
    </div>;
};
export default EventDetail;