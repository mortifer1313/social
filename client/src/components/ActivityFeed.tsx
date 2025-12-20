import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertCircle, Clock, MessageSquare } from "lucide-react";

interface Activity {
  id: number;
  type: "success" | "error" | "pending" | "info";
  message: string;
  platform?: string;
  time: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const typeConfig = {
  success: { icon: CheckCircle2, color: "text-green-500" },
  error: { icon: AlertCircle, color: "text-red-500" },
  pending: { icon: Clock, color: "text-yellow-500" },
  info: { icon: MessageSquare, color: "text-blue-500" },
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Live updates</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {activities.map((activity) => {
            const config = typeConfig[activity.type];
            const Icon = config.icon;
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
              >
                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activity.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {activity.platform && (
                      <Badge variant="outline" className="text-xs">
                        {activity.platform}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
