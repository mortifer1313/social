import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, TrendingUp, BarChart3 } from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";

interface EngagementSummary {
  totalLikes: number;
  totalReplies: number;
  totalComments: number;
  avgLikesPerComment: number;
  avgRepliesPerComment: number;
  byPlatform: Record<string, { likes: number; replies: number; comments: number }>;
}

export function EngagementStats() {
  const { data: summary, isLoading } = useQuery<EngagementSummary>({
    queryKey: ["/api/engagement/summary"],
    refetchInterval: 60000,
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "instagram": return <SiInstagram className="w-4 h-4" />;
      case "facebook": return <SiFacebook className="w-4 h-4" />;
      case "tiktok": return <SiTiktok className="w-4 h-4" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Engagement Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalComments === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Engagement Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            No engagement data yet. Start posting comments to track engagement.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Engagement Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-muted/50 rounded-lg text-center" data-testid="stat-total-likes">
            <Heart className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">{summary.totalLikes}</p>
            <p className="text-xs text-muted-foreground">Total Likes</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center" data-testid="stat-total-replies">
            <MessageCircle className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{summary.totalReplies}</p>
            <p className="text-xs text-muted-foreground">Total Replies</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center" data-testid="stat-avg-likes">
            <Heart className="w-5 h-5 mx-auto mb-1 text-pink-500" />
            <p className="text-2xl font-bold">{summary.avgLikesPerComment}</p>
            <p className="text-xs text-muted-foreground">Avg Likes/Comment</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center" data-testid="stat-avg-replies">
            <MessageCircle className="w-5 h-5 mx-auto mb-1 text-cyan-500" />
            <p className="text-2xl font-bold">{summary.avgRepliesPerComment}</p>
            <p className="text-xs text-muted-foreground">Avg Replies/Comment</p>
          </div>
        </div>

        {Object.keys(summary.byPlatform).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">By Platform</span>
            </div>
            <div className="space-y-3">
              {Object.entries(summary.byPlatform).map(([platform, stats]) => (
                <div key={platform} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(platform)}
                    <span className="capitalize text-sm">{platform}</span>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant="outline" className="text-xs">
                      <Heart className="w-3 h-3 mr-1 text-red-500" />
                      {stats.likes}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <MessageCircle className="w-3 h-3 mr-1 text-blue-500" />
                      {stats.replies}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {stats.comments} comments
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
