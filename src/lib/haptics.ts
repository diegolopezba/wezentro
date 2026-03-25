/**
 * Haptic feedback utility for native-like tactile responses.
 * Uses @capacitor/haptics on native iOS/Android, falls back to
 * the Web Vibration API on browsers (Android Chrome only — iOS Safari blocks it).
 *
 * Patterns:
 * - light:    quick tap — toggles, selections
 * - medium:   firm tap — likes, saves, follows, shares
 * - heavy:    strong pulse — guestlist join, publish, reservation confirmed
 * - success:  success notification — action completed successfully
 * - warning:  warning notification — destructive confirm, errors
 * - notification: success notification — incoming notification / message
 */

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "notification";

// Web vibration fallback patterns (ms)
const webPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 40,
  success: [20, 60, 30],
  warning: [30, 40, 30, 40, 30],
  notification: [100, 50, 100],
};

/**
 * Trigger haptic feedback on supported devices.
 * Silently no-ops on unsupported environments.
 */
export const haptic = async (pattern: HapticPattern = "medium") => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Native: use @capacitor/haptics for proper iOS Taptic Engine + Android vibrator
      switch (pattern) {
        case "light":
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case "medium":
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case "heavy":
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case "success":
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case "warning":
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case "notification":
          await Haptics.notification({ type: NotificationType.Success });
          break;
      }
    } else if ("vibrate" in navigator) {
      // Web fallback: works on Android Chrome, silently ignored on iOS Safari
      navigator.vibrate(webPatterns[pattern]);
    }
  } catch {
    // Silently ignore — not all environments support haptics
  }
};
