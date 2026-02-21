/**
 * Haptic feedback utility for native-like tactile responses.
 * Uses the Vibration API available on mobile browsers and Capacitor WebView.
 *
 * Patterns:
 * - light:    quick tap (10ms) — toggles, selections
 * - medium:   firm tap (25ms) — likes, saves, follows, shares
 * - heavy:    strong pulse (40ms) — guestlist join, publish, reservation confirmed
 * - success:  double-pulse (20-60-30) — action completed successfully
 * - warning:  triple-pulse (30-40-30-40-30) — destructive confirm, errors
 * - notification: long buzz (100-50-100) — incoming notification / message
 */

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "notification";

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 40,
  success: [20, 60, 30],
  warning: [30, 40, 30, 40, 30],
  notification: [100, 50, 100],
};

/**
 * Trigger haptic feedback on supported devices.
 * Silently no-ops on unsupported browsers/devices.
 */
export const haptic = (pattern: HapticPattern = "medium") => {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(patterns[pattern]);
    }
  } catch {
    // Silently ignore — not all environments support vibrate
  }
};
