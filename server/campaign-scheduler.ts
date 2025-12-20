/**
 * Campaign Scheduler with Time Zone Support
 * Handles scheduling comments with stealth timing and human-like patterns
 */

import { storage } from "./storage";
import { executeComment } from "./automation-engine";
import type { Campaign, SocialAccount, StealthSettings } from "@shared/schema";

// Default stealth settings
const DEFAULT_STEALTH: StealthSettings = {
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

// Comment templates by category
const COMMENT_TEMPLATES: Record<string, string[]> = {
  positive: [
    "This is amazing! Love seeing this kind of content!",
    "So inspiring! Keep up the great work!",
    "Absolutely incredible! Thank you for sharing!",
    "This made my day! Such positive vibes!",
    "Wow, this is exactly what I needed to see today!",
  ],
  playful: [
    "Haha, this is too good! Made me smile!",
    "Can't stop watching this! So entertaining!",
    "This energy is contagious! Love it!",
    "You always know how to brighten my day!",
    "This is pure gold! Keep them coming!",
  ],
  sassy: [
    "The way you did that... absolutely iconic!",
    "Setting the standard as always!",
    "Others wish they could do it like this!",
    "This level of excellence is rare!",
    "You really understood the assignment!",
  ],
  dramatic: [
    "I literally cannot handle how good this is!",
    "This changed my entire perspective!",
    "I'm speechless... this is everything!",
    "My jaw actually dropped watching this!",
    "This is the content I live for!",
  ],
  appreciative: [
    "Thank you so much for creating this content!",
    "Your dedication really shows in everything you do!",
    "So grateful to have discovered your page!",
    "The quality of your content is unmatched!",
    "You inspire so many people including me!",
  ],
  critics: [
    "Interesting approach, but have you considered...?",
    "I'd love to see more evidence supporting this.",
    "This raises some important questions worth exploring.",
    "Curious about the methodology behind this.",
    "Would be great to hear different perspectives on this.",
  ],
};

// Get random comment from category
export function getRandomComment(category: string): string {
  const templates = COMMENT_TEMPLATES[category] || COMMENT_TEMPLATES.positive;
  return templates[Math.floor(Math.random() * templates.length)];
}

// Calculate next comment time based on stealth settings
export function calculateNextCommentTime(
  settings: StealthSettings,
  timezone: string = "UTC"
): Date {
  const now = new Date();
  const delay = settings.minDelay + Math.random() * (settings.maxDelay - settings.minDelay);
  
  // Add random variance (10% chance of longer pause, 5% chance of quick follow-up)
  let adjustedDelay = delay;
  const variance = Math.random();
  if (variance < 0.05) {
    adjustedDelay = delay * 0.5; // Quick follow-up
  } else if (variance > 0.9) {
    adjustedDelay = delay * 2; // Longer distraction pause
  }
  
  const nextTime = new Date(now.getTime() + adjustedDelay * 1000);
  
  // Check if within active hours
  const hour = nextTime.getHours();
  if (hour < settings.activeHoursStart || hour >= settings.activeHoursEnd) {
    // Schedule for next active period
    nextTime.setHours(settings.activeHoursStart, 0, 0, 0);
    if (hour >= settings.activeHoursEnd) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
  }
  
  // Check weekend pause
  if (settings.pauseOnWeekends) {
    const day = nextTime.getDay();
    if (day === 0) {
      nextTime.setDate(nextTime.getDate() + 1); // Skip Sunday
    } else if (day === 6) {
      nextTime.setDate(nextTime.getDate() + 2); // Skip Saturday
    }
  }
  
  return nextTime;
}

// Select best account for platform
async function selectAccount(platform: string): Promise<SocialAccount | null> {
  const accounts = await storage.getAvailableAccountsForPlatform(platform);
  
  if (!accounts || accounts.length === 0) return null;
  
  // Filter accounts that haven't hit limits
  const available = accounts.filter((acc: SocialAccount) => {
    const hourLimit = 10;
    const dayLimit = 50;
    return (acc.commentsThisHour || 0) < hourLimit && (acc.commentsToday || 0) < dayLimit;
  });
  
  if (available.length === 0) return null;
  
  // Select account with least recent usage for rotation
  available.sort((a: SocialAccount, b: SocialAccount) => {
    const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
    const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
    return aTime - bTime;
  });
  
  return available[0];
}

// Process a single scheduled comment
async function processScheduledComment(comment: { id: string; campaignId: string; targetIndex: number; commentText: string; status: string }): Promise<boolean> {
  if (!comment || comment.status !== "pending") return false;
  
  const campaign = await storage.getCampaign(comment.campaignId);
  if (!campaign || campaign.status !== "running") return false;
  
  const account = await selectAccount(campaign.platform);
  if (!account) {
    await storage.updateScheduledComment(comment.id, {
      status: "skipped",
      errorMessage: "No available accounts",
    });
    return false;
  }
  
  // Get target URL
  const targets = campaign.targets || [campaign.target];
  const targetUrl = targets[comment.targetIndex] || campaign.target;
  
  // Execute the comment
  const result = await executeComment(account, targetUrl, comment.commentText);
  
  if (result.success) {
    await storage.updateScheduledComment(comment.id, {
      status: "posted",
      postedAt: new Date(),
    });
    
    // Update campaign progress
    await storage.updateCampaign(campaign.id, {
      completedComments: (campaign.completedComments || 0) + 1,
    });
    
    // Log success
    await storage.createActivityLog({
      campaignId: campaign.id,
      type: "success",
      message: `Comment posted by @${account.username}`,
      platform: campaign.platform,
    });
    
    return true;
  } else {
    await storage.updateScheduledComment(comment.id, {
      status: "failed",
      errorMessage: result.errorMessage,
    });
    
    // Log failure
    await storage.createActivityLog({
      campaignId: campaign.id,
      type: "error",
      message: `Failed: ${result.errorMessage}`,
      platform: campaign.platform,
    });
    
    return false;
  }
}

// Schedule comments for a campaign
export async function scheduleCampaignComments(campaignId: string): Promise<number> {
  const campaign = await storage.getCampaign(campaignId);
  if (!campaign) return 0;
  
  const settings = campaign.stealthSettings || DEFAULT_STEALTH;
  const category = campaign.category || "positive";
  const targets = campaign.targets || [campaign.target];
  
  let scheduledCount = 0;
  let nextTime = new Date();
  
  for (let i = 0; i < campaign.totalComments; i++) {
    // Rotate through targets
    const targetIndex = i % targets.length;
    
    // Get comment text
    const commentText = getRandomComment(category);
    
    // Calculate scheduled time
    nextTime = calculateNextCommentTime(settings);
    
    // Create scheduled comment
    await storage.createScheduledComment({
      campaignId,
      commentText,
      targetIndex,
      scheduledFor: nextTime,
      status: "pending",
    });
    
    scheduledCount++;
  }
  
  // Update campaign with next comment time
  await storage.updateCampaign(campaignId, {
    status: "running",
    startedAt: new Date(),
    nextCommentAt: nextTime,
  });
  
  return scheduledCount;
}

// Main scheduler loop
let schedulerRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduler(): void {
  if (schedulerRunning) return;
  
  schedulerRunning = true;
  console.log("[Scheduler] Starting campaign scheduler...");
  
  schedulerInterval = setInterval(async () => {
    try {
      // Get pending comments that are due
      const pendingComments = await storage.getPendingComments(new Date());
      
      for (const comment of pendingComments) {
        await processScheduledComment(comment);
        
        // Small delay between comments
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Check for completed campaigns
      const allCampaigns = await storage.getCampaigns();
      const runningCampaigns = allCampaigns.filter(c => c.status === "running");
      for (const campaign of runningCampaigns) {
        if (campaign.completedComments >= campaign.totalComments) {
          await storage.updateCampaign(campaign.id, {
            status: "completed",
            completedAt: new Date(),
          });
          
          await storage.createActivityLog({
            campaignId: campaign.id,
            type: "success",
            message: `Campaign completed: ${campaign.completedComments}/${campaign.totalComments} comments posted`,
            platform: campaign.platform,
          });
        }
      }
    } catch (error) {
      console.error("[Scheduler] Error:", error);
    }
  }, 30000); // Check every 30 seconds
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  schedulerRunning = false;
  console.log("[Scheduler] Stopped");
}

export function isSchedulerRunning(): boolean {
  return schedulerRunning;
}
