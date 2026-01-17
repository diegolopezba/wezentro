import { motion } from "framer-motion";
import { GuestlistFunnelData } from "@/hooks/useBusinessAnalytics";
import { Mail, CheckCircle, Users, UserCheck, Ticket } from "lucide-react";

interface GuestlistFunnelProps {
  data: GuestlistFunnelData | undefined;
  isLoading?: boolean;
}

const funnelSteps = [
  { key: "invitationsSent", label: "Invitations Sent", icon: Mail },
  { key: "invitationsAccepted", label: "Accepted", icon: CheckCircle },
  { key: "guestlistJoins", label: "Guestlist Joins", icon: Users },
  { key: "approved", label: "Approved", icon: UserCheck },
  { key: "checkedIn", label: "Checked In", icon: Ticket },
] as const;

export const GuestlistFunnel = ({ data, isLoading }: GuestlistFunnelProps) => {
  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-12 bg-secondary/50 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  const maxValue = Math.max(
    data.invitationsSent,
    data.guestlistJoins,
    1
  );

  return (
    <div className="space-y-3">
      {funnelSteps.map((step, index) => {
        const value = data[step.key];
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const Icon = step.icon;

        // Calculate conversion from previous step
        let conversionRate: number | null = null;
        if (index > 0) {
          const prevKey = funnelSteps[index - 1].key;
          const prevValue = data[prevKey];
          if (prevValue > 0) {
            conversionRate = Math.round((value / prevValue) * 100);
          }
        }

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{step.label}</span>
                  <div className="flex items-center gap-2">
                    {conversionRate !== null && (
                      <span className="text-xs text-muted-foreground">
                        {conversionRate}% from prev
                      </span>
                    )}
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{
                      background: `hsl(var(--accent-red))`,
                      opacity: 1 - index * 0.15,
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
