import { useDeepLinks } from "@/hooks/useDeepLinks";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { usePushNavigation } from "@/hooks/usePushNavigation";

export const DeepLinkHandler = () => {
  useDeepLinks();
  usePushNavigation();
  useAndroidBackButton();
  return null;
};
