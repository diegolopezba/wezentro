import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { EventPerformance } from "@/hooks/useBusinessAnalytics";
import { format } from "date-fns";

interface EngagementChartProps {
  events: EventPerformance[];
  isLoading?: boolean;
}

export const EngagementChart = ({ events, isLoading }: EngagementChartProps) => {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-full h-48 bg-secondary/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <p>No event data available</p>
      </div>
    );
  }

  // Take up to 6 most recent events for the chart
  const chartData = events
    .slice(0, 6)
    .reverse()
    .map((event) => ({
      name: event.title.length > 12 ? event.title.slice(0, 12) + "..." : event.title,
      date: format(new Date(event.start_datetime), "MMM d"),
      requests: event.guestlist_requests,
      approved: event.approved_guests,
      checkedIn: event.checked_in,
      likes: event.likes_count,
    }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-64"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--foreground))",
            }}
            labelFormatter={(value, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.name;
              }
              return value;
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground capitalize">{value}</span>
            )}
          />
          <Bar dataKey="requests" fill="hsl(var(--muted-foreground))" name="Requests" radius={[4, 4, 0, 0]} />
          <Bar dataKey="approved" fill="hsl(142, 76%, 36%)" name="Approved" radius={[4, 4, 0, 0]} />
          <Bar dataKey="checkedIn" fill="hsl(217, 91%, 60%)" name="Checked In" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
