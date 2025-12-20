import { storage } from "./storage";
import type { Campaign, StealthSettings, InsertScheduledComment } from "@shared/schema";
import { rotationService } from "./rotation";
import { generateBatchAIComments } from "./ai-comments";
import { notifyCampaignCompleted, notifyCampaignFailed, notifyAccountIssue, isEmailEnabled } from "./email-notifications";

// Warmup progression job interval (runs every 15 minutes)
let warmupInterval: NodeJS.Timeout | null = null;

async function processWarmupProgression(): Promise<void> {
  try {
    const accounts = await storage.getSocialAccounts();
    
    for (const account of accounts) {
      // Progress warmup levels based on time
      if (account.status === "warming" || account.warmupStartedAt) {
        await rotationService.progressWarmup(account.id);
      }
    }
    
    // Wake up any accounts that have finished resting
    await rotationService.wakeUpRestedAccounts();
    
    // Occasionally schedule random rest for healthy accounts
    if (Math.random() < 0.1) { // 10% chance per cycle
      await rotationService.scheduleRandomRest();
    }
  } catch (error) {
    console.error("Warmup progression error:", error);
  }
}

export function startWarmupJob(): void {
  if (warmupInterval) return;
  
  console.log("Starting warmup progression job...");
  
  // Run every 15 minutes
  warmupInterval = setInterval(processWarmupProgression, 15 * 60 * 1000);
  
  // Run immediately on start
  processWarmupProgression().catch(console.error);
}

export function stopWarmupJob(): void {
  if (warmupInterval) {
    clearInterval(warmupInterval);
    warmupInterval = null;
    console.log("Warmup job stopped");
  }
}

// Feature flag for real automation (set to true when accounts are configured)
const USE_REAL_AUTOMATION = true;

// Comment templates for generating random comments
const commentTemplates: Record<string, string[]> = {
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
    "What qualifications does this person have to give medical advice?",
    "This doesn't seem to follow medical guidelines",
    "Have you consulted with a healthcare provider about this?",
    "The claims being made here seem exaggerated",
    "Is this regulated by any health authority?",
    "What's the source for these medical claims?",
    "This could be dangerous for people with certain conditions",
    "I'd recommend getting a second opinion from a doctor",
    "Are there any contraindications we should know about?",
    "This seems to contradict established medical science",
    "Where's the dosage information and safety data?",
    "Has this been tested for long-term effects?",
    "What about potential drug interactions?",
    "I'm concerned about the lack of professional oversight here",
    "This needs more rigorous scientific validation",
    "Are there any reported adverse reactions?",
    "What medical board has endorsed this?",
    "The ingredients list raises some red flags",
    "Has this passed any quality control testing?",
    "I'd want to see more transparency about the manufacturing process",
    "What's the evidence behind these therapeutic claims?",
    "This seems like it could be a health risk",
    "Are there independent lab results available?",
    "What about allergic reactions and sensitivities?",
    "Has this been tested on diverse populations?",
    "The marketing claims seem misleading",
    "I'd be careful recommending this without more data",
    "What regulatory body has approved this for use?",
    "Are there any warnings we should be aware of?",
    "This needs to be evaluated by qualified experts",
    "Where's the transparency about potential risks?",
    "Has this undergone double-blind clinical studies?",
    "The health claims seem too good to be true",
    "What's the actual mechanism of action here?",
    "Are there any known complications from this?",
    "I'd suggest consulting a pharmacist before using this",
    "This could interfere with prescription medications",
    "What about the purity and contamination testing?",
    "Has anyone reported this to health authorities?",
    "The safety profile of this product is unclear",
  ],
};

