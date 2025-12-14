import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, TrendingUp, Clock, Zap } from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";

interface PlatformCardProps {
  platform: "instagram" | "facebook" | "tiktok";
  isActive: boolean;
  onToggle: () => void;
  commentsToday: number;
  dailyLimit: number;
  onPostComments: () => void;
  onGenerateSamples: () => void;
}

const platformConfig = {
  instagram: {
    name: "Instagram",
    icon: SiInstagram,
    color: "text-pink-500",
    bgGradient: "from-pink-500/10 to-purple-500/10",
  },
  facebook: {
    name: "Facebook",
    icon: SiFacebook,
    color: "text-blue-500",
    bgGradient: "from-blue-500/10 to-blue-600/10",
  },
  tiktok: {
    name: "TikTok",
    icon: SiTiktok,
    color: "text-foreground",
    bgGradient: "from-cyan-500/10 to-pink-500/10",
  },
};

export default function PlatformCard({
  platform,
  isActive,
  onToggle,
  commentsToday,
  dailyLimit,
  onPostComments,
  onGenerateSamples,
}: PlatformCardProps) {
  const config = platformConfig[platform];
  const Icon = config.icon;
  const progress = (commentsToday / dailyLimit) * 100;

  return (
    <Card className={`p-6 bg-gradient-to-br ${config.bgGradient}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg bg-card ${config.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{config.name}</h3>
            <Badge variant={isActive ? "default" : "secondary"} className="mt-1">
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={onToggle}
          data-testid={`switch-${platform}`}
        />
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Today's Comments</span>
            <span className="font-medium">
              {commentsToday} / {dailyLimit}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>2-3 min delay</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>98% success</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 gap-2"
            onClick={onPostComments}
            disabled={!isActive}
            data-testid={`button-comment-${platform}`}
          >
            <MessageSquare className="h-4 w-4" />
            Post Comments
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onGenerateSamples}
            data-testid={`button-generate-${platform}`}
          >
            <Zap className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
