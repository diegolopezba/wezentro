import { useNavigate, useLocation } from "react-router-dom";

/**
 * Pinterest-style overlay navigation for user profiles.
 * Stashes current location as backgroundLocation so the shell stays mounted.
 */
export const useOpenUser = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (userId: string) => {
    const state = location.state as { backgroundLocation?: Location } | null;
    const backgroundLocation = state?.backgroundLocation ?? location;
    navigate(`/user/${userId}`, { state: { backgroundLocation } });
  };
};

/** Same pattern for the notifications inbox. */
export const useOpenNotifications = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    const state = location.state as { backgroundLocation?: Location } | null;
    const backgroundLocation = state?.backgroundLocation ?? location;
    navigate("/notifications", { state: { backgroundLocation } });
  };
};
