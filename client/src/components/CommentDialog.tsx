import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Clock, Shield, User, Link, Sparkles, Loader2, Wand2, Plus, X, Target } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import StealthSettings from "./StealthSettings";
import type { StealthSettings as StealthSettingsType } from "@shared/schema";

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: string;
  onSubmit: (config: {
    count: number;
    targetType: "profile" | "post";
    target: string;
    targets?: string[];
    category: string;
    stealthSettings: StealthSettingsType;
    useAI?: boolean;
    postDescription?: string;
  }) => void;
  isSubmitting?: boolean;
}

const categories = [
  { value: "mixed", label: "Mixed (All Categories)" },
  { value: "positive", label: "Positive" },
  { value: "playful", label: "Playful" },
  { value: "sassy", label: "Sassy" },
  { value: "dramatic", label: "Dramatic" },
  { value: "appreciative", label: "Appreciative" },
  { value: "critics", label: "Critics (Medical)" },
];

const defaultStealthSettings: StealthSettingsType = {
  minDelay: 60,
  maxDelay: 180,
  activeHoursStart: 9,
  activeHoursEnd: 22,
  maxCommentsPerHour: 10,
  maxCommentsPerDay: 50,
  randomizeOrder: true,
  pauseOnWeekends: false,
  humanTypingSimulation: true,
};

export default function CommentDialog({
  open,
  onOpenChange,
  platform,
  onSubmit,
  isSubmitting = false,
}: CommentDialogProps) {
  const [count, setCount] = useState(10);
  const [targetType, setTargetType] = useState<"profile" | "post">("profile");
  const [target, setTarget] = useState("");
  const [additionalTargets, setAdditionalTargets] = useState<string[]>([]);
  const [newTarget, setNewTarget] = useState("");
  const [category, setCategory] = useState("mixed");
  const [stealthSettings, setStealthSettings] = useState<StealthSettingsType>(defaultStealthSettings);
  const [useAI, setUseAI] = useState(false);
  const [postDescription, setPostDescription] = useState("");

  const estimatedTime = count * ((stealthSettings.minDelay + stealthSettings.maxDelay) / 2) / 60;
  const hours = Math.floor(estimatedTime / 60);
  const minutes = Math.round(estimatedTime % 60);
  const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const getPlaceholder = () => {
    if (targetType === "profile") {
      if (platform === "Instagram") return "@username";
      if (platform === "Facebook") return "Page or profile name";
      if (platform === "Tiktok") return "@username";
      return "@username";
    } else {
      if (platform === "Instagram") return "https://instagram.com/p/...";
      if (platform === "Facebook") return "https://facebook.com/...";
      if (platform === "Tiktok") return "https://tiktok.com/@user/video/...";
      return "Post URL";
    }
  };

  const addTarget = () => {
    if (!newTarget.trim()) return;
    if (additionalTargets.includes(newTarget.trim())) return;
    setAdditionalTargets([...additionalTargets, newTarget.trim()]);
    setNewTarget("");
  };

  const removeTarget = (index: number) => {
    setAdditionalTargets(additionalTargets.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!target.trim() || isSubmitting) return;
    onSubmit({ 
      count, 
      targetType, 
      target: target.trim(), 
      targets: additionalTargets.length > 0 ? additionalTargets : undefined,
      category, 
      stealthSettings,
      useAI,
      postDescription: useAI ? postDescription : undefined,
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isSubmitting) {
      setTarget("");
      setAdditionalTargets([]);
      setNewTarget("");
    }
    if (!isSubmitting) {
      onOpenChange(isOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Post Comments on {platform}
          </DialogTitle>
          <DialogDescription>
            Configure your stealth commenting campaign
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            <Tabs value={targetType} onValueChange={(v) => setTargetType(v as "profile" | "post")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile" className="flex items-center gap-2" data-testid="tab-profile">
                  <User className="h-4 w-4" />
                  Target Profile
                </TabsTrigger>
                <TabsTrigger value="post" className="flex items-center gap-2" data-testid="tab-post">
                  <Link className="h-4 w-4" />
                  Specific Post
                </TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-target">Primary Profile Username or URL</Label>
                    <Input
                      id="profile-target"
                      placeholder={getPlaceholder()}
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      data-testid="input-target-profile"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comments will be posted on recent posts from this profile
                    </p>
                  </div>
                  
                  <div className="space-y-2 p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-medium">Additional Targets (Optional)</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add more profiles to distribute comments across multiple targets
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder={getPlaceholder()}
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTarget())}
                        data-testid="input-additional-target"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={addTarget}
                        disabled={!newTarget.trim()}
                        data-testid="button-add-target"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {additionalTargets.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {additionalTargets.map((t, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            {t}
                            <button
                              type="button"
                              onClick={() => removeTarget(i)}
                              className="ml-1 rounded-full"
                              data-testid={`button-remove-target-${i}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    {additionalTargets.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {additionalTargets.length + 1} targets total - comments distributed evenly
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="post" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="post-target">Primary Post URL</Label>
                    <Input
                      id="post-target"
                      placeholder={getPlaceholder()}
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      data-testid="input-target-post"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comments will be distributed across this and additional posts
                    </p>
                  </div>
                  
                  <div className="space-y-2 p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-medium">Additional Posts (Optional)</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add more post URLs to distribute comments across multiple posts
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder={getPlaceholder()}
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTarget())}
                        data-testid="input-additional-post"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={addTarget}
                        disabled={!newTarget.trim()}
                        data-testid="button-add-post"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {additionalTargets.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {additionalTargets.map((t, i) => (
                          <Badge key={i} variant="secondary" className="gap-1 max-w-full">
                            <span className="truncate max-w-[200px]">{t}</span>
                            <button
                              type="button"
                              onClick={() => removeTarget(i)}
                              className="ml-1 rounded-full flex-shrink-0"
                              data-testid={`button-remove-post-${i}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    {additionalTargets.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {additionalTargets.length + 1} posts total - comments distributed evenly
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Comment Style
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select comment style" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <div>
                    <Label className="font-medium">AI-Powered Comments</Label>
                    <p className="text-xs text-muted-foreground">
                      Generate unique, context-aware comments using AI
                    </p>
                  </div>
                </div>
                <Switch
                  checked={useAI}
                  onCheckedChange={setUseAI}
                  data-testid="switch-use-ai"
                />
              </div>
              {useAI && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="post-description">Post Context (optional)</Label>
                  <Textarea
                    id="post-description"
                    placeholder="Describe what the post is about for more relevant comments..."
                    value={postDescription}
                    onChange={(e) => setPostDescription(e.target.value)}
                    className="min-h-[60px]"
                    data-testid="input-post-description"
                  />
                  <p className="text-xs text-muted-foreground">
                    AI will generate personalized comments based on this context
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Number of Comments</Label>
                <Badge variant="secondary">{count} comments</Badge>
              </div>
              <Slider
                value={[count]}
                onValueChange={([v]) => setCount(v)}
                min={1}
                max={50}
                step={1}
                data-testid="slider-comment-count"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>25</span>
                <span>50</span>
              </div>
            </div>

            <StealthSettings 
              settings={stealthSettings} 
              onChange={setStealthSettings} 
            />

            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Est. Duration</p>
                  <p className="text-xs text-muted-foreground">{timeString}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Stealth Mode</p>
                  <p className="text-xs text-muted-foreground">Human-like timing</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)} 
            disabled={isSubmitting}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!target.trim() || isSubmitting}
            data-testid="button-start-campaign"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Start Campaign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