// Default stealth settings for maximum stealth
const defaultStealthSettings: StealthSettings = {
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

// Generate a random delay between min and max with some natural variance
function getRandomDelay(min: number, max: number): number {
  // Add some "human" variance - occasional longer pauses
  const baseDelay = Math.random() * (max - min) + min;
  
  // 10% chance of a longer "distraction" pause (2x-3x normal)
  if (Math.random() < 0.1) {
    return baseDelay * (2 + Math.random());
  }
  
  // 5% chance of a quick follow-up (0.5x-0.8x normal)
  if (Math.random() < 0.05) {
    return baseDelay * (0.5 + Math.random() * 0.3);
  }
  
  return baseDelay;
}

// Check if current time is within active hours
function isWithinActiveHours(settings: StealthSettings): boolean {
  const now = new Date();
  const hour = now.getHours();
  
  // Handle wraparound (e.g., activeHoursStart: 22, activeHoursEnd: 6)
  if (settings.activeHoursStart <= settings.activeHoursEnd) {
    return hour >= settings.activeHoursStart && hour < settings.activeHoursEnd;
  } else {
    return hour >= settings.activeHoursStart || hour < settings.activeHoursEnd;
  }
}

// Check if it's a weekend
function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

// Get next active time if currently outside active hours
function getNextActiveTime(settings: StealthSettings): Date {
  const now = new Date();
  const result = new Date(now);
  
  // If it's weekend and we pause on weekends, skip to Monday
  if (settings.pauseOnWeekends && isWeekend()) {
    const daysUntilMonday = now.getDay() === 0 ? 1 : 8 - now.getDay();
    result.setDate(result.getDate() + daysUntilMonday);
    result.setHours(settings.activeHoursStart, 0, 0, 0);
    return result;
  }
  
  const hour = now.getHours();
  
  if (hour < settings.activeHoursStart) {
    // Before active hours today
    result.setHours(settings.activeHoursStart, Math.floor(Math.random() * 30), 0, 0);
  } else if (hour >= settings.activeHoursEnd) {
    // After active hours, schedule for tomorrow
    result.setDate(result.getDate() + 1);
    result.setHours(settings.activeHoursStart, Math.floor(Math.random() * 30), 0, 0);
  }
  
  return result;
}

// Generate a random comment based on category
function generateComment(category: string): string {
  let pool: string[];
  
  if (category === "mixed") {
    // Mix from all categories
    const allCategories = Object.keys(commentTemplates);
    const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
    pool = commentTemplates[randomCategory];
  } else {
    pool = commentTemplates[category] || commentTemplates.positive;
  }
  
  const comment = pool[Math.floor(Math.random() * pool.length)];
  
  // Add slight variations to make each comment unique
  const variations = [
    "", " ", "!", "!!", " ", ".", "..", " "
  ];
  const randomSuffix = variations[Math.floor(Math.random() * variations.length)];
  
  return comment + randomSuffix;
}

// Schedule comments for a campaign with stealth timing
export async function scheduleCommentsForCampaign(campaign: Campaign): Promise<void> {
  const settings: StealthSettings = campaign.stealthSettings || defaultStealthSettings;
  
  let scheduledTime = new Date();
  
  // If not within active hours, start at next active time
  if (!isWithinActiveHours(settings)) {
    scheduledTime = getNextActiveTime(settings);
  }
  
  // Add initial random delay (1-5 minutes) for natural start
  scheduledTime = new Date(scheduledTime.getTime() + (60 + Math.random() * 240) * 1000);
  
  const comments: InsertScheduledComment[] = [];
  
  // Generate comments - use AI if enabled, otherwise use templates
  let commentTexts: string[] = [];
  
  if (campaign.useAI) {
    try {
      await storage.createActivityLog({
        campaignId: campaign.id,
        type: "info",
        message: "Generating AI-powered comments...",
        platform: campaign.platform,
      });
      
      commentTexts = await generateBatchAIComments(
        {
          platform: campaign.platform,
          targetUsername: campaign.target,
          postDescription: campaign.postDescription || undefined,
          category: campaign.category,
        },
        campaign.totalComments
      );
      
      // If AI didn't generate enough, fill with templates
      while (commentTexts.length < campaign.totalComments) {
        commentTexts.push(generateComment(campaign.category));
      }
      
      await storage.createActivityLog({
        campaignId: campaign.id,
        type: "success",
        message: `Generated ${commentTexts.length} AI-powered comments`,
        platform: campaign.platform,
      });
    } catch (error) {
      console.error("AI comment generation failed, falling back to templates:", error);
      await storage.createActivityLog({
        campaignId: campaign.id,
        type: "warning",
        message: "AI generation failed, using template comments",
        platform: campaign.platform,
      });
      commentTexts = [];
    }
  }
  
  // Generate template comments if AI wasn't used or failed
  if (commentTexts.length === 0) {
    for (let i = 0; i < campaign.totalComments; i++) {
      commentTexts.push(generateComment(campaign.category));
    }
  }
  
  // Get all targets (primary target + additional targets)
  const allTargets = [campaign.target, ...(campaign.targets || [])];
  const numTargets = allTargets.length;
  
  for (let i = 0; i < campaign.totalComments; i++) {
    const commentText = commentTexts[i] || generateComment(campaign.category);
    // Distribute comments evenly across all targets
    const targetIndex = i % numTargets;
    
    comments.push({
      campaignId: campaign.id,
      commentText,
      targetIndex,
      scheduledFor: new Date(scheduledTime),
      status: "pending",
    });
    
    // Calculate next comment time
    const delay = getRandomDelay(settings.minDelay, settings.maxDelay);
    scheduledTime = new Date(scheduledTime.getTime() + delay * 1000);
    
    // Check if we've gone outside active hours
    const checkTime = new Date(scheduledTime);
    if (!isWithinActiveHours(settings)) {
      scheduledTime = getNextActiveTime(settings);
      // Add small random offset
      scheduledTime = new Date(scheduledTime.getTime() + Math.random() * 1800 * 1000);
    }
    
    // Check for weekend pause
    if (settings.pauseOnWeekends && isWeekend()) {
      scheduledTime = getNextActiveTime(settings);
    }
  }
  
  // Randomize order if enabled
  if (settings.randomizeOrder) {
    // Shuffle the scheduled times slightly (keep relative order but add variance)
    for (let i = comments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Swap scheduled times
      const temp = comments[i].scheduledFor;
      comments[i].scheduledFor = comments[j].scheduledFor;
      comments[j].scheduledFor = temp;
    }
    // Re-sort to ensure chronological order
    comments.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }
  
  // Create all scheduled comments
  for (const comment of comments) {
    await storage.createScheduledComment(comment);
  }
  
  // Update campaign with first scheduled time
  if (comments.length > 0) {
    await storage.updateCampaign(campaign.id, {
      status: "running",
      startedAt: new Date(),
      nextCommentAt: comments[0].scheduledFor,
    });
  }
  
  const aiLabel = campaign.useAI ? " (AI-generated)" : "";
  const targetLabel = numTargets > 1 ? ` across ${numTargets} targets` : "";
  await storage.createActivityLog({
    campaignId: campaign.id,
    type: "info",
    message: `Scheduled ${comments.length} comments${aiLabel}${targetLabel} with stealth timing`,
    platform: campaign.platform,
  });
}

// Process pending comments (called by scheduler)
export async function processPendingComments(): Promise<void> {
  const now = new Date();
  const pendingComments = await storage.getPendingComments(now);
  
  for (const comment of pendingComments) {
    const campaign = await storage.getCampaign(comment.campaignId);
    if (!campaign || campaign.status !== "running") {
      await storage.updateScheduledComment(comment.id, { status: "skipped" });
      continue;
    }
    
    // Get the target for this specific comment (supports multi-target campaigns)
    const allTargets = [campaign.target, ...(campaign.targets || [])];
    const targetIndex = comment.targetIndex || 0;
    const target = allTargets[targetIndex] || campaign.target;
    
    let success = false;
    let errorMessage = "";
    
    if (USE_REAL_AUTOMATION) {
      // Use real automation with account rotation
      const rotationResult = await rotationService.selectAccountForComment(campaign.platform);
      
      if (!rotationResult.account) {
        // No available account, skip this comment for now
        await storage.createActivityLog({
          campaignId: campaign.id,
          type: "warning",
          message: `No available account: ${rotationResult.reason}`,
          platform: campaign.platform,
        });
        continue;
      }
      
      // Import automation dynamically to avoid loading when not needed
      const { postComment } = await import("./automation/index");
      const result = await postComment(
        rotationResult.account,
        target,
        comment.commentText
      );
      
      success = result.success;
      errorMessage = result.errorMessage || "";
      
      // Record activity for rotation tracking
      await rotationService.recordCommentAttempt(
        rotationResult.account.id,
        success,
        campaign.id,
        comment.id,
        errorMessage
      );
      
      // Handle session expiration
      if (result.sessionExpired) {
        await storage.updateSocialAccount(rotationResult.account.id, {
          status: "suspended",
        });
      }
      
      // Handle rate limiting
      if (result.rateLimited) {
        await storage.updateSocialAccount(rotationResult.account.id, {
          status: "resting",
          restingUntil: new Date(Date.now() + 2 * 60 * 60 * 1000),
        });
      }
    } else {
      // Simulation mode - 98% success rate
      success = Math.random() > 0.02;
      errorMessage = success ? "" : "Simulated random failure";
    }
    
    if (success) {
      await storage.updateScheduledComment(comment.id, {
        status: "posted",
        postedAt: new Date(),
      });
      
      const newCompletedCount = campaign.completedComments + 1;
      
      // Get next pending comment for this campaign
      const remainingComments = await storage.getScheduledComments(campaign.id);
      const nextPending = remainingComments.find(c => c.status === "pending");
      
      const isCompleted = newCompletedCount >= campaign.totalComments;
      
      await storage.updateCampaign(campaign.id, {
        completedComments: newCompletedCount,
        nextCommentAt: nextPending?.scheduledFor || null,
        status: isCompleted ? "completed" : "running",
        completedAt: isCompleted ? new Date() : undefined,
      });
      
      await storage.createActivityLog({
        campaignId: campaign.id,
        type: "success",
        message: `Posted comment to ${target}`,
        platform: campaign.platform,
      });
      
      // Send email notification when campaign completes
      if (isCompleted && isEmailEnabled()) {
        const updatedCampaign = await storage.getCampaign(campaign.id);
        if (updatedCampaign) {
          notifyCampaignCompleted(updatedCampaign).catch(console.error);
        }
      }
    } else {
      await storage.updateScheduledComment(comment.id, {
        status: "failed",
        errorMessage,
      });
      
      await storage.createActivityLog({
        campaignId: campaign.id,
        type: "error",
        message: `Failed to post comment: ${errorMessage}`,
        platform: campaign.platform,
      });
    }
  }
}

// Scheduler interval (runs every 30 seconds)
let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduler(): void {
  if (schedulerInterval) return;
  
  console.log("Starting stealth scheduler...");
  
  schedulerInterval = setInterval(async () => {
    try {
      await processPendingComments();
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  }, 30000); // Check every 30 seconds
  
  // Run immediately on start
  processPendingComments().catch(console.error);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("Scheduler stopped");
  }
}

export { defaultStealthSettings };
