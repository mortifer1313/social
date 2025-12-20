import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye, RefreshCw, Users, ExternalLink } from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";
import type { Competitor, CompetitorPost } from "@shared/schema";

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: SiInstagram },
  { value: "facebook", label: "Facebook", icon: SiFacebook },
  { value: "tiktok", label: "TikTok", icon: SiTiktok },
];

const CATEGORIES = [
  { value: "mixed", label: "Mixed" },
  { value: "positive", label: "Positive" },
  { value: "playful", label: "Playful" },
  { value: "sassy", label: "Sassy" },
  { value: "dramatic", label: "Dramatic" },
  { value: "appreciative", label: "Appreciative" },
];

interface CompetitorWithPosts extends Competitor {
  posts?: CompetitorPost[];
}

export default function Competitors() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorWithPosts | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>("all");

  const [formData, setFormData] = useState({
    platform: "instagram",
    username: "",
    displayName: "",
    profileUrl: "",
    isActive: true,
    checkInterval: 60,
    autoEngage: false,
    engageCategory: "mixed",
  });

  const { data: competitors = [], isLoading } = useQuery<Competitor[]>({
    queryKey: ["/api/competitors", filterPlatform],
    queryFn: () => fetch(`/api/competitors${filterPlatform && filterPlatform !== "all" ? `?platform=${filterPlatform}` : ""}`).then(r => r.json()),
  });

  const { data: competitorDetails } = useQuery<CompetitorWithPosts>({
    queryKey: ["/api/competitors", selectedCompetitor?.id],
    queryFn: () => fetch(`/api/competitors/${selectedCompetitor?.id}`).then(r => r.json()),
    enabled: !!selectedCompetitor?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/competitors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Competitor added for monitoring" });
    },
    onError: () => {
      toast({ title: "Failed to add competitor", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Competitor> }) =>
      apiRequest("PATCH", `/api/competitors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      toast({ title: "Competitor updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/competitors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      setSelectedCompetitor(null);
      toast({ title: "Competitor removed" });
    },
  });

  const resetForm = () => {
    setFormData({
      platform: "instagram",
      username: "",
      displayName: "",
      profileUrl: "",
      isActive: true,
      checkInterval: 60,
      autoEngage: false,
      engageCategory: "mixed",
    });
  };

  const getPlatformIcon = (platform: string) => {
    const p = PLATFORMS.find(pl => pl.value === platform);
    return p ? <p.icon className="w-4 h-4" /> : null;
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Competitor Monitoring</h1>
          <p className="text-muted-foreground">Track competitor accounts for engagement opportunities</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-40" data-testid="select-filter-platform">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {PLATFORMS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-competitor">
                <Plus className="w-4 h-4 mr-2" />
                Add Competitor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Competitor to Monitor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Platform</label>
                  <Select value={formData.platform} onValueChange={v => setFormData({ ...formData, platform: v })}>
                    <SelectTrigger data-testid="select-competitor-platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    placeholder="@username"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    data-testid="input-competitor-username"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Display Name (Optional)</label>
                  <Input
                    placeholder="Brand Name"
                    value={formData.displayName}
                    onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                    data-testid="input-competitor-display-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Profile URL (Optional)</label>
                  <Input
                    placeholder="https://instagram.com/username"
                    value={formData.profileUrl}
                    onChange={e => setFormData({ ...formData, profileUrl: e.target.value })}
                    data-testid="input-competitor-url"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Check Interval (minutes)</label>
                  <Input
                    type="number"
                    min={15}
                    max={1440}
                    value={formData.checkInterval}
                    onChange={e => setFormData({ ...formData, checkInterval: parseInt(e.target.value) || 60 })}
                    data-testid="input-check-interval"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Auto-Engage on New Posts</label>
                    <p className="text-xs text-muted-foreground">Automatically create campaigns for new posts</p>
                  </div>
                  <Switch
                    checked={formData.autoEngage}
                    onCheckedChange={v => setFormData({ ...formData, autoEngage: v })}
                    data-testid="switch-auto-engage"
                  />
                </div>
                {formData.autoEngage && (
                  <div>
                    <label className="text-sm font-medium">Engagement Category</label>
                    <Select value={formData.engageCategory} onValueChange={v => setFormData({ ...formData, engageCategory: v })}>
                      <SelectTrigger data-testid="select-engage-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createMutation.mutate(formData)}
                    disabled={!formData.username.trim()}
                    data-testid="button-save-competitor"
                  >
                    Add Competitor
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="py-4">
                    <div className="h-12 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : competitors.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Competitors Yet</h3>
                <p className="text-muted-foreground mb-4">Add competitors to monitor their posts and engagement</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Competitor
                </Button>
              </CardContent>
            </Card>
          ) : (
            competitors.map(competitor => (
              <Card
                key={competitor.id}
                className={`cursor-pointer transition-colors ${selectedCompetitor?.id === competitor.id ? "ring-2 ring-primary" : ""} ${!competitor.isActive ? "opacity-60" : ""}`}
                onClick={() => setSelectedCompetitor(competitor)}
                data-testid={`card-competitor-${competitor.id}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        {getPlatformIcon(competitor.platform)}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          @{competitor.username}
                          {competitor.profileUrl && (
                            <a
                              href={competitor.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            </a>
                          )}
                        </div>
                        {competitor.displayName && (
                          <p className="text-sm text-muted-foreground">{competitor.displayName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{competitor.postsTracked} posts</Badge>
                      {competitor.autoEngage && (
                        <Badge variant="secondary">Auto-engage</Badge>
                      )}
                      <Switch
                        checked={competitor.isActive}
                        onCheckedChange={v => {
                          updateMutation.mutate({ id: competitor.id, data: { isActive: v } });
                        }}
                        onClick={e => e.stopPropagation()}
                        data-testid={`switch-active-${competitor.id}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Last checked: {formatDate(competitor.lastCheckedAt)}</span>
                    <span>Last post: {formatDate(competitor.lastPostAt)}</span>
                    <span>Interval: {competitor.checkInterval}min</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Competitor Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCompetitor ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      {getPlatformIcon(selectedCompetitor.platform)}
                    </div>
                    <div>
                      <p className="font-medium">@{selectedCompetitor.username}</p>
                      {selectedCompetitor.displayName && (
                        <p className="text-sm text-muted-foreground">{selectedCompetitor.displayName}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground">Posts Tracked</p>
                      <p className="font-medium">{selectedCompetitor.postsTracked}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground">Check Interval</p>
                      <p className="font-medium">{selectedCompetitor.checkInterval}m</p>
                    </div>
                  </div>
                  {competitorDetails?.posts && competitorDetails.posts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Recent Posts</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {competitorDetails.posts.slice(0, 5).map(post => (
                          <div key={post.id} className="p-2 bg-muted rounded text-xs">
                            <div className="flex justify-between">
                              <Badge variant="outline">{post.postType || "post"}</Badge>
                              {post.hasEngaged && <Badge variant="secondary">Engaged</Badge>}
                            </div>
                            {post.caption && (
                              <p className="mt-1 truncate">{post.caption}</p>
                            )}
                            <p className="text-muted-foreground mt-1">
                              {formatDate(post.discoveredAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Check Now
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(selectedCompetitor.id)}
                      data-testid="button-delete-competitor"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Select a competitor to view details
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
