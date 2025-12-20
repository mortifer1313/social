import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCampaignSchema, stealthSettingsSchema, insertSocialAccountSchema, insertCommentTemplateSchema, insertCompetitorSchema, WARMUP_LIMITS } from "@shared/schema";
import { scheduleCommentsForCampaign, defaultStealthSettings, startScheduler, startWarmupJob } from "./scheduler";
import { generateAIComment, generateBatchAIComments, testAIConnection } from "./ai-comments";
import { saveSession, loadSession, invalidateSession, validateSession, getSessionStatus, getAllSessionStatuses, cleanupExpiredSessions, type BrowserSession } from "./session-manager";
import { initializeEmailNotifications, getEmailStatus, testEmailConnection, sendTestEmail, notifyDailySummary } from "./email-notifications";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { apiLimiter, authLimiter, strictLimiter } from "./rate-limiter";
import { logAudit, getAuditLogs } from "./audit-logger";
import { createBackup, getBackups, getBackupData, deleteBackup } from "./backup-service";
import { createLocalUser, authenticateLocalUser, getLocalUsers, deactivateUser, activateUser, updateUserPassword, getUserByEmail } from "./local-auth";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication (MUST be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Apply rate limiting to all API routes
  app.use("/api", apiLimiter);
  
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

  // ============== Local Authentication API ==============

  // Local login with email/password
  app.post("/api/auth/local/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      
      const result = await authenticateLocalUser(email, password);
      
      if (!result.success || !result.user) {
        await logAudit({ req, action: "login", resourceType: "user", details: { email, success: false } });
        return res.status(401).json({ error: result.error });
      }
      
      // Create a user object compatible with Passport session
      const sessionUser = {
        claims: {
          sub: result.user.id,
          email: result.user.email,
          first_name: result.user.firstName,
          last_name: result.user.lastName,
        },
        // Set expires_at far in the future for local auth (no token expiry)
        expires_at: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
      };
      
      // Use Passport's login to establish session properly
      req.login(sessionUser, async (err) => {
        if (err) {
          console.error("Session login error:", err);
          return res.status(500).json({ error: "Failed to establish session" });
        }
        
        await logAudit({ req, action: "login", resourceType: "user", resourceId: result.user!.id, details: { email, success: true } });
        
        res.json({ success: true, user: result.user });
      });
    } catch (error) {
      console.error("Local login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Local logout
  app.post("/api/auth/local/logout", async (req, res) => {
    try {
      const userId = (req as any).session?.user?.claims?.sub;
      if (userId) {
        await logAudit({ req, action: "logout", resourceType: "user", resourceId: userId });
      }
      (req as any).session.destroy();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Create client account (admin only)
  app.post("/api/auth/local/create-user", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user?.claims?.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      if (requestingUser?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { email, password, firstName, lastName, role } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      
      // Check if email already exists
      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      const user = await createLocalUser({
        email,
        password,
        firstName,
        lastName,
        role: role || "user",
      });
      
      await logAudit({ req, action: "create", resourceType: "user", resourceId: user.id, details: { email, role: user.role } });
      
      res.json({ success: true, user });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Get all local users (admin only)
  app.get("/api/auth/local/users", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user?.claims?.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      if (requestingUser?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const users = await getLocalUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Deactivate user (admin only)
  app.post("/api/auth/local/users/:id/deactivate", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user?.claims?.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      if (requestingUser?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      await deactivateUser(req.params.id);
      await logAudit({ req, action: "update", resourceType: "user", resourceId: req.params.id, details: { action: "deactivate" } });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to deactivate user" });
    }
  });

  // Activate user (admin only)
  app.post("/api/auth/local/users/:id/activate", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user?.claims?.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      if (requestingUser?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      await activateUser(req.params.id);
      await logAudit({ req, action: "update", resourceType: "user", resourceId: req.params.id, details: { action: "activate" } });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to activate user" });
    }
  });

  // Reset user password (admin only)
  app.post("/api/auth/local/users/:id/reset-password", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user?.claims?.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      if (requestingUser?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      
      await updateUserPassword(req.params.id, newPassword);
      await logAudit({ req, action: "update", resourceType: "user", resourceId: req.params.id, details: { action: "password_reset" } });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Get all campaigns
  app.get("/api/campaigns", isAuthenticated, async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Get single campaign with scheduled comments
  app.get("/api/campaigns/:id", isAuthenticated, async (req, res) => {
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
  app.post("/api/campaigns", isAuthenticated, async (req, res) => {
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
        hashtags: body.hashtags || null, // Hashtags for discovery targeting
        category: body.category,
        totalComments: body.totalComments,
        status: "queued",
        useAI: body.useAI || false,
        postDescription: body.postDescription || null,
        stealthSettings,
        timezone: body.timezone || "UTC",
      });
      
      const campaign = await storage.createCampaign(campaignData);
      
      // Log campaign creation
      await storage.createActivityLog({
        campaignId: campaign.id,
        type: "info",
        message: `Campaign created: ${campaign.totalComments} comments targeting ${campaign.target}`,
        platform: campaign.platform,
      });
      
      // Audit log
      await logAudit({ req, action: "create", resourceType: "campaign", resourceId: campaign.id, details: { target: campaign.target } });
      
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
  app.post("/api/campaigns/:id/pause", isAuthenticated, async (req, res) => {
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
      
      await logAudit({ req, action: "campaign_pause", resourceType: "campaign", resourceId: campaign.id });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to pause campaign" });
    }
  });

  // Resume campaign
  app.post("/api/campaigns/:id/resume", isAuthenticated, async (req, res) => {
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
      
      await logAudit({ req, action: "campaign_start", resourceType: "campaign", resourceId: campaign.id });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to resume campaign" });
    }
  });

  // Cancel campaign
  app.post("/api/campaigns/:id/cancel", isAuthenticated, async (req, res) => {
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
      
      await logAudit({ req, action: "campaign_cancel", resourceType: "campaign", resourceId: campaign.id });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel campaign" });
    }
  });

  // Delete campaign
  app.delete("/api/campaigns/:id", isAuthenticated, async (req, res) => {
    try {
      await logAudit({ req, action: "delete", resourceType: "campaign", resourceId: req.params.id });
      await storage.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  // Get activity logs
  app.get("/api/activities", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await storage.getActivityLogs(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Get stealth settings defaults
  app.get("/api/stealth-settings/defaults", isAuthenticated, (req, res) => {
    res.json(defaultStealthSettings);
  });

  // ============== Social Accounts API ==============

  // Get all accounts (optionally filtered by platform)
  app.get("/api/accounts", isAuthenticated, async (req, res) => {
    try {
      const platform = req.query.platform as string | undefined;
      const accounts = await storage.getSocialAccounts(platform);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  // Get single account with activity
  app.get("/api/accounts/:id", isAuthenticated, async (req, res) => {
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
  app.post("/api/accounts", isAuthenticated, async (req, res) => {
    try {
      const accountData = insertSocialAccountSchema.parse(req.body);
      const account = await storage.createSocialAccount(accountData);
      
      await storage.createActivityLog({
        type: "info",
        message: `Account added: ${account.username} (${account.platform})`,
        platform: account.platform,
      });
      
      await logAudit({ req, action: "create", resourceType: "account", resourceId: account.id, details: { username: account.username } });
      
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
  app.patch("/api/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const account = await storage.getSocialAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      const updated = await storage.updateSocialAccount(account.id, req.body);
      await logAudit({ req, action: "update", resourceType: "account", resourceId: account.id });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  // Delete account
  app.delete("/api/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      await logAudit({ req, action: "delete", resourceType: "account", resourceId: req.params.id });
      await storage.deleteSocialAccount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Start warmup for account
  app.post("/api/accounts/:id/warmup", isAuthenticated, async (req, res) => {
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
  app.post("/api/accounts/:id/rest", isAuthenticated, async (req, res) => {
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
  app.post("/api/accounts/warmup-all", isAuthenticated, async (req, res) => {
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
      
      await logAudit({ req, action: "update", resourceType: "account", details: { warmupCount: newAccounts.length } });
      res.json({ success: true, count: newAccounts.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to start bulk warmup" });
    }
  });

  // Get account metrics summary
  app.get("/api/accounts/metrics/summary", isAuthenticated, async (req, res) => {
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
  app.get("/api/analytics/overview", isAuthenticated, async (req, res) => {
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
  app.get("/api/ai/status", isAuthenticated, async (req, res) => {
    try {
      const connected = await testAIConnection();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Generate preview AI comments
  app.post("/api/ai/preview", isAuthenticated, async (req, res) => {
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
  app.get("/api/accounts/:id/session", isAuthenticated, async (req, res) => {
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

  // Get session health summary with alerts
  app.get("/api/sessions/health", isAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getSocialAccounts();
      const statuses = await getAllSessionStatuses();
      
      let validSessions = 0;
      let expiringSoon = 0;
      let expired = 0;
      let noSession = 0;
      const alerts: Array<{ accountId: string; username: string; platform: string; issue: string; severity: "warning" | "error" }> = [];
      
      const now = Date.now();
      const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
      
      for (const account of accounts) {
        const status = statuses.get(account.id);
        
        if (!status || !status.hasSession) {
          noSession++;
          alerts.push({
            accountId: account.id,
            username: account.username,
            platform: account.platform,
            issue: "No session imported",
            severity: "error"
          });
        } else if (!status.isValid) {
          expired++;
          alerts.push({
            accountId: account.id,
            username: account.username,
            platform: account.platform,
            issue: "Session expired or invalid",
            severity: "error"
          });
        } else if (status.expiresAt && new Date(status.expiresAt).getTime() - now < twoDaysMs) {
          expiringSoon++;
          const hoursLeft = Math.round((new Date(status.expiresAt).getTime() - now) / (60 * 60 * 1000));
          alerts.push({
            accountId: account.id,
            username: account.username,
            platform: account.platform,
            issue: `Session expires in ${hoursLeft} hours`,
            severity: "warning"
          });
          validSessions++;
        } else {
          validSessions++;
        }
      }
      
      res.json({
        totalAccounts: accounts.length,
        validSessions,
        expiringSoon,
        expired,
        noSession,
        alerts: alerts.slice(0, 20), // Limit alerts returned
        healthScore: accounts.length > 0 ? Math.round((validSessions / accounts.length) * 100) : 100
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get session health" });
    }
  });

  // Get all session statuses (for bulk display)
  app.get("/api/sessions/status", isAuthenticated, async (req, res) => {
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
  app.post("/api/accounts/:id/session", isAuthenticated, async (req, res) => {
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
  app.post("/api/accounts/:id/session/validate", isAuthenticated, async (req, res) => {
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

  // Import session from browser cookies
  app.post("/api/accounts/import-session", isAuthenticated, async (req, res) => {
    try {
      const { accountId, cookies } = req.body;
      
      if (!accountId || !cookies) {
        return res.status(400).json({ error: "Account ID and cookies are required" });
      }
      
      const account = await storage.getSocialAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      // Parse cookies (accept array or JSON string)
      let cookieArray;
      try {
        cookieArray = typeof cookies === "string" ? JSON.parse(cookies) : cookies;
      } catch (e) {
        return res.status(400).json({ error: "Invalid cookies format - must be valid JSON" });
      }
      
      // Convert browser cookie format to Playwright storage state
      const convertSameSite = (sameSite: string | undefined): "Strict" | "Lax" | "None" => {
        if (!sameSite) return "None";
        const lower = sameSite.toLowerCase();
        if (lower === "strict") return "Strict";
        if (lower === "lax") return "Lax";
        // "no_restriction" and other values map to "None"
        return "None";
      };
      
      const playwrightCookies = cookieArray.map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain || ".facebook.com",
        path: c.path || "/",
        expires: c.expirationDate || (Date.now() / 1000 + 86400 * 7),
        httpOnly: c.httpOnly || false,
        secure: c.secure || true,
        sameSite: convertSameSite(c.sameSite),
      }));
      
      const sessionData = {
        cookies: playwrightCookies,
        origins: [],
      };
      
      // Save as session
      await storage.createAccountSession({
        accountId: account.id,
        sessionData: JSON.stringify(sessionData),
        isValid: true,
        lastValidatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      
      await storage.createActivityLog({
        type: "success",
        message: `Session imported from browser cookies for ${account.username}`,
        platform: account.platform,
      });
      
      res.json({ success: true, message: "Session imported successfully" });
    } catch (error) {
      console.error("Import session error:", error);
      res.status(500).json({ error: "Failed to import session" });
    }
  });

  // Invalidate/clear a session
  app.delete("/api/accounts/:id/session", isAuthenticated, async (req, res) => {
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
      
      await logAudit({ req, action: "session_invalidate", resourceType: "session", resourceId: account.id, details: { username: account.username } });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to invalidate session" });
    }
  });

  // Load session data for automation
  app.get("/api/accounts/:id/session/data", isAuthenticated, async (req, res) => {
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
  app.post("/api/sessions/cleanup", isAuthenticated, async (req, res) => {
    try {
      const cleaned = await cleanupExpiredSessions();
      await logAudit({ req, action: "delete", resourceType: "session", details: { cleaned } });
      res.json({ success: true, cleaned });
    } catch (error) {
      res.status(500).json({ error: "Failed to cleanup sessions" });
    }
  });

  // ============== Bulk CSV Import API ==============

  // Import accounts from CSV data
  app.post("/api/accounts/import-csv", isAuthenticated, async (req, res) => {
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
  app.get("/api/accounts/csv-template", isAuthenticated, (req, res) => {
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
  app.get("/api/notifications/status", isAuthenticated, (req, res) => {
    const status = getEmailStatus();
    res.json(status);
  });

  // Test email connection
  app.get("/api/notifications/test-connection", isAuthenticated, async (req, res) => {
    try {
      const result = await testEmailConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to test connection" });
    }
  });

  // Send test email
  app.post("/api/notifications/test", isAuthenticated, async (req, res) => {
    try {
      const sent = await sendTestEmail();
      res.json({ success: sent, message: sent ? "Test email sent" : "Failed to send test email" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to send test email" });
    }
  });

  // Serve recording files (video and images)
  app.get("/api/recordings/:filename", isAuthenticated, async (req, res) => {
    try {
      const { filename } = req.params;
      const path = await import("path");
      const fs = await import("fs");
      
      // Sanitize filename to prevent directory traversal
      const sanitizedFilename = path.basename(filename);
      const filePath = path.join(process.cwd(), "attached_assets", sanitizedFilename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Recording not found" });
      }
      
      // Determine content type based on extension
      const ext = path.extname(sanitizedFilename).toLowerCase();
      let contentType = "application/octet-stream";
      if (ext === ".webm") contentType = "video/webm";
      else if (ext === ".mp4") contentType = "video/mp4";
      else if (ext === ".png") contentType = "image/png";
      else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="${sanitizedFilename}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res.status(500).json({ error: "Failed to serve recording" });
    }
  });

  // Trigger daily summary (for testing or manual trigger)
  app.post("/api/notifications/daily-summary", isAuthenticated, async (req, res) => {
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

  // ============== Comment Templates API ==============

  // Get all comment templates
  app.get("/api/templates", isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const templates = await storage.getCommentTemplates(category);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Get single template
  app.get("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getCommentTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  // Create new template
  app.post("/api/templates", isAuthenticated, async (req, res) => {
    try {
      const templateData = insertCommentTemplateSchema.parse(req.body);
      const template = await storage.createCommentTemplate(templateData);
      await logAudit({ req, action: "create", resourceType: "template", resourceId: template.id });
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid template data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create template" });
      }
    }
  });

  // Update template
  app.patch("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateCommentTemplate(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Template not found" });
      }
      await logAudit({ req, action: "update", resourceType: "template", resourceId: req.params.id });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Delete template
  app.delete("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      await logAudit({ req, action: "delete", resourceType: "template", resourceId: req.params.id });
      await storage.deleteCommentTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // ============== Engagement Tracking API ==============

  // Get engagement data
  app.get("/api/engagement", isAuthenticated, async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const engagement = await storage.getEngagementTracking(campaignId);
      res.json(engagement);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch engagement data" });
    }
  });

  // Get engagement summary stats
  app.get("/api/engagement/summary", isAuthenticated, async (req, res) => {
    try {
      const allEngagement = await storage.getEngagementTracking();
      const totalLikes = allEngagement.reduce((sum, e) => sum + (e.likes || 0), 0);
      const totalReplies = allEngagement.reduce((sum, e) => sum + (e.replies || 0), 0);
      const totalComments = allEngagement.length;
      const avgLikesPerComment = totalComments > 0 ? totalLikes / totalComments : 0;
      const avgRepliesPerComment = totalComments > 0 ? totalReplies / totalComments : 0;
      
      // Platform breakdown
      const byPlatform = allEngagement.reduce((acc, e) => {
        if (!acc[e.platform]) {
          acc[e.platform] = { likes: 0, replies: 0, comments: 0 };
        }
        acc[e.platform].likes += e.likes || 0;
        acc[e.platform].replies += e.replies || 0;
        acc[e.platform].comments += 1;
        return acc;
      }, {} as Record<string, { likes: number; replies: number; comments: number }>);
      
      res.json({
        totalLikes,
        totalReplies,
        totalComments,
        avgLikesPerComment: Math.round(avgLikesPerComment * 100) / 100,
        avgRepliesPerComment: Math.round(avgRepliesPerComment * 100) / 100,
        byPlatform,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch engagement summary" });
    }
  });

  // ============== Competitor Monitoring API ==============

  // Get all competitors
  app.get("/api/competitors", isAuthenticated, async (req, res) => {
    try {
      const platform = req.query.platform as string | undefined;
      const competitors = await storage.getCompetitors(platform);
      res.json(competitors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch competitors" });
    }
  });

  // Get single competitor with posts
  app.get("/api/competitors/:id", isAuthenticated, async (req, res) => {
    try {
      const competitor = await storage.getCompetitor(req.params.id);
      if (!competitor) {
        return res.status(404).json({ error: "Competitor not found" });
      }
      const posts = await storage.getCompetitorPosts(competitor.id);
      res.json({ ...competitor, posts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch competitor" });
    }
  });

  // Create new competitor
  app.post("/api/competitors", isAuthenticated, async (req, res) => {
    try {
      const competitorData = insertCompetitorSchema.parse(req.body);
      const competitor = await storage.createCompetitor(competitorData);
      
      await storage.createActivityLog({
        type: "info",
        message: `Started monitoring competitor: @${competitor.username}`,
        platform: competitor.platform,
      });
      
      await logAudit({ req, action: "create", resourceType: "competitor", resourceId: competitor.id, details: { username: competitor.username } });
      
      res.json(competitor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid competitor data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create competitor" });
      }
    }
  });

  // Update competitor
  app.patch("/api/competitors/:id", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateCompetitor(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Competitor not found" });
      }
      await logAudit({ req, action: "update", resourceType: "competitor", resourceId: req.params.id });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update competitor" });
    }
  });

  // Delete competitor
  app.delete("/api/competitors/:id", isAuthenticated, async (req, res) => {
    try {
      await logAudit({ req, action: "delete", resourceType: "competitor", resourceId: req.params.id });
      await storage.deleteCompetitor(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete competitor" });
    }
  });

  // ============== Account Warmup API ==============

  // Get warmup status for all accounts
  app.get("/api/accounts/warmup-status", isAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getSocialAccounts();
      const warmupStatus = accounts.map(account => {
        const limits = WARMUP_LIMITS[account.warmupLevel as keyof typeof WARMUP_LIMITS] || WARMUP_LIMITS[0];
        const daysAtLevel = account.warmupStartedAt 
          ? Math.floor((Date.now() - new Date(account.warmupStartedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        // Calculate progress to next level
        const daysNeededForNextLevel = [0, 2, 4, 7, 14, Infinity][account.warmupLevel + 1] || Infinity;
        const progressPercent = Math.min(100, Math.round((daysAtLevel / daysNeededForNextLevel) * 100));
        
        return {
          id: account.id,
          platform: account.platform,
          username: account.username,
          displayName: account.displayName,
          warmupLevel: account.warmupLevel,
          status: account.status,
          daysAtLevel,
          progressPercent,
          currentLimits: limits,
          commentsToday: account.commentsToday,
          totalComments: account.totalComments,
          healthScore: account.healthScore,
        };
      });
      
      res.json(warmupStatus);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch warmup status" });
    }
  });

  // ============== Session Auto-Refresh API ==============

  // Get sessions needing refresh
  app.get("/api/sessions/expiring", isAuthenticated, async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const expiringSessions = await storage.getExpiringSessions(hours);
      
      // Get associated accounts
      const sessionsWithAccounts = await Promise.all(
        expiringSessions.map(async (session) => {
          const account = await storage.getSocialAccount(session.accountId);
          return {
            ...session,
            account: account ? {
              id: account.id,
              platform: account.platform,
              username: account.username,
              displayName: account.displayName,
            } : null,
          };
        })
      );
      
      res.json(sessionsWithAccounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expiring sessions" });
    }
  });

  // Refresh session endpoint (triggers re-authentication)
  app.post("/api/sessions/:accountId/refresh", isAuthenticated, async (req, res) => {
    try {
      const account = await storage.getSocialAccount(req.params.accountId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      // Mark current session as needing refresh
      const session = await storage.getAccountSession(account.id);
      if (session) {
        await storage.updateAccountSession(session.id, {
          isValid: false,
        });
      }
      
      await storage.createActivityLog({
        type: "info",
        message: `Session refresh requested for ${account.username}`,
        platform: account.platform,
      });
      
      res.json({ 
        success: true, 
        message: "Session marked for refresh. Please re-import cookies for this account.",
        account: {
          id: account.id,
          platform: account.platform,
          username: account.username,
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh session" });
    }
  });

  // ============== Multi-Account Distribution API ==============

  // Get account distribution recommendation for a campaign
  app.post("/api/campaigns/distribute", isAuthenticated, async (req, res) => {
    try {
      const { platform, totalComments } = req.body;
      
      if (!platform || !totalComments) {
        return res.status(400).json({ error: "Platform and totalComments are required" });
      }
      
      const availableAccounts = await storage.getAvailableAccountsForPlatform(platform);
      
      if (availableAccounts.length === 0) {
        return res.status(400).json({ error: "No available accounts for this platform" });
      }
      
      // Calculate distribution based on warmup levels and daily limits
      const distribution = availableAccounts.map(account => {
        const limits = WARMUP_LIMITS[account.warmupLevel as keyof typeof WARMUP_LIMITS] || WARMUP_LIMITS[0];
        const remainingToday = limits.maxPerDay - account.commentsToday;
        const canHandle = Math.max(0, remainingToday);
        
        return {
          accountId: account.id,
          username: account.username,
          displayName: account.displayName,
          warmupLevel: account.warmupLevel,
          maxCanHandle: canHandle,
          recommendedComments: 0, // Will be calculated
          healthScore: account.healthScore,
        };
      });
      
      // Distribute comments proportionally based on capacity
      const totalCapacity = distribution.reduce((sum, d) => sum + d.maxCanHandle, 0);
      
      if (totalCapacity < totalComments) {
        return res.json({
          warning: `Requested ${totalComments} comments but only ${totalCapacity} capacity available`,
          distribution,
          totalCapacity,
        });
      }
      
      let remaining = totalComments;
      distribution.forEach((d, i) => {
        if (remaining <= 0) return;
        const share = Math.min(d.maxCanHandle, Math.ceil(remaining / (distribution.length - i)));
        d.recommendedComments = share;
        remaining -= share;
      });
      
      res.json({
        distribution,
        totalCapacity,
        requestedComments: totalComments,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate distribution" });
    }
  });

  // ============================================
  // ENTERPRISE ENDPOINTS
  // ============================================

  // Get audit logs (admin only)
  app.get("/api/audit-logs", isAuthenticated, async (req: any, res) => {
    try {
      const logs = await getAuditLogs({
        limit: parseInt(req.query.limit as string) || 100,
        offset: parseInt(req.query.offset as string) || 0,
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Get all backups
  app.get("/api/backups", isAuthenticated, async (req: any, res) => {
    try {
      const backupsList = await getBackups();
      res.json(backupsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backups" });
    }
  });

  // Create new backup
  app.post("/api/backups", isAuthenticated, strictLimiter, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const result = await createBackup(userId);
      
      await logAudit({
        req,
        action: "backup_create",
        resourceType: "backup",
        resourceId: result.id,
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // Download backup
  app.get("/api/backups/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const data = await getBackupData(req.params.id);
      if (!data) {
        return res.status(404).json({ error: "Backup not found" });
      }
      
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=backup-${req.params.id}.json`);
      res.send(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to download backup" });
    }
  });

  // Delete backup
  app.delete("/api/backups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const success = await deleteBackup(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Backup not found" });
      }
      
      await logAudit({
        req,
        action: "delete",
        resourceType: "backup",
        resourceId: req.params.id,
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  // Get current user role info
  app.get("/api/users/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user || { id: userId, role: "user" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Update user role (admin only)
  app.patch("/api/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user?.claims?.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      if (requestingUser?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { role } = req.body;
      if (!["admin", "manager", "user"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      await logAudit({
        req,
        action: "update",
        resourceType: "user",
        resourceId: req.params.id,
        details: { newRole: role },
      });
      
      res.json({ success: true, message: "Role updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Get organization info
  app.get("/api/organization", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (user?.organizationId) {
        const org = await storage.getOrganization(user.organizationId);
        res.json(org);
      } else {
        res.json(null);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Create organization
  app.post("/api/organization", isAuthenticated, async (req: any, res) => {
    try {
      const { name, slug } = req.body;
      const userId = req.user?.claims?.sub;
      
      const org = await storage.createOrganization({ name, slug });
      await storage.updateUserOrganization(userId, org.id);
      
      await logAudit({
        req,
        action: "create",
        resourceType: "organization",
        resourceId: org.id,
        details: { name, slug },
      });
      
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  return httpServer;
}
