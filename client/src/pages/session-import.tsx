import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SocialAccount } from "@shared/schema";

export default function SessionImport() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [cookiesJson, setCookiesJson] = useState("");
  const { toast } = useToast();

  const { data: accounts = [] } = useQuery<SocialAccount[]>({
    queryKey: ["/api/accounts"],
  });

  const importMutation = useMutation({
    mutationFn: async (data: { accountId: string; cookies: string }) => {
      return apiRequest("/api/accounts/import-session", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Session imported!",
        description: "The account session has been saved. You can now use this account for automation.",
      });
      setCookiesJson("");
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!selectedAccountId) {
      toast({ title: "Select an account first", variant: "destructive" });
      return;
    }
    if (!cookiesJson.trim()) {
      toast({ title: "Paste cookies JSON first", variant: "destructive" });
      return;
    }
    importMutation.mutate({ accountId: selectedAccountId, cookies: cookiesJson });
  };

  const facebookAccounts = accounts.filter(a => a.platform === "facebook");

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/accounts">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Accounts
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Session Cookies
          </CardTitle>
          <CardDescription>
            Import cookies from your browser to authenticate an account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <p className="text-sm font-medium">How to export cookies:</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li>Install a cookie export extension (e.g., "EditThisCookie" or "Cookie-Editor")</li>
              <li>Log into Facebook with the account you want to use</li>
              <li>Click the extension icon and export cookies as JSON</li>
              <li>Paste the JSON below and click Import</li>
            </ol>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Account</label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger data-testid="select-account">
                <SelectValue placeholder="Choose an account..." />
              </SelectTrigger>
              <SelectContent>
                {facebookAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.username} ({account.platform})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cookies JSON</label>
            <Textarea
              placeholder='[{"name": "c_user", "value": "...", "domain": ".facebook.com", ...}]'
              value={cookiesJson}
              onChange={(e) => setCookiesJson(e.target.value)}
              className="min-h-[200px] font-mono text-xs"
              data-testid="input-cookies"
            />
          </div>

          <Button 
            onClick={handleImport}
            disabled={importMutation.isPending || !selectedAccountId || !cookiesJson.trim()}
            className="w-full"
            data-testid="button-import"
          >
            {importMutation.isPending ? (
              "Importing..."
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Session
              </>
            )}
          </Button>

          {importMutation.isSuccess && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Session imported successfully!</span>
            </div>
          )}

          {importMutation.isError && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Failed to import session</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
