import { 
  type User, type UpsertUser,
  type Organization, type InsertOrganization,
  type Campaign, type InsertCampaign,
  type ScheduledComment, type InsertScheduledComment,
  type ActivityLog, type InsertActivityLog,
  type SocialAccount, type InsertSocialAccount,
  type AccountSession, type InsertAccountSession,
  type AccountActivity, type InsertAccountActivity,
  type CommentTemplate, type InsertCommentTemplate,
  type EngagementTracking, type InsertEngagementTracking,
  type Competitor, type InsertCompetitor,
  type CompetitorPost, type InsertCompetitorPost,
  users, organizations, campaigns, scheduledComments, activityLogs,
  socialAccounts, accountSessions, accountActivity,
  commentTemplates, engagementTracking, competitors, competitorPosts
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lte, asc, or, isNull, gt, lt } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserOrganization(userId: string, organizationId: string): Promise<void>;
  getLocalUsers(): Promise<User[]>;
  
  // Organizations
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  
  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;
  getActiveCampaigns(): Promise<Campaign[]>;
  
  // Scheduled Comments
  getScheduledComments(campaignId: string): Promise<ScheduledComment[]>;
  createScheduledComment(comment: InsertScheduledComment): Promise<ScheduledComment>;
  updateScheduledComment(id: string, updates: Partial<ScheduledComment>): Promise<ScheduledComment | undefined>;
  getPendingComments(beforeTime: Date): Promise<ScheduledComment[]>;
  
  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Social Accounts
  getSocialAccounts(platform?: string): Promise<SocialAccount[]>;
  getSocialAccount(id: string): Promise<SocialAccount | undefined>;
  createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount>;
  updateSocialAccount(id: string, updates: Partial<SocialAccount>): Promise<SocialAccount | undefined>;
  deleteSocialAccount(id: string): Promise<boolean>;
  getAvailableAccountsForPlatform(platform: string): Promise<SocialAccount[]>;
  
  // Account Sessions
  getAccountSession(accountId: string): Promise<AccountSession | undefined>;
  createAccountSession(session: InsertAccountSession): Promise<AccountSession>;
  updateAccountSession(id: string, updates: Partial<AccountSession>): Promise<AccountSession | undefined>;
  
  // Account Activity
  getAccountActivity(accountId: string, limit?: number): Promise<AccountActivity[]>;
  createAccountActivity(activity: InsertAccountActivity): Promise<AccountActivity>;
  
  // Comment Templates
  getCommentTemplates(category?: string): Promise<CommentTemplate[]>;
  getCommentTemplate(id: string): Promise<CommentTemplate | undefined>;
  createCommentTemplate(template: InsertCommentTemplate): Promise<CommentTemplate>;
  updateCommentTemplate(id: string, updates: Partial<CommentTemplate>): Promise<CommentTemplate | undefined>;
  deleteCommentTemplate(id: string): Promise<boolean>;
  
  // Engagement Tracking
  getEngagementTracking(campaignId?: string): Promise<EngagementTracking[]>;
  createEngagementTracking(tracking: InsertEngagementTracking): Promise<EngagementTracking>;
  updateEngagementTracking(id: string, updates: Partial<EngagementTracking>): Promise<EngagementTracking | undefined>;
  
  // Competitors
  getCompetitors(platform?: string): Promise<Competitor[]>;
  getCompetitor(id: string): Promise<Competitor | undefined>;
  createCompetitor(competitor: InsertCompetitor): Promise<Competitor>;
  updateCompetitor(id: string, updates: Partial<Competitor>): Promise<Competitor | undefined>;
  deleteCompetitor(id: string): Promise<boolean>;
  
  // Competitor Posts
  getCompetitorPosts(competitorId: string): Promise<CompetitorPost[]>;
  createCompetitorPost(post: InsertCompetitorPost): Promise<CompetitorPost>;
  updateCompetitorPost(id: string, updates: Partial<CompetitorPost>): Promise<CompetitorPost | undefined>;
  
  // Session management
  getExpiringSessions(withinHours: number): Promise<AccountSession[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUserOrganization(userId: string, organizationId: string): Promise<void> {
    await db.update(users).set({ organizationId, updatedAt: new Date() }).where(eq(users.id, userId));
  }
  
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }
  
  async getLocalUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.authProvider, "local"));
  }
  
  // Organizations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }
  
  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values(org).returning();
    return newOrg;
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const [updated] = await db.update(campaigns).set(updates).where(eq(campaigns.id, id)).returning();
    return updated;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const result = await db.delete(campaigns).where(eq(campaigns.id, id));
    return true;
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    return db.select().from(campaigns)
      .where(eq(campaigns.status, "running"))
      .orderBy(asc(campaigns.nextCommentAt));
  }

  // Scheduled Comments
  async getScheduledComments(campaignId: string): Promise<ScheduledComment[]> {
    return db.select().from(scheduledComments)
      .where(eq(scheduledComments.campaignId, campaignId))
      .orderBy(asc(scheduledComments.scheduledFor));
  }

  async createScheduledComment(comment: InsertScheduledComment): Promise<ScheduledComment> {
    const [newComment] = await db.insert(scheduledComments).values(comment).returning();
    return newComment;
  }

  async updateScheduledComment(id: string, updates: Partial<ScheduledComment>): Promise<ScheduledComment | undefined> {
    const [updated] = await db.update(scheduledComments).set(updates).where(eq(scheduledComments.id, id)).returning();
    return updated;
  }

  async getPendingComments(beforeTime: Date): Promise<ScheduledComment[]> {
    return db.select().from(scheduledComments)
      .where(and(
        eq(scheduledComments.status, "pending"),
        lte(scheduledComments.scheduledFor, beforeTime)
      ))
      .orderBy(asc(scheduledComments.scheduledFor));
  }

  // Activity Logs
  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return db.select().from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  // Social Accounts
  async getSocialAccounts(platform?: string): Promise<SocialAccount[]> {
    if (platform) {
      return db.select().from(socialAccounts)
        .where(eq(socialAccounts.platform, platform))
        .orderBy(desc(socialAccounts.createdAt));
    }
    return db.select().from(socialAccounts).orderBy(desc(socialAccounts.createdAt));
  }

  async getSocialAccount(id: string): Promise<SocialAccount | undefined> {
    const [account] = await db.select().from(socialAccounts).where(eq(socialAccounts.id, id));
    return account;
  }

  async createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount> {
    const [newAccount] = await db.insert(socialAccounts).values(account).returning();
    return newAccount;
  }

  async updateSocialAccount(id: string, updates: Partial<SocialAccount>): Promise<SocialAccount | undefined> {
    const [updated] = await db.update(socialAccounts).set(updates).where(eq(socialAccounts.id, id)).returning();
    return updated;
  }

  async deleteSocialAccount(id: string): Promise<boolean> {
    await db.delete(socialAccounts).where(eq(socialAccounts.id, id));
    return true;
  }

  async getAvailableAccountsForPlatform(platform: string): Promise<SocialAccount[]> {
    const now = new Date();
    return db.select().from(socialAccounts)
      .where(and(
        eq(socialAccounts.platform, platform),
        or(
          eq(socialAccounts.status, "active"),
          eq(socialAccounts.status, "warming")
        ),
        or(
          isNull(socialAccounts.restingUntil),
          lte(socialAccounts.restingUntil, now)
        )
      ))
      .orderBy(asc(socialAccounts.lastUsedAt));
  }

  // Account Sessions
  async getAccountSession(accountId: string): Promise<AccountSession | undefined> {
    const [session] = await db.select().from(accountSessions)
      .where(and(
        eq(accountSessions.accountId, accountId),
        eq(accountSessions.isValid, true)
      ))
      .orderBy(desc(accountSessions.createdAt));
    return session;
  }

  async createAccountSession(session: InsertAccountSession): Promise<AccountSession> {
    const [newSession] = await db.insert(accountSessions).values(session).returning();
    return newSession;
  }

  async updateAccountSession(id: string, updates: Partial<AccountSession>): Promise<AccountSession | undefined> {
    const [updated] = await db.update(accountSessions).set(updates).where(eq(accountSessions.id, id)).returning();
    return updated;
  }

  // Account Activity
  async getAccountActivity(accountId: string, limit: number = 50): Promise<AccountActivity[]> {
    return db.select().from(accountActivity)
      .where(eq(accountActivity.accountId, accountId))
      .orderBy(desc(accountActivity.createdAt))
      .limit(limit);
  }

  async createAccountActivity(activity: InsertAccountActivity): Promise<AccountActivity> {
    const [newActivity] = await db.insert(accountActivity).values(activity).returning();
    return newActivity;
  }

  // Comment Templates
  async getCommentTemplates(category?: string): Promise<CommentTemplate[]> {
    if (category) {
      return db.select().from(commentTemplates)
        .where(eq(commentTemplates.category, category))
        .orderBy(desc(commentTemplates.createdAt));
    }
    return db.select().from(commentTemplates).orderBy(desc(commentTemplates.createdAt));
  }

  async getCommentTemplate(id: string): Promise<CommentTemplate | undefined> {
    const [template] = await db.select().from(commentTemplates).where(eq(commentTemplates.id, id));
    return template;
  }

  async createCommentTemplate(template: InsertCommentTemplate): Promise<CommentTemplate> {
    const [newTemplate] = await db.insert(commentTemplates).values(template).returning();
    return newTemplate;
  }

  async updateCommentTemplate(id: string, updates: Partial<CommentTemplate>): Promise<CommentTemplate | undefined> {
    const [updated] = await db.update(commentTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(commentTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteCommentTemplate(id: string): Promise<boolean> {
    await db.delete(commentTemplates).where(eq(commentTemplates.id, id));
    return true;
  }

  // Engagement Tracking
  async getEngagementTracking(campaignId?: string): Promise<EngagementTracking[]> {
    if (campaignId) {
      return db.select().from(engagementTracking)
        .where(eq(engagementTracking.campaignId, campaignId))
        .orderBy(desc(engagementTracking.createdAt));
    }
    return db.select().from(engagementTracking).orderBy(desc(engagementTracking.createdAt));
  }

  async createEngagementTracking(tracking: InsertEngagementTracking): Promise<EngagementTracking> {
    const [newTracking] = await db.insert(engagementTracking).values(tracking).returning();
    return newTracking;
  }

  async updateEngagementTracking(id: string, updates: Partial<EngagementTracking>): Promise<EngagementTracking | undefined> {
    const [updated] = await db.update(engagementTracking)
      .set({ ...updates, lastCheckedAt: new Date() })
      .where(eq(engagementTracking.id, id))
      .returning();
    return updated;
  }

  // Competitors
  async getCompetitors(platform?: string): Promise<Competitor[]> {
    if (platform) {
      return db.select().from(competitors)
        .where(eq(competitors.platform, platform))
        .orderBy(desc(competitors.createdAt));
    }
    return db.select().from(competitors).orderBy(desc(competitors.createdAt));
  }

  async getCompetitor(id: string): Promise<Competitor | undefined> {
    const [competitor] = await db.select().from(competitors).where(eq(competitors.id, id));
    return competitor;
  }

  async createCompetitor(competitor: InsertCompetitor): Promise<Competitor> {
    const [newCompetitor] = await db.insert(competitors).values(competitor).returning();
    return newCompetitor;
  }

  async updateCompetitor(id: string, updates: Partial<Competitor>): Promise<Competitor | undefined> {
    const [updated] = await db.update(competitors)
      .set(updates)
      .where(eq(competitors.id, id))
      .returning();
    return updated;
  }

  async deleteCompetitor(id: string): Promise<boolean> {
    await db.delete(competitorPosts).where(eq(competitorPosts.competitorId, id));
    await db.delete(competitors).where(eq(competitors.id, id));
    return true;
  }

  // Competitor Posts
  async getCompetitorPosts(competitorId: string): Promise<CompetitorPost[]> {
    return db.select().from(competitorPosts)
      .where(eq(competitorPosts.competitorId, competitorId))
      .orderBy(desc(competitorPosts.discoveredAt));
  }

  async createCompetitorPost(post: InsertCompetitorPost): Promise<CompetitorPost> {
    const [newPost] = await db.insert(competitorPosts).values(post).returning();
    return newPost;
  }

  async updateCompetitorPost(id: string, updates: Partial<CompetitorPost>): Promise<CompetitorPost | undefined> {
    const [updated] = await db.update(competitorPosts)
      .set(updates)
      .where(eq(competitorPosts.id, id))
      .returning();
    return updated;
  }

  // Session management - get sessions expiring within N hours
  async getExpiringSessions(withinHours: number): Promise<AccountSession[]> {
    const futureTime = new Date(Date.now() + withinHours * 60 * 60 * 1000);
    return db.select().from(accountSessions)
      .where(and(
        eq(accountSessions.isValid, true),
        lt(accountSessions.expiresAt, futureTime)
      ))
      .orderBy(asc(accountSessions.expiresAt));
  }
}

export const storage = new DatabaseStorage();
