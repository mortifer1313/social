import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, TrendingUp } from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";

interface WarmupStatus {
  id: string;
  platform: string;
  username: string;
  displayName: string | null;
  warmupLevel: number;
  status: string;
  daysAtLevel: number;
  progressPercent: number;
  currentLimits: { maxPerDay: number; maxPerHour: number };
  commentsToday: number;
  totalComments: number;
  healthScore: number;
}

const WARMUP_LEVELS = [
  { level: 0, name: "New", color: "bg-gray-500" },
  { level: 1, name: "Starting", color: "bg-blue-500" },
  { level: 2, name: "Growing", color: "bg-cyan-500" },
  { level: 3, name: "Established", color: "bg-green-500" },
  { level: 4, name: "Trusted", color: "bg-yellow-500" },
  { level: 5, name: "Veteran", color: "bg-orange-500" },
];

export function WarmupProgressCard() {
  const { data: warmupStatus = [], isLoading } = useQuery<WarmupStatus[]>({
    queryKey: ["/api/accounts/warmup-status"],
    refetchInterval: 60000,
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "instagram": return <SiInstagram className="w-3 h-3" />;
      case "facebook": return <SiFacebook className="w-3 h-3" />;
      case "tiktok": return <SiTiktok className="w-3 h-3" />;
      default: return null;
    }
  };

  const getLevelInfo = (level: number) => {
    return WARMUP_LEVELS[level] || WARMUP_LEVELS[0];
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-4 h-4" />
            Account Warmup Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (warmupStatus.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-4 h-4" />
            Account Warmup Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-4">
            No accounts to display warmup progress
          </p>
        </CardContent>
      </Card>
    );
  }

  const groupedByPlatform = warmupStatus.reduce((acc, account) => {
    if (!acc[account.platform]) acc[account.platform] = [];
    acc[account.platform].push(account);
    return acc;
  }, {} as Record<string, WarmupStatus[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-4 h-4" />
          Account Warmup Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedByPlatform).map(([platform, accounts]) => (
            <div key={platform}>
              <div className="flex items-center gap-2 mb-3">
                {getPlatformIcon(platform)}
                <span className="text-sm font-medium capitalize">{platform}</span>
                <Badge variant="outline" className="ml-auto">{accounts.length} accounts</Badge>
              </div>
              <div className="space-y-3">
                {accounts.slice(0, 5).map(account => {
                  const levelInfo = getLevelInfo(account.warmupLevel);
                  return (
                    <div key={account.id} className="p-3 bg-muted/50 rounded-lg" data-testid={`warmup-account-${account.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{account.displayName || account.username}</span>
                          <Badge variant="secondary" className={`${levelInfo.color} text-white text-xs`}>
                            Lvl {account.warmupLevel}
                          </Badge>
                        </div>
                        <span className={`text-xs font-medium ${getHealthColor(account.healthScore)}`}>
                          {account.healthScore}% health
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{levelInfo.name}</span>
                          <span>{account.progressPercent}% to next level</span>
                        </div>
                        <Progress value={account.progressPercent} className="h-1.5" />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Today: {account.commentsToday}/{account.currentLimits.maxPerDay}</span>
                        <span>Total: {account.totalComments} comments</span>
                      </div>
                    </div>
                  );
                })}
                {accounts.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{accounts.length - 5} more accounts
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Warmup Levels</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {WARMUP_LEVELS.map(level => (
              <Badge key={level.level} variant="outline" className="text-xs">
                <span className={`w-2 h-2 rounded-full ${level.color} mr-1`} />
                {level.level}: {level.name}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
