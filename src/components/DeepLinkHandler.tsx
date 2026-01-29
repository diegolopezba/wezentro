import { useDeepLinks } from "@/hooks/useDeepLinks";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";

export const DeepLinkHandler = () => {
  useDeepLinks();
  useAndroidBackButton();
  return null;
};
