import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw,
  Clock 
} from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SessionHealthData {
  totalAccounts: number;
  validSessions: number;
  expiringSoon: number;
  expired: number;
  noSession: number;
  healthScore: number;
  alerts: Array<{
    accountId: string;
    username: string;
    platform: string;
    issue: string;
    severity: "warning" | "error";
  }>;
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform.toLowerCase()) {
    case "instagram":
      return <SiInstagram className="w-4 h-4 text-pink-500" />;
    case "facebook":
      return <SiFacebook className="w-4 h-4 text-blue-500" />;
    case "tiktok":
      return <SiTiktok className="w-4 h-4" />;
    default:
      return null;
  }
};

export default function SessionHealthMonitor() {
  const { data: health, isLoading, refetch } = useQuery<SessionHealthData>({
    queryKey: ["/api/sessions/health"],
    refetchInterval: 60000,
  });

  const handleCleanup = async () => {
    try {
      await apiRequest("POST", "/api/sessions/cleanup");
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/health"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/status"] });
    } catch (error) {
      console.error("Failed to cleanup sessions:", error);
    }
  };

  if (isLoading || !health) {
    return (
      <Card data-testid="card-session-health-loading">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-lg">Session Health</CardTitle>
          <Shield className="w-5 h-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHealthIcon = () => {
    if (health.healthScore >= 80) {
      return <ShieldCheck className="w-6 h-6 text-green-500" />;
    } else if (health.healthScore >= 50) {
      return <Shield className="w-6 h-6 text-yellow-500" />;
    }
    return <ShieldAlert className="w-6 h-6 text-red-500" />;
  };

  const getHealthColor = () => {
    if (health.healthScore >= 80) return "text-green-500";
    if (health.healthScore >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card data-testid="card-session-health">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Session Health</CardTitle>
          {getHealthIcon()}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => refetch()}
            data-testid="button-refresh-health"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Health Score</span>
          <span className={`text-2xl font-bold ${getHealthColor()}`} data-testid="text-health-score">
            {health.healthScore}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-md">
            <span className="text-muted-foreground">Valid</span>
            <Badge variant="secondary" className="bg-green-500/20 text-green-600">
              {health.validSessions}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-md">
            <span className="text-muted-foreground">Expiring</span>
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
              {health.expiringSoon}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-md">
            <span className="text-muted-foreground">Expired</span>
            <Badge variant="secondary" className="bg-red-500/20 text-red-600">
              {health.expired}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted rounded-md">
            <span className="text-muted-foreground">No Session</span>
            <Badge variant="secondary">
              {health.noSession}
            </Badge>
          </div>
        </div>

        {health.alerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Alerts ({health.alerts.length})
            </div>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {health.alerts.slice(0, 5).map((alert, i) => (
                <div 
                  key={`${alert.accountId}-${i}`}
                  className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                    alert.severity === "error" ? "bg-red-500/10" : "bg-yellow-500/10"
                  }`}
                  data-testid={`alert-session-${alert.accountId}`}
                >
                  <PlatformIcon platform={alert.platform} />
                  <span className="font-medium truncate flex-1">@{alert.username}</span>
                  <span className="text-muted-foreground text-xs">{alert.issue}</span>
                </div>
              ))}
              {health.alerts.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{health.alerts.length - 5} more alerts
                </p>
              )}
            </div>
          </div>
        )}

        {(health.expired > 0 || health.noSession > 0) && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={handleCleanup}
            data-testid="button-cleanup-sessions"
          >
            <Clock className="w-4 h-4 mr-2" />
            Cleanup Expired Sessions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
