import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCampaignSchema, stealthSettingsSchema, insertSocialAccountSchema, WARMUP_LIMITS } from "@shared/schema";
import { scheduleCommentsForCampaign, defaultStealthSettings, startScheduler, startWarmupJob } from "./scheduler";
import { generateAIComment, generateBatchAIComments, testAIConnection } from "./ai-comments";
import { saveSession, loadSession, invalidateSession, validateSession, getSessionStatus, getAllSessionStatuses, cleanupExpiredSessions, type BrowserSession } from "./session-manager";
import { initializeEmailNotifications, getEmailStatus, testEmailConnection, sendTestEmail, notifyDailySummary } from "./email-notifications";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Start the scheduler and warmup job
  startScheduler();
  startWarmupJob();
  
  // Initialize email notifications
  initializeEmailNotifications();

  // Health check endpoint for Docker/load balancers
  app.get("/api/health", async (req, res) => {
    try {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ status: "unhealthy" });
    }
  });

  // Get all campaigns
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Get single campaign with scheduled comments
  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      const scheduledComments = await storage.getScheduledComments(campaign.id);
      res.json({ ...campaign, scheduledComments });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  // Create new campaign
  app.post("/api/campaigns", async (req, res) => {
    try {
      const body = req.body;
      
      // Parse and validate stealth settings
      const stealthSettings = body.stealthSettings 
        ? stealthSettingsSchema.parse(body.stealthSettings)
        : defaultStealthSettings;
      
      const campaignData = insertCampaignSchema.parse({
        platform: body.platform,
        targetType: body.targetType,
        target: body.target,
        targets: body.targets || null, // Additional targets for multi-target campaigns
        category: body.category,
        totalComments: body.totalComments,
        status: "queued",
        useAI: body.useAI || false,
        postDescription: body.postDescription || null,
        stealthSettings,
      });
      
      const campaign = await storage.createCampaign(campaignData);
      
      // Log campaign creation
      await storage.createActivityLog({
        campaignId: campaign.id,
        type: "info",
        message: `Campaign created: ${campaign.totalComments} comments targeting ${campaign.target}`,
        platform: campaign.platform,
      });
      
      // Schedule comments with stealth timing
      await scheduleCommentsForCampaign(campaign);
      
      // Fetch updated campaign
      const updatedCampaign = await storage.getCampaign(campaign.id);
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Campaign creation error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid campaign data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create campaign" });
      }
    }
  });

  // Pause campaign
  app.post("/api/campaigns/:id/pause", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      const updated = await storage.updateCampaign(campaign.id, { status: "paused" });
      
      await storage.createActivityLog({
        campaignId: campaign.id,
        type: "warning",
        message: "Campaign paused",
        platform: campaign.platform,
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to pause campaign" });
    }
  });

  // Resume campaign
  app.post("/api/campaigns/:id/resume", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      const updated = await storage.updateCampaign(campaign.id, { status: "running" });
      
      await storage.createActivityLog({
        campaignId: campaign.id,
        type: "info",
        message: "Campaign resumed",
        platform: campaign.platform,
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to resume campaign" });
    }
  });

  // Cancel campaign
  app.post("/api/campaigns/:id/cancel", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      const updated = await storage.updateCampaign(campaign.id, { 
        status: "failed",
        errorMessage: "Cancelled by user"
      });
      
      await storage.createActivityLog({
        campaignId: campaign.id,
        type: "error",
        message: "Campaign cancelled",
        platform: campaign.platform,
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel campaign" });
    }
  });

  // Delete campaign
  app.delete("/api/campaigns/:id", async (req, res) => {
    try {
      await storage.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  // Get activity logs
  app.get("/api/activities", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await storage.getActivityLogs(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Manual CSV import endpoint for debugging
  app.post("/api/import-csv", async (req, res) => {
    try {
      const { importAccountsFromCSV } = await import("./csv-import");
      const importedCount = await importAccountsFromCSV();
      res.json({ 
        success: true, 
        message: `Successfully imported ${importedCount} accounts`,
        importedCount 
      });
    } catch (error) {
      console.error('Manual CSV import failed:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'CSV import failed'
      });
    }
  });

  // Get stealth settings defaults
  app.get("/api/stealth-settings/defaults", (req, res) => {
    res.json(defaultStealthSettings);
  });

  // ============== Social Accounts API ==============

  // Get all accounts (optionally filtered by platform)
  app.get("/api/accounts", async (req, res) => {
    try {
      const platform = req.query.platform as string | undefined;
      const accounts = await storage.getSocialAccounts(platform);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  // Get single account with activity
  app.get("/api/accounts/:id", async (req, res) => {
    try {
      const account = await storage.getSocialAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      const activity = await storage.getAccountActivity(account.id, 20);
      res.json({ ...account, recentActivity: activity });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  // Create new account
  app.post("/api/accounts", async (req, res) => {
    try {
      const accountData = insertSocialAccountSchema.parse(req.body);
      const account = await storage.createSocialAccount(accountData);
      
      await storage.createActivityLog({
        type: "info",
        message: `Account added: ${account.username} (${account.platform})`,
        platform: account.platform,
      });
      
      res.json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid account data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create account" });
      }
    }
  });

  // Update account
  app.patch("/api/accounts/:id", async (req, res) => {
    try {
      const account = await storage.getSocialAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      const updated = await storage.updateSocialAccount(account.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  // Delete account
  app.delete("/api/accounts/:id", async (req, res) => {
    try {
      await storage.deleteSocialAccount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Start warmup for account
  app.post("/api/accounts/:id/warmup", async (req, res) => {
    try {
      const account = await storage.getSocialAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      const updated = await storage.updateSocialAccount(account.id, {
        status: "warming",
        warmupLevel: 0,
        warmupStartedAt: new Date(),
      });
      
      await storage.createActivityLog({
        type: "info",
        message: `Warmup started for ${account.username}`,
        platform: account.platform,
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to start warmup" });
    }
  });

  // Force rest for account
  app.post("/api/accounts/:id/rest", async (req, res) => {
    try {
      const account = await storage.getSocialAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      const restHours = req.body.hours || 24;
      const restingUntil = new Date(Date.now() + restHours * 60 * 60 * 1000);
      
      const updated = await storage.updateSocialAccount(account.id, {
        status: "resting",
        restingUntil,
        lastRestAt: new Date(),
      });
      
      await storage.createActivityLog({
        type: "warning",
        message: `Account ${account.username} put to rest for ${restHours} hours`,
        platform: account.platform,
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to set rest period" });
    }
  });

  // Bulk start warmup for all new accounts
  app.post("/api/accounts/warmup-all", async (req, res) => {
    try {
      const accounts = await storage.getSocialAccounts();
      const newAccounts = accounts.filter(a => 
        a.status !== "warming" && 
        a.status !== "banned" && 
        a.warmupLevel < 5 &&
        !a.warmupStartedAt
      );
      
      for (const account of newAccounts) {
        await storage.updateSocialAccount(account.id, {
          status: "warming",
          warmupLevel: 0,
          warmupStartedAt: new Date(),
        });
        
        await storage.createActivityLog({
          type: "info",
          message: `Warmup started for ${account.username}`,
          platform: account.platform,
        });
      }
      
      res.json({ success: true, count: newAccounts.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to start bulk warmup" });
    }
  });

  // Get account metrics summary
  app.get("/api/accounts/metrics/summary", async (req, res) => {
    try {
      const accounts = await storage.getSocialAccounts();
      
      const summary = {
        total: accounts.length,
        byPlatform: {
          instagram: accounts.filter(a => a.platform === "instagram").length,
          facebook: accounts.filter(a => a.platform === "facebook").length,
          tiktok: accounts.filter(a => a.platform === "tiktok").length,
        },
        byStatus: {
          active: accounts.filter(a => a.status === "active").length,
          warming: accounts.filter(a => a.status === "warming").length,
          resting: accounts.filter(a => a.status === "resting").length,
          suspended: accounts.filter(a => a.status === "suspended").length,
          banned: accounts.filter(a => a.status === "banned").length,
        },
        averageHealthScore: accounts.length > 0 
          ? Math.round(accounts.reduce((sum, a) => sum + a.healthScore, 0) / accounts.length)
          : 100,
        totalCommentsToday: accounts.reduce((sum, a) => sum + a.commentsToday, 0),
        warmupLimits: WARMUP_LIMITS,
      };
      
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to get metrics" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics/overview", async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      const accounts = await storage.getSocialAccounts();
      const activities = await storage.getActivityLogs(500);
      
      // Campaign stats
      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(c => c.status === "running").length;
      const completedCampaigns = campaigns.filter(c => c.status === "completed").length;
      const totalComments = campaigns.reduce((sum, c) => sum + c.completedComments, 0);
      
      // Success rate calculation
      const successActivities = activities.filter(a => a.type === "success").length;
      const errorActivities = activities.filter(a => a.type === "error").length;
      const totalAttempts = successActivities + errorActivities;
      const successRate = totalAttempts > 0 ? Math.round((successActivities / totalAttempts) * 100) : 100;
      
      // Platform distribution
      const platformStats = {
        instagram: campaigns.filter(c => c.platform === "instagram").reduce((sum, c) => sum + c.completedComments, 0),
        facebook: campaigns.filter(c => c.platform === "facebook").reduce((sum, c) => sum + c.completedComments, 0),
        tiktok: campaigns.filter(c => c.platform === "tiktok").reduce((sum, c) => sum + c.completedComments, 0),
      };
      
      // Activity by day (last 7 days)
      const now = new Date();
      const dailyActivity: { date: string; comments: number; success: number; errors: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayActivities = activities.filter(a => {
          if (!a.createdAt) return false;
          return new Date(a.createdAt).toISOString().split('T')[0] === dateStr;
        });
        dailyActivity.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          comments: dayActivities.filter(a => a.type === "success").length,
          success: dayActivities.filter(a => a.type === "success").length,
          errors: dayActivities.filter(a => a.type === "error").length,
        });
      }
      
      // Account health distribution
      const healthDistribution = [
        { range: "90-100", count: accounts.filter(a => a.healthScore >= 90).length },
        { range: "70-89", count: accounts.filter(a => a.healthScore >= 70 && a.healthScore < 90).length },
        { range: "50-69", count: accounts.filter(a => a.healthScore >= 50 && a.healthScore < 70).length },
        { range: "0-49", count: accounts.filter(a => a.healthScore < 50).length },
      ];
      
      // Category breakdown
      const categoryStats = campaigns.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + c.completedComments;
        return acc;
      }, {} as Record<string, number>);
      
      res.json({
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalComments,
        successRate,
        platformStats,
        dailyActivity,
        healthDistribution,
        categoryStats,
        totalAccounts: accounts.length,
        activeAccounts: accounts.filter(a => a.status === "active" || a.status === "warming").length,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Test AI connection
  app.get("/api/ai/status", async (req, res) => {
    try {
      const connected = await testAIConnection();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Generate preview AI comments
  app.post("/api/ai/preview", async (req, res) => {
    try {
      const { platform, target, category, postDescription, count } = req.body;
      const comments = await generateBatchAIComments(
        {
          platform: platform || "instagram",
          targetUsername: target,
          postDescription,
          category: category || "positive",
        },
        Math.min(count || 5, 10)
      );
      res.json({ comments });
    } catch (error) {
      console.error("AI preview error:", error);
      res.status(500).json({ error: "Failed to generate AI comments" });
    }
  });

  // ============== Session Management API ==============

  // Get session status for an account
  app.get("/api/accounts/:id/session", async (req, res) => {
    try {
      const account = await storage.getSocialAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      const status = await getSessionStatus(account.id);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get session status" });
    }
  });

  // Get all session statuses (for bulk display)
  app.get("/api/sessions/status", async (req, res) => {
    try {
      const statuses = await getAllSessionStatuses();
      const result: Record<string, { hasSession: boolean; isValid: boolean; expiresAt: Date | null }> = {};
      statuses.forEach((value, key) => {
        result[key] = value;
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get session statuses" });
    }
  });

  // Save a session for an account
  app.post("/api/accounts/:id/session", async (req, res) => {
    try {
      const account = await storage.getSocialAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      const { sessionData, expiresInHours } = req.body;
      if (!sessionData) {
        return res.status(400).json({ error: "Session data is required" });
      }
      
      const session = await saveSession(account.id, sessionData as BrowserSession, expiresInHours || 168);
      
      await storage.createActivityLog({
        type: "success",
        message: `Session saved for ${account.username}`,
        platform: account.platform,
      });
      
      res.json({ success: true, session });
    } catch (error) {
      res.status(500).json({ error: "Failed to save session" });
    }
  });

  // Validate a session
  app.post("/api/accounts/:id/session/validate", async (req, res) => {
    try {
      const account = await storage.getSocialAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      const result = await validateSession(account.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to validate session" });
    }
  });

  // Invalidate/clear a session
  app.delete("/api/accounts/:id/session", async (req, res) => {
    try {
      const account = await storage.getSocialAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      await invalidateSession(account.id, req.body?.reason || "Manual logout");
      
      await storage.createActivityLog({
        type: "info",
        message: `Session cleared for ${account.username}`,
        platform: account.platform,
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to invalidate session" });
    }
  });

  // Load session data for automation
  app.get("/api/accounts/:id/session/data", async (req, res) => {
    try {
      const account = await storage.getSocialAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      const sessionData = await loadSession(account.id);
      if (!sessionData) {
        return res.status(404).json({ error: "No valid session found" });
      }
      
      res.json(sessionData);
    } catch (error) {
      res.status(500).json({ error: "Failed to load session" });
    }
  });

  // Cleanup expired sessions
  app.post("/api/sessions/cleanup", async (req, res) => {
    try {
      const cleaned = await cleanupExpiredSessions();
      res.json({ success: true, cleaned });
    } catch (error) {
      res.status(500).json({ error: "Failed to cleanup sessions" });
    }
  });

  // ============== Bulk CSV Import API ==============

  // Import accounts from CSV data
  app.post("/api/accounts/import-csv", async (req, res) => {
    try {
      const { csvData } = req.body;
      if (!csvData || typeof csvData !== "string") {
        return res.status(400).json({ error: "CSV data is required" });
      }
      
      const lines = csvData.trim().split("\n");
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV must have a header row and at least one data row" });
      }
      
      // Parse header (first line)
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      // Required columns
      const requiredCols = ["platform", "username", "credentialkey"];
      const missing = requiredCols.filter(col => !headers.includes(col) && !headers.includes(col.toLowerCase().replace("_", "")));
      
      // Handle different column name formats
      const colMap: Record<string, number> = {};
      headers.forEach((h, i) => {
        const normalized = h.toLowerCase().replace(/[_\s-]/g, "");
        colMap[normalized] = i;
      });
      
      if (!colMap["platform"] && colMap["platform"] !== 0) {
        return res.status(400).json({ error: "Missing required column: platform" });
      }
      if (!colMap["username"] && colMap["username"] !== 0) {
        return res.status(400).json({ error: "Missing required column: username" });
      }
      if (!colMap["credentialkey"] && colMap["credentialkey"] !== 0) {
        return res.status(400).json({ error: "Missing required column: credentialKey" });
      }
      
      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[],
      };
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parsing (handles basic cases)
        const values = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
        
        try {
          const platform = values[colMap["platform"]] || "";
          const username = values[colMap["username"]] || "";
          const credentialKey = values[colMap["credentialkey"]] || "";
          
          if (!platform || !username || !credentialKey) {
            results.errors.push(`Row ${i + 1}: Missing required fields`);
            results.skipped++;
            continue;
          }
          
          if (!["instagram", "facebook", "tiktok"].includes(platform.toLowerCase())) {
            results.errors.push(`Row ${i + 1}: Invalid platform "${platform}"`);
            results.skipped++;
            continue;
          }
          
          const accountData = {
            platform: platform.toLowerCase(),
            username,
            credentialKey,
            displayName: colMap["displayname"] !== undefined ? values[colMap["displayname"]] || null : null,
            proxyHost: colMap["proxyhost"] !== undefined ? values[colMap["proxyhost"]] || null : null,
            proxyPort: colMap["proxyport"] !== undefined ? (parseInt(values[colMap["proxyport"]], 10) || null) : null,
            proxyUsername: colMap["proxyusername"] !== undefined ? values[colMap["proxyusername"]] || null : null,
            proxyPassword: colMap["proxypassword"] !== undefined ? values[colMap["proxypassword"]] || null : null,
          };
          
          await storage.createSocialAccount(accountData);
          results.imported++;
        } catch (error: any) {
          results.errors.push(`Row ${i + 1}: ${error.message || "Unknown error"}`);
          results.skipped++;
        }
      }
      
      await storage.createActivityLog({
        type: "info",
        message: `CSV import: ${results.imported} accounts imported, ${results.skipped} skipped`,
      });
      
      res.json(results);
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ error: "Failed to import CSV" });
    }
  });

  // Get CSV template
  app.get("/api/accounts/csv-template", (req, res) => {
    const template = `platform,username,credentialKey,displayName,proxyHost,proxyPort,proxyUsername,proxyPassword
instagram,user1@email.com,IG_USER1_PASSWORD,Account 1,proxy.example.com,8080,proxyuser,proxypass
facebook,user2@email.com,FB_USER2_PASSWORD,Account 2,,,
tiktok,user3@email.com,TT_USER3_PASSWORD,Account 3,,,`;
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=accounts_template.csv");
    res.send(template);
  });

  // ============== Email Notifications API ==============

  // Get email notification status
  app.get("/api/notifications/status", (req, res) => {
    const status = getEmailStatus();
    res.json(status);
  });

  // Test email connection
  app.get("/api/notifications/test-connection", async (req, res) => {
    try {
      const result = await testEmailConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to test connection" });
    }
  });

  // Send test email
  app.post("/api/notifications/test", async (req, res) => {
    try {
      const sent = await sendTestEmail();
      res.json({ success: sent, message: sent ? "Test email sent" : "Failed to send test email" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to send test email" });
    }
  });

  // Trigger daily summary (for testing or manual trigger)
  app.post("/api/notifications/daily-summary", async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      const accounts = await storage.getSocialAccounts();
      const activities = await storage.getActivityLogs(500);
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      const todayActivities = activities.filter(a => {
        if (!a.createdAt) return false;
        return new Date(a.createdAt).toISOString().split('T')[0] === todayStr;
      });
      
      const stats = {
        totalComments: todayActivities.filter(a => a.type === "success" || a.type === "error").length,
        successfulComments: todayActivities.filter(a => a.type === "success").length,
        failedComments: todayActivities.filter(a => a.type === "error").length,
        activeCampaigns: campaigns.filter(c => c.status === "running").length,
        completedCampaigns: campaigns.filter(c => {
          if (c.status !== "completed" || !c.completedAt) return false;
          return new Date(c.completedAt).toISOString().split('T')[0] === todayStr;
        }).length,
        accountsAtRisk: accounts.filter(a => a.healthScore < 50 || a.status === "suspended" || a.status === "banned").length,
      };
      
      const sent = await notifyDailySummary(stats);
      res.json({ success: sent, stats });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to send daily summary" });
    }
  });

  return httpServer;
}
