import { DemographicsCharts } from "./DemographicsCharts";
import { FollowerGrowthChart } from "./FollowerGrowthChart";
import { AudienceInsights } from "./AudienceInsights";
import { useAudienceDemographics, useRepeatAttendees } from "@/hooks/useBusinessAnalytics";
import { Repeat } from "lucide-react";

export const AudienceTab = () => {
  const { data: demographics, isLoading: demoLoading } = useAudienceDemographics();
  const { data: repeatData } = useRepeatAttendees();

  return (
    <div className="space-y-6">
      <h2 className="font-brand text-lg font-semibold text-foreground">Audiencia</h2>

      <DemographicsCharts demographics={demographics} isLoading={demoLoading} />

      <FollowerGrowthChart />

      <AudienceInsights />

      {/* Repeat Attendees */}
      {repeatData && repeatData.totalUniqueAttendees > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Repeat className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{repeatData.repeatPercentage}%</p>
              <p className="text-sm text-muted-foreground">
                Repeat Attendees ({repeatData.repeatAttendees} de {repeatData.totalUniqueAttendees})
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
