import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  AlertTriangle, 
  Activity, 
  Moon, 
  Zap, 
  Ban,
  RefreshCw,
  Trash2,
  ArrowLeft,
  Shield,
  Clock,
  TrendingUp,
  Key,
  KeyRound,
  LogOut,
  Upload,
  Download,
  FileSpreadsheet
} from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";
import type { SocialAccount } from "@shared/schema";
import SessionHealthMonitor from "@/components/SessionHealthMonitor";

const platformIcons: Record<string, typeof SiInstagram> = {
  instagram: SiInstagram,
  facebook: SiFacebook,
  tiktok: SiTiktok,
};

function getWarmupProgress(account: SocialAccount): { days: number; daysRemaining: number; percentage: number } {
  if (!account.warmupStartedAt) {
    return { days: 0, daysRemaining: 21, percentage: 0 };
  }
  const startDate = new Date(account.warmupStartedAt);
  const daysSince = Math.floor((Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const daysRemaining = Math.max(0, 21 - daysSince);
  const percentage = Math.min(100, Math.round((daysSince / 21) * 100));
  return { days: daysSince, daysRemaining, percentage };
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  warming: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  resting: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  suspended: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  banned: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function Accounts() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [showWarningAcknowledged, setShowWarningAcknowledged] = useState(false);
  const [newAccount, setNewAccount] = useState({
    platform: "instagram",
    username: "",
    displayName: "",
    credentialKey: "",
    proxyHost: "",
    proxyPort: "",
    proxyUsername: "",
    proxyPassword: "",
  });
  const { toast } = useToast();

  const { data: accounts = [], isLoading } = useQuery<SocialAccount[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: metrics } = useQuery<{
    total: number;
    byPlatform: { instagram: number; facebook: number; tiktok: number };
    byStatus: { active: number; warming: number; resting: number; suspended: number; banned: number };
    averageHealthScore: number;
    totalCommentsToday: number;
  }>({
    queryKey: ["/api/accounts/metrics/summary"],
  });

  const { data: sessionStatuses = {} } = useQuery<Record<string, { hasSession: boolean; isValid: boolean; expiresAt: string | null }>>({
    queryKey: ["/api/sessions/status"],
  });

  const clearSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/accounts/${id}/session`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/status"] });
      toast({ title: "Session cleared" });
    },
    onError: () => {
      toast({ title: "Failed to clear session", variant: "destructive" });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: typeof newAccount) => {
      const payload = {
        ...data,
        proxyPort: data.proxyPort ? parseInt(data.proxyPort, 10) : null,
        proxyHost: data.proxyHost || null,
        proxyUsername: data.proxyUsername || null,
        proxyPassword: data.proxyPassword || null,
      };
      return apiRequest("POST", "/api/accounts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/metrics/summary"] });
      setShowAddDialog(false);
      setNewAccount({ platform: "instagram", username: "", displayName: "", credentialKey: "", proxyHost: "", proxyPort: "", proxyUsername: "", proxyPassword: "" });
      toast({ title: "Account added", description: "The account has been registered successfully." });
    },
    onError: () => {
      toast({ title: "Failed to add account", variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/metrics/summary"] });
      toast({ title: "Account removed" });
    },
  });

  const restAccountMutation = useMutation({
    mutationFn: async ({ id, hours }: { id: string; hours: number }) => {
      return apiRequest("POST", `/api/accounts/${id}/rest`, { hours });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "Account set to rest" });
    },
  });

  const warmupAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/accounts/${id}/warmup`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "Warmup started" });
    },
  });

  const bulkWarmupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/accounts/warmup-all");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/metrics/summary"] });
      toast({ title: `Started warmup for ${data.count} accounts` });
    },
    onError: () => {
      toast({ title: "Failed to start bulk warmup", variant: "destructive" });
    },
  });

  const importCsvMutation = useMutation({
    mutationFn: async (data: string) => {
      return apiRequest("POST", "/api/accounts/import-csv", { csvData: data });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/metrics/summary"] });
      setImportResult(data);
      if (data.imported > 0) {
        toast({ title: `Imported ${data.imported} accounts`, description: data.skipped > 0 ? `${data.skipped} skipped` : undefined });
      }
    },
    onError: () => {
      toast({ title: "Failed to import accounts", variant: "destructive" });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvData(text);
      };
      reader.readAsText(file);
    }
  };

  const downloadTemplate = () => {
    const template = `platform,username,credentialKey,displayName,proxyHost,proxyPort,proxyUsername,proxyPassword
instagram,user1@email.com,IG_USER1_PASSWORD,My Account 1,proxy.example.com,8080,proxyuser,proxypass
facebook,user2@email.com,FB_USER2_PASSWORD,My Account 2,,,, 
tiktok,user3@email.com,TT_USER3_PASSWORD,My Account 3,,,,`;
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "accounts_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!showWarningAcknowledged) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Important Legal Notice</AlertTitle>
            <AlertDescription className="mt-4 space-y-4">
              <p>
                Automated commenting on Instagram, Facebook, and TikTok violates their Terms of Service. 
                Using this feature may result in:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Permanent account bans</li>
                <li>IP address blocks</li>
                <li>Legal action from the platforms</li>
                <li>Loss of account data and followers</li>
              </ul>
              <p className="font-medium">
                This tool is for educational and research purposes only. You are solely responsible 
                for any consequences of using this system.
              </p>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Acknowledgement Required
              </CardTitle>
              <CardDescription>
                Please confirm you understand the risks before proceeding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted rounded-md">
                <input 
                  type="checkbox" 
                  id="acknowledge" 
                  className="mt-1"
                  data-testid="checkbox-acknowledge"
                />
                <label htmlFor="acknowledge" className="text-sm text-muted-foreground">
                  I understand that using automated tools on social media platforms violates their Terms of Service 
                  and accept all responsibility for any consequences including account bans, legal issues, or other penalties.
                </label>
              </div>
              <Button 
                onClick={() => setShowWarningAcknowledged(true)}
                className="w-full"
                data-testid="button-proceed-accounts"
              >
                I Understand, Proceed to Account Management
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Account Management</h1>
              <p className="text-muted-foreground">Manage your social media accounts for automation</p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline"
              onClick={() => bulkWarmupMutation.mutate()}
              disabled={bulkWarmupMutation.isPending}
              data-testid="button-warmup-all"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {bulkWarmupMutation.isPending ? "Starting..." : "Warmup All"}
            </Button>
            <Dialog open={showImportDialog} onOpenChange={(open) => {
              setShowImportDialog(open);
              if (!open) {
                setCsvData("");
                setImportResult(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-import-csv">
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Bulk Import Accounts
                  </DialogTitle>
                  <DialogDescription>
                    Import multiple accounts at once from a CSV file.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={downloadTemplate} data-testid="button-download-template">
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <Label htmlFor="csv-file" className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload File
                        </span>
                      </Button>
                    </Label>
                    <input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      data-testid="input-csv-file"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CSV Data</Label>
                    <Textarea
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="platform,username,credentialKey,displayName,proxyHost,proxyPort,proxyUsername,proxyPassword
instagram,user@email.com,SECRET_KEY,Display Name,,,,"
                      className="font-mono text-sm min-h-[200px]"
                      data-testid="textarea-csv-data"
                    />
                    <p className="text-xs text-muted-foreground">
                      Required columns: platform, username, credentialKey. Optional: displayName, proxyHost, proxyPort, proxyUsername, proxyPassword
                    </p>
                  </div>
                  {importResult && (
                    <Alert variant={importResult.errors.length > 0 ? "destructive" : "default"}>
                      <AlertTitle>Import Results</AlertTitle>
                      <AlertDescription>
                        <div className="space-y-1">
                          <p>Imported: {importResult.imported} accounts</p>
                          {importResult.skipped > 0 && <p>Skipped: {importResult.skipped} (duplicates)</p>}
                          {importResult.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium">Errors:</p>
                              <ul className="list-disc list-inside text-sm">
                                {importResult.errors.slice(0, 5).map((err, i) => (
                                  <li key={i}>{err}</li>
                                ))}
                                {importResult.errors.length > 5 && (
                                  <li>...and {importResult.errors.length - 5} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => importCsvMutation.mutate(csvData)}
                    disabled={!csvData.trim() || importCsvMutation.isPending}
                    data-testid="button-confirm-import"
                  >
                    {importCsvMutation.isPending ? "Importing..." : "Import Accounts"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-account">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Account
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Social Media Account</DialogTitle>
                <DialogDescription>
                  Register an account for automation. Credentials are stored securely.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select 
                    value={newAccount.platform} 
                    onValueChange={(v) => setNewAccount(p => ({ ...p, platform: v }))}
                  >
                    <SelectTrigger data-testid="select-platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Username / Email</Label>
                  <Input 
                    value={newAccount.username}
                    onChange={(e) => setNewAccount(p => ({ ...p, username: e.target.value }))}
                    placeholder="account@example.com"
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Name (optional)</Label>
                  <Input 
                    value={newAccount.displayName}
                    onChange={(e) => setNewAccount(p => ({ ...p, displayName: e.target.value }))}
                    placeholder="My Account 1"
                    data-testid="input-display-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Credential Key</Label>
                  <Input 
                    value={newAccount.credentialKey}
                    onChange={(e) => setNewAccount(p => ({ ...p, credentialKey: e.target.value }))}
                    placeholder="IG_ACCOUNT_1_PASSWORD"
                    data-testid="input-credential-key"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the name of the secret that stores the password. 
                    Add it in the Secrets tab as: {newAccount.credentialKey || "SECRET_NAME"}
                  </p>
                </div>
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium">Proxy Settings (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-3">Configure a proxy for IP rotation</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      value={newAccount.proxyHost}
                      onChange={(e) => setNewAccount(p => ({ ...p, proxyHost: e.target.value }))}
                      placeholder="Proxy Host"
                      data-testid="input-proxy-host"
                    />
                    <Input 
                      value={newAccount.proxyPort}
                      onChange={(e) => setNewAccount(p => ({ ...p, proxyPort: e.target.value }))}
                      placeholder="Port"
                      data-testid="input-proxy-port"
                    />
                    <Input 
                      value={newAccount.proxyUsername}
                      onChange={(e) => setNewAccount(p => ({ ...p, proxyUsername: e.target.value }))}
                      placeholder="Username (optional)"
                      data-testid="input-proxy-username"
                    />
                    <Input 
                      value={newAccount.proxyPassword}
                      onChange={(e) => setNewAccount(p => ({ ...p, proxyPassword: e.target.value }))}
                      placeholder="Password (optional)"
                      data-testid="input-proxy-password"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createAccountMutation.mutate(newAccount)}
                  disabled={!newAccount.username || !newAccount.credentialKey || createAccountMutation.isPending}
                  data-testid="button-confirm-add-account"
                >
                  {createAccountMutation.isPending ? "Adding..." : "Add Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-3">
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{metrics.total}</div>
                    <div className="text-sm text-muted-foreground">Total Accounts</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-500">{metrics.byStatus?.active || 0}</div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-500">{metrics.byStatus?.warming || 0}</div>
                    <div className="text-sm text-muted-foreground">Warming Up</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{metrics.averageHealthScore || 100}%</div>
                    <div className="text-sm text-muted-foreground">Avg Health Score</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          <SessionHealthMonitor />
        </div>

        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all" data-testid="tab-all">All Accounts</TabsTrigger>
            <TabsTrigger value="instagram" data-testid="tab-instagram">Instagram</TabsTrigger>
            <TabsTrigger value="facebook" data-testid="tab-facebook">Facebook</TabsTrigger>
            <TabsTrigger value="tiktok" data-testid="tab-tiktok">TikTok</TabsTrigger>
          </TabsList>

          {["all", "instagram", "facebook", "tiktok"].map(tabValue => (
            <TabsContent key={tabValue} value={tabValue}>
              <ScrollArea className="h-[600px]">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
                ) : (
                  <div className="grid gap-4">
                    {accounts
                      .filter(a => tabValue === "all" || a.platform === tabValue)
                      .map(account => {
                        const PlatformIcon = platformIcons[account.platform] || Activity;
                        const sessionStatus = sessionStatuses[account.id];
                        return (
                          <Card key={account.id} data-testid={`card-account-${account.id}`}>
                            <CardContent className="py-4">
                              <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                    <PlatformIcon className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{account.displayName || account.username}</div>
                                    <div className="text-sm text-muted-foreground">@{account.username}</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 flex-wrap">
                                  <Badge variant="outline" className={statusColors[account.status]}>
                                    {account.status === "active" && <Zap className="w-3 h-3 mr-1" />}
                                    {account.status === "warming" && <TrendingUp className="w-3 h-3 mr-1" />}
                                    {account.status === "resting" && <Moon className="w-3 h-3 mr-1" />}
                                    {account.status === "banned" && <Ban className="w-3 h-3 mr-1" />}
                                    {account.status}
                                  </Badge>
                                  
                                  {sessionStatus?.hasSession ? (
                                    <Badge 
                                      variant="outline" 
                                      className={sessionStatus.isValid 
                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                        : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                      }
                                      data-testid={`badge-session-${account.id}`}
                                    >
                                      {sessionStatus.isValid ? (
                                        <><Key className="w-3 h-3 mr-1" />Session Active</>
                                      ) : (
                                        <><KeyRound className="w-3 h-3 mr-1" />Session Expired</>
                                      )}
                                    </Badge>
                                  ) : (
                                    <Badge 
                                      variant="outline" 
                                      className="bg-muted text-muted-foreground border-muted"
                                      data-testid={`badge-session-${account.id}`}
                                    >
                                      <KeyRound className="w-3 h-3 mr-1" />No Session
                                    </Badge>
                                  )}
                                  
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    Level {account.warmupLevel}/5
                                  </div>
                                  
                                  <div className="w-20">
                                    <Progress value={account.healthScore} className="h-2" />
                                    <div className="text-xs text-center text-muted-foreground mt-1">
                                      {account.healthScore}% health
                                    </div>
                                  </div>

                                  <div className="text-sm text-muted-foreground">
                                    {account.commentsToday}/{account.totalComments} today/total
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => warmupAccountMutation.mutate(account.id)}
                                      disabled={account.status === "warming"}
                                      data-testid={`button-warmup-${account.id}`}
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => restAccountMutation.mutate({ id: account.id, hours: 24 })}
                                      disabled={account.status === "resting"}
                                      data-testid={`button-rest-${account.id}`}
                                    >
                                      <Moon className="w-3 h-3" />
                                    </Button>
                                    {sessionStatus?.hasSession && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => clearSessionMutation.mutate(account.id)}
                                        disabled={clearSessionMutation.isPending}
                                        data-testid={`button-logout-${account.id}`}
                                        title="Clear saved session"
                                      >
                                        <LogOut className="w-3 h-3" />
                                      </Button>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        if (confirm("Delete this account?")) {
                                          deleteAccountMutation.mutate(account.id);
                                        }
                                      }}
                                      data-testid={`button-delete-${account.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    {accounts.filter(a => tabValue === "all" || a.platform === tabValue).length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        No accounts found. Add your first account to get started.
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
