import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import PlatformCard from "@/components/PlatformCard";
import StatsCard from "@/components/StatsCard";
import CommentPreview from "@/components/CommentPreview";
import CommentDialog from "@/components/CommentDialog";
import CampaignQueue from "@/components/CampaignQueue";
import { MessageSquare, Users, TrendingUp, Shield } from "lucide-react";
import type { Campaign, ActivityLog, StealthSettings } from "@shared/schema";

const commentTemplates = {
  positive: [
    "This is absolutely incredible! The attention to detail is amazing",
    "Love everything about this! Keep up the fantastic work",
    "This just made my entire day so much better",
    "Wow, this is exactly what I needed to see today",
    "The creativity here is off the charts!",
  ],
  playful: [
    "Okay but why is this so good though?",
    "Not me saving this immediately...",
    "This has no business being this amazing",
    "Tell me your secrets right now",
    "The talent jumped out!",
  ],
  sassy: [
    "Everyone else can go home now",
    "You really said 'let me show them how it's done'",
    "The bar has officially been raised",
    "Other creators are taking notes rn",
    "Main character energy for real",
  ],
  dramatic: [
    "I literally cannot handle how perfect this is",
    "This changed my whole perspective!",
    "I've watched this like 50 times already",
    "This is the content the internet needs",
    "Obsessed is an understatement",
  ],
  appreciative: [
    "Thank you for sharing this beautiful content!",
    "Your creativity inspires so many people",
    "The effort you put into this really shows",
    "This community is lucky to have creators like you",
    "Genuinely appreciate the quality here",
  ],
  critics: [
    "Is this product even tested and approved?",
    "Where are the clinical trials for this?",
    "Has this been reviewed by medical professionals?",
    "I'd like to see the FDA approval on this",
    "What are the actual ingredients in this product?",
    "Are there any peer-reviewed studies backing this?",
    "This seems like it could have serious side effects",
    "Has anyone verified these health claims?",
    "Where's the scientific evidence for this?",
    "I'm skeptical about the safety of this product",
  ],
};

