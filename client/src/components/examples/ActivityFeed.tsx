import ActivityFeed from '../ActivityFeed';

const mockActivities = [
  { id: 1, type: "success" as const, message: "Posted 5 comments successfully", platform: "Instagram", time: "2m ago" },
  { id: 2, type: "info" as const, message: "Generated new comment templates", time: "5m ago" },
  { id: 3, type: "pending" as const, message: "Campaign in progress...", platform: "TikTok", time: "8m ago" },
];

export default function ActivityFeedExample() {
  return (
    <div className="h-80 w-80">
      <ActivityFeed activities={mockActivities} />
    </div>
  );
}
