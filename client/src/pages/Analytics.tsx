import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Campaign } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { MessageSquare, TrendingUp, Users, Activity, Target, CheckCircle, Zap, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EngagementStats } from "@/components/EngagementStats";
import { WarmupProgressCard } from "@/components/WarmupProgressCard";

interface AnalyticsData {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalComments: number;
  successRate: number;
  platformStats: {
    instagram: number;
    facebook: number;
    tiktok: number;
  };
  dailyActivity: {
    date: string;
    comments: number;
    success: number;
    errors: number;
  }[];
  healthDistribution: {
    range: string;
    count: number;
  }[];
  categoryStats: Record<string, number>;
  totalAccounts: number;
  activeAccounts: number;
}

const PLATFORM_COLORS = {
  instagram: "hsl(var(--chart-1))",
  facebook: "hsl(var(--chart-2))",
  tiktok: "hsl(var(--chart-3))",
};

const HEALTH_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

const chartConfig = {
  comments: { label: "Comments", color: "hsl(var(--chart-1))" },
  success: { label: "Success", color: "hsl(var(--chart-1))" },
  errors: { label: "Errors", color: "hsl(var(--chart-4))" },
  instagram: { label: "Instagram", color: "hsl(var(--chart-1))" },
  facebook: { label: "Facebook", color: "hsl(var(--chart-2))" },
  tiktok: { label: "TikTok", color: "hsl(var(--chart-3))" },
};

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  testId
}: { 
  title: string; 
  value: string | number; 
  subtitle: string; 
  icon: typeof MessageSquare;
  trend?: "up" | "down" | "neutral";
  testId: string;
}) {
  return (
    <Card data-testid={`card-stat-${testId}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`text-value-${testId}`}>{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [darkMode, setDarkMode] = useState(true);
  
  const { data: analytics, isLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/overview"],
    refetchInterval: 30000,
  });
  
  const exportCSV = () => {
    if (!analytics) return;
    
    const rows = [
      ["Metric", "Value"],
      ["Total Campaigns", analytics.totalCampaigns.toString()],
      ["Active Campaigns", analytics.activeCampaigns.toString()],
      ["Completed Campaigns", analytics.completedCampaigns.toString()],
      ["Total Comments", analytics.totalComments.toString()],
      ["Success Rate", `${analytics.successRate}%`],
      ["Instagram Comments", analytics.platformStats.instagram.toString()],
      ["Facebook Comments", analytics.platformStats.facebook.toString()],
      ["TikTok Comments", analytics.platformStats.tiktok.toString()],
      ["Total Accounts", analytics.totalAccounts.toString()],
      ["Active Accounts", analytics.activeAccounts.toString()],
    ];
    
    // Add category breakdown
    rows.push(["", ""]);
    rows.push(["Category Breakdown", ""]);
    Object.entries(analytics.categoryStats).forEach(([cat, count]) => {
      rows.push([cat, count.toString()]);
    });
    
    const csvContent = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });
  
  const activeCampaignCount = campaigns.filter(c => c.status === "running").length;

  const platformData = analytics ? [
    { name: "Instagram", value: analytics.platformStats.instagram, fill: PLATFORM_COLORS.instagram },
    { name: "Facebook", value: analytics.platformStats.facebook, fill: PLATFORM_COLORS.facebook },
    { name: "TikTok", value: analytics.platformStats.tiktok, fill: PLATFORM_COLORS.tiktok },
  ].filter(d => d.value > 0) : [];

  const categoryData = analytics ? Object.entries(analytics.categoryStats).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  })).filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-background">
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        activePlatforms={activeCampaignCount}
      />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Track your campaign performance and account health
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-analytics">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : analytics ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Comments"
                value={analytics.totalComments.toLocaleString()}
                subtitle="Posted across all campaigns"
                icon={MessageSquare}
                trend="up"
                testId="total-comments"
              />
              <StatCard
                title="Success Rate"
                value={`${analytics.successRate}%`}
                subtitle="Comment delivery rate"
                icon={CheckCircle}
                testId="success-rate"
              />
              <StatCard
                title="Active Campaigns"
                value={analytics.activeCampaigns}
                subtitle={`${analytics.completedCampaigns} completed`}
                icon={Target}
                testId="active-campaigns"
              />
              <StatCard
                title="Active Accounts"
                value={analytics.activeAccounts}
                subtitle={`${analytics.totalAccounts} total accounts`}
                icon={Users}
                testId="active-accounts"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card data-testid="card-daily-activity">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Daily Activity
                  </CardTitle>
                  <CardDescription>Comments posted over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[250px]">
                    <BarChart data={analytics.dailyActivity}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="success" name="Success" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="errors" name="Errors" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card data-testid="card-platform-distribution">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Platform Distribution
                  </CardTitle>
                  <CardDescription>Comments by social media platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {platformData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[250px]">
                      <PieChart>
                        <Pie
                          data={platformData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {platformData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground" data-testid="text-empty-platform">
                      No platform data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card data-testid="card-account-health">
                <CardHeader>
                  <CardTitle>Account Health Distribution</CardTitle>
                  <CardDescription>Health scores across all accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.healthDistribution.some(h => h.count > 0) ? (
                    <ChartContainer config={chartConfig} className="h-[200px]">
                      <BarChart data={analytics.healthDistribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="range" type="category" className="text-xs" width={60} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" name="Accounts" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground" data-testid="text-empty-accounts">
                      No accounts added yet
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-comment-categories">
                <CardHeader>
                  <CardTitle>Comment Categories</CardTitle>
                  <CardDescription>Distribution of comment styles used</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <div className="space-y-3">
                      {categoryData.map((cat, i) => (
                        <div key={cat.name} className="flex items-center justify-between" data-testid={`row-category-${cat.name.toLowerCase()}`}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-sm" 
                              style={{ backgroundColor: HEALTH_COLORS[i % HEALTH_COLORS.length] }}
                            />
                            <span className="text-sm">{cat.name}</span>
                          </div>
                          <Badge variant="secondary" data-testid={`text-category-count-${cat.name.toLowerCase()}`}>{cat.value}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground" data-testid="text-empty-categories">
                      No category data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-campaign-overview">
              <CardHeader>
                <CardTitle>Campaign Overview</CardTitle>
                <CardDescription>Summary of all campaign activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold" data-testid="text-overview-total-campaigns">{analytics.totalCampaigns}</div>
                    <div className="text-xs text-muted-foreground">Total Campaigns</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-overview-completed">{analytics.completedCampaigns}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-blue-600" data-testid="text-overview-running">{analytics.activeCampaigns}</div>
                    <div className="text-xs text-muted-foreground">Running</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold" data-testid="text-overview-total-comments">{analytics.totalComments}</div>
                    <div className="text-xs text-muted-foreground">Total Comments</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EngagementStats />
              <WarmupProgressCard />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground" data-testid="text-analytics-error">
            Failed to load analytics data
          </div>
        )}
      </main>
    </div>
  );
}
