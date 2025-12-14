import { 
  type User, type InsertUser,
  type Campaign, type InsertCampaign,
  type ScheduledComment, type InsertScheduledComment,
  type ActivityLog, type InsertActivityLog,
  type SocialAccount, type InsertSocialAccount,
  type AccountSession, type InsertAccountSession,
  type AccountActivity, type InsertAccountActivity,
  users, campaigns, scheduledComments, activityLogs,
  socialAccounts, accountSessions, accountActivity
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lte, asc, or, isNull, gt } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
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
}

export const storage = new DatabaseStorage();
