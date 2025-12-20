import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  X, 
  Clock, 
  Target, 
  MessageSquare,
  Calendar,
  Shield
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Campaign } from "@shared/schema";

interface CampaignQueueProps {
  campaigns: Campaign[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  isLoading?: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  queued: { label: "Queued", color: "bg-yellow-500/20 text-yellow-400" },
  running: { label: "Running", color: "bg-green-500/20 text-green-400" },
  paused: { label: "Paused", color: "bg-orange-500/20 text-orange-400" },
  completed: { label: "Completed", color: "bg-blue-500/20 text-blue-400" },
  failed: { label: "Failed", color: "bg-red-500/20 text-red-400" },
};

const platformColors: Record<string, string> = {
  instagram: "bg-pink-500/20 text-pink-400",
  facebook: "bg-blue-500/20 text-blue-400",
  tiktok: "bg-purple-500/20 text-purple-400",
};

export default function CampaignQueue({
  campaigns,
  onPause,
  onResume,
  onCancel,
  isLoading,
}: CampaignQueueProps) {
  const activeCampaigns = campaigns.filter(c => ["queued", "running", "paused"].includes(c.status));
  const recentCampaigns = campaigns.filter(c => ["completed", "failed"].includes(c.status)).slice(0, 5);

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Stealth Campaign Queue
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeCampaigns.length} active campaigns
          </p>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No campaigns yet</p>
              <p className="text-sm">Create a campaign to get started</p>
            </div>
          ) : (
            <>
              {activeCampaigns.map((campaign) => (
                <CampaignItem
                  key={campaign.id}
                  campaign={campaign}
                  onPause={onPause}
                  onResume={onResume}
                  onCancel={onCancel}
                />
              ))}
              
              {recentCampaigns.length > 0 && activeCampaigns.length > 0 && (
                <div className="border-t border-border pt-4 mt-4">
                  <p className="text-xs text-muted-foreground mb-3">Recent Campaigns</p>
                </div>
              )}
              
              {recentCampaigns.map((campaign) => (
                <CampaignItem
                  key={campaign.id}
                  campaign={campaign}
                  onPause={onPause}
                  onResume={onResume}
                  onCancel={onCancel}
                  compact
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

function CampaignItem({
  campaign,
  onPause,
  onResume,
  onCancel,
  compact = false,
}: {
  campaign: Campaign;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  compact?: boolean;
}) {
  const progress = campaign.totalComments > 0 
    ? (campaign.completedComments / campaign.totalComments) * 100 
    : 0;
  
  const status = statusConfig[campaign.status] || statusConfig.queued;
  const platformColor = platformColors[campaign.platform.toLowerCase()] || "";
  
  const isActive = ["queued", "running", "paused"].includes(campaign.status);

  return (
    <div className={`p-3 rounded-lg bg-muted/30 space-y-3 ${compact ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={platformColor}>
            {campaign.platform}
          </Badge>
          <Badge variant="outline" className={status.color}>
            {status.label}
          </Badge>
        </div>
        
        {isActive && !compact && (
          <div className="flex items-center gap-1">
            {campaign.status === "running" ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onPause(campaign.id)}
                data-testid={`button-pause-${campaign.id}`}
              >
                <Pause className="h-4 w-4" />
              </Button>
            ) : campaign.status === "paused" ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onResume(campaign.id)}
                data-testid={`button-resume-${campaign.id}`}
              >
                <Play className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => onCancel(campaign.id)}
              data-testid={`button-cancel-${campaign.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <Target className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate">{campaign.target}</span>
        {campaign.targets && campaign.targets.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            +{campaign.targets.length} more
          </Badge>
        )}
      </div>
      
      {!compact && (
        <>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span>{campaign.completedComments} / {campaign.totalComments}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {campaign.nextCommentAt && campaign.status === "running" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Next comment {formatDistanceToNow(new Date(campaign.nextCommentAt), { addSuffix: true })}
              </span>
            </div>
          )}
          
          {campaign.createdAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
