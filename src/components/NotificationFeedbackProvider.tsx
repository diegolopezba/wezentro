import { useNotificationFeedback } from "@/hooks/useNotificationFeedback";

export const NotificationFeedbackProvider = ({ children }: { children: React.ReactNode }) => {
  useNotificationFeedback();
  return <>{children}</>;
};