export default function Home() {
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(true);
  const [platforms, setPlatforms] = useState({
    instagram: { active: false },
    facebook: { active: false },
    tiktok: { active: false },
  });
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [comments, setComments] = useState<{ id: number; text: string; category: string }[]>([]);

  // Fetch campaigns
  const { data: campaigns = [], refetch: refetchCampaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  // Fetch activities
  const { data: activities = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activities"],
    refetchInterval: 5000,
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: {
      platform: string;
      targetType: string;
      target: string;
      targets?: string[];
      category: string;
      totalComments: number;
      stealthSettings: StealthSettings;
      useAI?: boolean;
      postDescription?: string;
    }) => {
      const response = await apiRequest("POST", "/api/campaigns", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setCommentDialogOpen(false);
      toast({
        title: "Campaign Created",
        description: "Your stealth campaign is now running",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  // Pause campaign mutation
  const pauseCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/campaigns/${id}/pause`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Campaign Paused" });
    },
  });

  // Resume campaign mutation
  const resumeCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/campaigns/${id}/resume`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Campaign Resumed" });
    },
  });

  // Cancel campaign mutation
  const cancelCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/campaigns/${id}/cancel`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Campaign Cancelled" });
    },
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    generateComments();
  }, []);

  const generateComments = () => {
    const categories = Object.keys(commentTemplates) as (keyof typeof commentTemplates)[];
    const newComments = [];
    for (let i = 0; i < 5; i++) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const templates = commentTemplates[cat];
      const text = templates[Math.floor(Math.random() * templates.length)];
      newComments.push({ id: Date.now() + i, text, category: cat });
    }
    setComments(newComments);
  };

  const togglePlatform = (platform: keyof typeof platforms) => {
    const newState = !platforms[platform].active;
    setPlatforms((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], active: newState },
    }));

    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    toast({
      title: newState ? `${platformName} Activated` : `${platformName} Deactivated`,
      description: newState
        ? "Bot is now active and ready"
        : "Bot has been stopped",
    });
  };

  const openCommentDialog = (platform: string) => {
    setSelectedPlatform(platform);
    setCommentDialogOpen(true);
  };

  const handlePostComments = (config: {
    count: number;
    targetType: "profile" | "post";
    target: string;
    targets?: string[];
    category: string;
    stealthSettings: StealthSettings;
    useAI?: boolean;
    postDescription?: string;
  }) => {
    createCampaignMutation.mutate({
      platform: selectedPlatform.toLowerCase(),
      targetType: config.targetType,
      target: config.target,
      targets: config.targets,
      category: config.category,
      totalComments: config.count,
      stealthSettings: config.stealthSettings,
      useAI: config.useAI,
      postDescription: config.postDescription,
    });
  };

  const handleGenerateSamples = (platform: string) => {
    generateComments();
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    toast({
      title: "Comments Generated",
      description: `New ${platformName} comment templates ready`,
    });
  };

  // Calculate stats from campaigns
  const activeCampaignCount = campaigns.filter(c => c.status === "running").length;
  const totalComments = campaigns.reduce((sum, c) => sum + c.completedComments, 0);
  const activePlatforms = Object.values(platforms).filter((p) => p.active).length;
  
  // Get comments today for each platform
  const getCommentsToday = (platform: string) => {
    return campaigns
      .filter(c => c.platform === platform)
      .reduce((sum, c) => sum + c.completedComments, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        activePlatforms={activeCampaignCount}
      />

      <main className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Comments"
            value={totalComments}
            subtitle="All time"
            icon={<MessageSquare className="h-5 w-5" />}
            trend="up"
            trendValue="+12%"
          />
          <StatsCard
            title="Active Campaigns"
            value={activeCampaignCount}
            subtitle="Currently running"
            icon={<Users className="h-5 w-5" />}
          />
          <StatsCard
            title="Success Rate"
            value="98%"
            subtitle="Last 24 hours"
            icon={<TrendingUp className="h-5 w-5" />}
            trend="up"
            trendValue="+2%"
          />
          <StatsCard
            title="Stealth Status"
            value="Active"
            subtitle="Human-like timing"
            icon={<Shield className="h-5 w-5" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <PlatformCard
            platform="instagram"
            isActive={platforms.instagram.active}
            onToggle={() => togglePlatform("instagram")}
            commentsToday={getCommentsToday("instagram")}
            dailyLimit={150}
            onPostComments={() => openCommentDialog("instagram")}
            onGenerateSamples={() => handleGenerateSamples("instagram")}
          />
          <PlatformCard
            platform="facebook"
            isActive={platforms.facebook.active}
            onToggle={() => togglePlatform("facebook")}
            commentsToday={getCommentsToday("facebook")}
            dailyLimit={150}
            onPostComments={() => openCommentDialog("facebook")}
            onGenerateSamples={() => handleGenerateSamples("facebook")}
          />
          <PlatformCard
            platform="tiktok"
            isActive={platforms.tiktok.active}
            onToggle={() => togglePlatform("tiktok")}
            commentsToday={getCommentsToday("tiktok")}
            dailyLimit={100}
            onPostComments={() => openCommentDialog("tiktok")}
            onGenerateSamples={() => handleGenerateSamples("tiktok")}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96">
            <CampaignQueue
              campaigns={campaigns}
              onPause={(id) => pauseCampaignMutation.mutate(id)}
              onResume={(id) => resumeCampaignMutation.mutate(id)}
              onCancel={(id) => cancelCampaignMutation.mutate(id)}
            />
          </div>
          <div className="h-96">
            <CommentPreview
              comments={comments}
              onRefresh={generateComments}
            />
          </div>
        </div>
      </main>

      <CommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        platform={selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
        onSubmit={handlePostComments}
        isSubmitting={createCampaignMutation.isPending}
      />
    </div>
  );
}
