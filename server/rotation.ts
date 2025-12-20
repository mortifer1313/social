import { storage } from "./storage";
import { type SocialAccount, WARMUP_LIMITS } from "@shared/schema";

export interface RotationResult {
  account: SocialAccount | null;
  reason: string;
}

export class AccountRotationService {
  private platformQueues: Map<string, SocialAccount[]> = new Map();
  
  async selectAccountForComment(platform: string): Promise<RotationResult> {
    const availableAccounts = await storage.getAvailableAccountsForPlatform(platform);
    
    if (availableAccounts.length === 0) {
      return { account: null, reason: "No available accounts for this platform" };
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    
    for (const account of availableAccounts) {
      const checkResult = this.canAccountComment(account, now);
      if (checkResult.canComment) {
        return { account, reason: "Account selected" };
      }
    }
    
    return { account: null, reason: "All accounts have reached their limits" };
  }
  
  canAccountComment(account: SocialAccount, now: Date): { canComment: boolean; reason: string } {
    if (account.status === "banned" || account.status === "suspended") {
      return { canComment: false, reason: `Account is ${account.status}` };
    }
    
    if (account.status === "resting" && account.restingUntil && account.restingUntil > now) {
      return { canComment: false, reason: "Account is resting" };
    }
    
    if (account.consecutiveFailures >= 3) {
      return { canComment: false, reason: "Too many consecutive failures" };
    }
    
    const warmupLevel = Math.min(account.warmupLevel, 5) as keyof typeof WARMUP_LIMITS;
    const limits = WARMUP_LIMITS[warmupLevel];
    
    const hourlyReset = account.lastHourReset;
    const dailyReset = account.lastDayReset;
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    
    const hourlyComments = hourlyReset && hourlyReset > hourAgo ? account.commentsThisHour : 0;
    const dailyComments = dailyReset && dailyReset > dayStart ? account.commentsToday : 0;
    
    if (hourlyComments >= limits.maxPerHour) {
      return { canComment: false, reason: `Hourly limit reached (${limits.maxPerHour})` };
    }
    
    if (dailyComments >= limits.maxPerDay) {
      return { canComment: false, reason: `Daily limit reached (${limits.maxPerDay})` };
    }
    
    return { canComment: true, reason: "OK" };
  }
  
  async recordCommentAttempt(
    accountId: string, 
    success: boolean, 
    campaignId?: string,
    commentId?: string,
    errorMessage?: string
  ): Promise<void> {
    const account = await storage.getSocialAccount(accountId);
    if (!account) return;
    
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    
    const needsHourReset = !account.lastHourReset || account.lastHourReset < hourAgo;
    const needsDayReset = !account.lastDayReset || account.lastDayReset < dayStart;
    
    const updates: Partial<SocialAccount> = {
      lastUsedAt: now,
      commentsThisHour: needsHourReset ? 1 : account.commentsThisHour + 1,
      commentsToday: needsDayReset ? 1 : account.commentsToday + 1,
      totalComments: account.totalComments + 1,
      lastHourReset: needsHourReset ? now : account.lastHourReset,
      lastDayReset: needsDayReset ? now : account.lastDayReset,
    };
    
    if (success) {
      updates.consecutiveFailures = 0;
      updates.healthScore = Math.min(100, account.healthScore + 1);
    } else {
      updates.consecutiveFailures = account.consecutiveFailures + 1;
      updates.healthScore = Math.max(0, account.healthScore - 5);
      
      if (updates.consecutiveFailures >= 3) {
        updates.status = "resting";
        updates.restingUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      }
    }
    
    await storage.updateSocialAccount(accountId, updates);
    
    await storage.createAccountActivity({
      accountId,
      campaignId: campaignId || null,
      commentId: commentId || null,
      actionType: "comment",
      outcome: success ? "success" : "failed",
      errorMessage: errorMessage || null,
      metadata: null,
    });
  }
  
  async progressWarmup(accountId: string): Promise<void> {
    const account = await storage.getSocialAccount(accountId);
    if (!account || account.warmupLevel >= 5) return;
    
    if (!account.warmupStartedAt) return;
    
    const daysSinceWarmup = Math.floor(
      (Date.now() - account.warmupStartedAt.getTime()) / (24 * 60 * 60 * 1000)
    );
    
    let newLevel = 0;
    if (daysSinceWarmup >= 21) newLevel = 5;
    else if (daysSinceWarmup >= 14) newLevel = 4;
    else if (daysSinceWarmup >= 7) newLevel = 3;
    else if (daysSinceWarmup >= 3) newLevel = 2;
    else if (daysSinceWarmup >= 1) newLevel = 1;
    
    if (newLevel > account.warmupLevel) {
      await storage.updateSocialAccount(accountId, { 
        warmupLevel: newLevel,
        status: newLevel >= 5 ? "active" : "warming",
      });
      
      await storage.createActivityLog({
        type: "info",
        message: `${account.username} warmup progressed to level ${newLevel}`,
        platform: account.platform,
      });
    }
  }
  
  async scheduleRandomRest(): Promise<void> {
    const accounts = await storage.getSocialAccounts();
    const activeAccounts = accounts.filter(a => a.status === "active");
    
    for (const account of activeAccounts) {
      if (Math.random() < 0.05 && account.totalComments > 50) {
        const restHours = 12 + Math.random() * 36;
        const restingUntil = new Date(Date.now() + restHours * 60 * 60 * 1000);
        
        await storage.updateSocialAccount(account.id, {
          status: "resting",
          restingUntil,
          lastRestAt: new Date(),
        });
        
        await storage.createActivityLog({
          type: "info",
          message: `${account.username} taking scheduled rest (${Math.round(restHours)}h)`,
          platform: account.platform,
        });
      }
    }
  }
  
  async wakeUpRestedAccounts(): Promise<void> {
    const accounts = await storage.getSocialAccounts();
    const now = new Date();
    
    for (const account of accounts) {
      if (account.status === "resting" && account.restingUntil && account.restingUntil <= now) {
        await storage.updateSocialAccount(account.id, {
          status: account.warmupLevel >= 5 ? "active" : "warming",
          restingUntil: null,
        });
        
        await storage.createActivityLog({
          type: "info",
          message: `${account.username} woke up from rest`,
          platform: account.platform,
        });
      }
    }
  }
}

export const rotationService = new AccountRotationService();
