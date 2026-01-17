import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { GuestlistStatusBreakdown } from "@/hooks/useBusinessAnalytics";

interface StatusPieChartProps {
  data: GuestlistStatusBreakdown | undefined;
  isLoading?: boolean;
}

const COLORS = {
  pending: "hsl(45, 93%, 47%)",
  approved: "hsl(142, 76%, 36%)",
  rejected: "hsl(0, 72%, 51%)",
  checkedIn: "hsl(217, 91%, 60%)",
};

const LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  checkedIn: "Checked In",
};

export const StatusPieChart = ({ data, isLoading }: StatusPieChartProps) => {
  if (isLoading || !data) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-32 h-32 rounded-full bg-secondary/50 animate-pulse" />
      </div>
    );
  }

  const total = data.pending + data.approved + data.rejected + data.checkedIn;

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <p>No guestlist data yet</p>
      </div>
    );
  }

  const chartData = [
    { name: LABELS.pending, value: data.pending, color: COLORS.pending },
    { name: LABELS.approved, value: data.approved, color: COLORS.approved },
    { name: LABELS.rejected, value: data.rejected, color: COLORS.rejected },
    { name: LABELS.checkedIn, value: data.checkedIn, color: COLORS.checkedIn },
  ].filter((item) => item.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-64"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--foreground))",
            }}
            formatter={(value: number) => [`${value} guests`, ""]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
