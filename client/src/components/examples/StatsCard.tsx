import StatsCard from '../StatsCard';
import { MessageSquare } from "lucide-react";

export default function StatsCardExample() {
  return (
    <div className="max-w-xs">
      <StatsCard
        title="Total Comments"
        value="1,234"
        subtitle="Across all platforms"
        icon={<MessageSquare className="h-5 w-5" />}
        trend="up"
        trendValue="+12%"
      />
    </div>
  );
}
