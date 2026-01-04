import { usePushNotificationPrompt } from "@/hooks/usePushNotificationPrompt";

interface Props {
  children: React.ReactNode;
}

export const PushNotificationPrompt = ({ children }: Props) => {
  // This hook handles auto-prompting for push notifications
  usePushNotificationPrompt();
  
  return <>{children}</>;
};
