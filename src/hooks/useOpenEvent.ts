import { useNavigate, useLocation } from "react-router-dom";

/**
 * Pinterest/Instagram-style modal navigation.
 *
 * Calling openEvent(id) navigates to /event/:id but stashes the current
 * location in `state.backgroundLocation`. The router in App.tsx renders
 * the modal version of <EventDetail/> on top of the previous page,
 * keeping the feed mounted (no remount, no glitch, instant feel).
 *
 * Direct visits to /event/:id (deep links, shared URLs, push notifications)
 * have no `backgroundLocation` and render the full page as before.
 */
export const useOpenEvent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (eventId: string) => {
    // If we're already viewing an event-as-modal, keep the *original* background
    // (the feed) so closing returns to it instead of stacking endlessly.
    const state = location.state as { backgroundLocation?: Location } | null;
    const backgroundLocation = state?.backgroundLocation ?? location;

    navigate(`/event/${eventId}`, {
      state: { backgroundLocation },
    });
  };
};
