import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Terminal,
  Activity,
  Settings,
  Play,
  Square,
  MessageSquare,
  Shield,
  Clock,
  Zap,
} from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";
import { useState } from "react";

interface BotStatus {
  instagram: boolean;
  facebook: boolean;
  tiktok: boolean;
}

interface SidebarProps {
  onQuickCommand: (cmd: string) => void;
  botStatus: BotStatus;
  uptime: string;
  commandCount: number;
}

export default function Sidebar({ onQuickCommand, botStatus, uptime, commandCount }: SidebarProps) {
  const [selectedPlatform, setSelectedPlatform] = useState("instagram");
  const [commentCount, setCommentCount] = useState("5");

  const quickCommands = [
    { cmd: "help", label: "Help", icon: Terminal },
    { cmd: "status", label: "Status", icon: Activity },
    { cmd: "config", label: "Config", icon: Settings },
    { cmd: "limits", label: "Limits", icon: Shield },
  ];

  const platforms = [
    { id: "instagram", label: "Instagram", icon: SiInstagram, color: "text-pink-500" },
    { id: "facebook", label: "Facebook", icon: SiFacebook, color: "text-blue-500" },
    { id: "tiktok", label: "TikTok", icon: SiTiktok, color: "text-foreground" },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Commands
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {quickCommands.map(({ cmd, label, icon: Icon }) => (
              <Button
                key={cmd}
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                onClick={() => onQuickCommand(cmd)}
                data-testid={`button-quick-${cmd}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Platform Controls
          </h3>
          <div className="space-y-2">
            {platforms.map(({ id, label, icon: Icon, color }) => (
              <div
                key={id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-sm">{label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={botStatus[id as keyof BotStatus] ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {botStatus[id as keyof BotStatus] ? "ON" : "OFF"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() =>
                      onQuickCommand(
                        botStatus[id as keyof BotStatus] ? `stop ${id}` : `start ${id}`
                      )
                    }
                    data-testid={`button-toggle-${id}`}
                  >
                    {botStatus[id as keyof BotStatus] ? (
                      <Square className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Comment Tools
          </h3>
          <div className="space-y-3">
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger data-testid="select-platform">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map(({ id, label }) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="50"
                value={commentCount}
                onChange={(e) => setCommentCount(e.target.value)}
                className="w-20"
                data-testid="input-comment-count"
              />
              <Button
                className="flex-1 gap-2"
                onClick={() => onQuickCommand(`comment ${selectedPlatform} ${commentCount}`)}
                data-testid="button-post-comments"
              >
                <MessageSquare className="h-4 w-4" />
                Post
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => onQuickCommand(`generate ${selectedPlatform}`)}
              data-testid="button-generate"
            >
              <Zap className="h-4 w-4" />
              Generate Samples
            </Button>
          </div>
        </div>

        <Separator />

        <Card className="p-3 bg-muted/30">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            System Stats
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Uptime
              </span>
              <span className="font-mono">{uptime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Terminal className="h-3 w-3" />
                Commands
              </span>
              <span className="font-mono">{commandCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Activity className="h-3 w-3" />
                Status
              </span>
              <Badge variant="outline" className="text-xs bg-primary/20 text-primary">
                Online
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
}
