import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export auth models (users, sessions, organizations, audit logs, backups)
export * from "./models/auth";

// Stealth settings for human-like behavior
export const stealthSettingsSchema = z.object({
  minDelay: z.number().min(30).max(300).default(60), // seconds between comments
  maxDelay: z.number().min(60).max(600).default(180),
  activeHoursStart: z.number().min(0).max(23).default(9), // 9 AM
  activeHoursEnd: z.number().min(0).max(23).default(22), // 10 PM
  maxCommentsPerHour: z.number().min(1).max(30).default(10),
  maxCommentsPerDay: z.number().min(1).max(100).default(50),
  randomizeOrder: z.boolean().default(true),
  pauseOnWeekends: z.boolean().default(false),
  humanTypingSimulation: z.boolean().default(true),
});

export type StealthSettings = z.infer<typeof stealthSettingsSchema>;

// Campaign table for storing automation campaigns
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(), // instagram, facebook, tiktok
  targetType: text("target_type").notNull(), // profile, post, or hashtag
  target: text("target").notNull(), // username, post URL, or hashtag (primary/first target)
  targets: text("targets").array(), // Additional targets for multi-target campaigns
  hashtags: text("hashtags").array(), // Hashtags for discovery targeting
  category: text("category").notNull(), // comment category
  totalComments: integer("total_comments").notNull(),
  completedComments: integer("completed_comments").notNull().default(0),
  successfulComments: integer("successful_comments").notNull().default(0),
  failedComments: integer("failed_comments").notNull().default(0),
  status: text("status").notNull().default("queued"), // queued, running, paused, completed, failed
  useAI: boolean("use_ai").notNull().default(false), // Use AI for comment generation
  postDescription: text("post_description"), // Context for AI comment generation
  stealthSettings: jsonb("stealth_settings").$type<StealthSettings>(),
  timezone: text("timezone").default("UTC"), // User's timezone for scheduling
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  nextCommentAt: timestamp("next_comment_at"),
  errorMessage: text("error_message"),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  completedComments: true,
  successfulComments: true,
  failedComments: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
  nextCommentAt: true,
  errorMessage: true,
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Scheduled comments table
export const scheduledComments = pgTable("scheduled_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  commentText: text("comment_text").notNull(),
  targetIndex: integer("target_index").notNull().default(0), // Which target in campaign this comment is for
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").notNull().default("pending"), // pending, posted, failed, skipped
  postedAt: timestamp("posted_at"),
  errorMessage: text("error_message"),
});

export const insertScheduledCommentSchema = createInsertSchema(scheduledComments).omit({
  id: true,
  postedAt: true,
  errorMessage: true,
});

export type InsertScheduledComment = z.infer<typeof insertScheduledCommentSchema>;
export type ScheduledComment = typeof scheduledComments.$inferSelect;

// Activity log for tracking all actions
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  type: text("type").notNull(), // success, error, pending, info, warning
  message: text("message").notNull(),
  platform: text("platform"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Social media accounts for multi-account rotation
export const socialAccounts = pgTable("social_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(), // instagram, facebook, tiktok
  username: text("username").notNull(),
  displayName: text("display_name"),
  // Credential reference (actual password stored in secrets)
  credentialKey: text("credential_key").notNull(), // e.g., "IG_ACCOUNT_1_PASSWORD"
  // Proxy configuration for IP rotation
  proxyHost: text("proxy_host"),
  proxyPort: integer("proxy_port"),
  proxyUsername: text("proxy_username"),
  proxyPassword: text("proxy_password"), // reference to secret key
  // Account status
  status: text("status").notNull().default("active"), // active, warming, resting, suspended, banned
  healthScore: integer("health_score").notNull().default(100), // 0-100
  // Warmup tracking
  warmupLevel: integer("warmup_level").notNull().default(0), // 0-5, determines daily limit
  warmupStartedAt: timestamp("warmup_started_at"),
  // Rest cycle management
  restingUntil: timestamp("resting_until"),
  lastRestAt: timestamp("last_rest_at"),
  // Activity counters
  commentsToday: integer("comments_today").notNull().default(0),
  commentsThisHour: integer("comments_this_hour").notNull().default(0),
  totalComments: integer("total_comments").notNull().default(0),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  // Timestamps
  lastUsedAt: timestamp("last_used_at"),
  lastHourReset: timestamp("last_hour_reset"),
  lastDayReset: timestamp("last_day_reset"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSocialAccountSchema = createInsertSchema(socialAccounts).omit({
  id: true,
  healthScore: true,
  warmupLevel: true,
  warmupStartedAt: true,
  restingUntil: true,
  lastRestAt: true,
  commentsToday: true,
  commentsThisHour: true,
  totalComments: true,
  consecutiveFailures: true,
  lastUsedAt: true,
  lastHourReset: true,
  lastDayReset: true,
  createdAt: true,
});

export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type SocialAccount = typeof socialAccounts.$inferSelect;

// Session storage for logged-in accounts
export const accountSessions = pgTable("account_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => socialAccounts.id),
  // Session data (encrypted cookies/tokens)
  sessionData: text("session_data"), // JSON string of cookies/storage state
  isValid: boolean("is_valid").notNull().default(true),
  // Timestamps
  lastValidatedAt: timestamp("last_validated_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAccountSessionSchema = createInsertSchema(accountSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertAccountSession = z.infer<typeof insertAccountSessionSchema>;
export type AccountSession = typeof accountSessions.$inferSelect;

// Per-account activity tracking for rotation decisions
export const accountActivity = pgTable("account_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => socialAccounts.id),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  commentId: varchar("comment_id").references(() => scheduledComments.id),
  actionType: text("action_type").notNull(), // comment, like, follow, login
  outcome: text("outcome").notNull(), // success, failed, rate_limited, session_expired
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAccountActivitySchema = createInsertSchema(accountActivity).omit({
  id: true,
  createdAt: true,
});

export type InsertAccountActivity = z.infer<typeof insertAccountActivitySchema>;
export type AccountActivity = typeof accountActivity.$inferSelect;

// Warmup level configurations
export const WARMUP_LIMITS = {
  0: { maxPerDay: 2, maxPerHour: 1 },   // Brand new
  1: { maxPerDay: 5, maxPerHour: 2 },   // Day 2-3
  2: { maxPerDay: 10, maxPerHour: 3 },  // Day 4-7
  3: { maxPerDay: 20, maxPerHour: 5 },  // Week 2
  4: { maxPerDay: 35, maxPerHour: 8 },  // Week 3
  5: { maxPerDay: 50, maxPerHour: 10 }, // Fully warmed
} as const;

// Custom comment templates
export const commentTemplates = pgTable("comment_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // positive, playful, sassy, dramatic, appreciative, critics, custom
  platform: text("platform"), // null means all platforms
  templates: text("templates").array().notNull(), // Array of comment texts
  isActive: boolean("is_active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCommentTemplateSchema = createInsertSchema(commentTemplates).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCommentTemplate = z.infer<typeof insertCommentTemplateSchema>;
export type CommentTemplate = typeof commentTemplates.$inferSelect;

// Engagement tracking for posted comments
export const engagementTracking = pgTable("engagement_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  scheduledCommentId: varchar("scheduled_comment_id").references(() => scheduledComments.id),
  platform: text("platform").notNull(),
  postUrl: text("post_url"),
  commentText: text("comment_text").notNull(),
  // Engagement metrics
  likes: integer("likes").notNull().default(0),
  replies: integer("replies").notNull().default(0),
  // Tracking timestamps
  postedAt: timestamp("posted_at"),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEngagementTrackingSchema = createInsertSchema(engagementTracking).omit({
  id: true,
  likes: true,
  replies: true,
  lastCheckedAt: true,
  createdAt: true,
});

export type InsertEngagementTracking = z.infer<typeof insertEngagementTrackingSchema>;
export type EngagementTracking = typeof engagementTracking.$inferSelect;

// Competitor monitoring
export const competitors = pgTable("competitors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(),
  username: text("username").notNull(),
  displayName: text("display_name"),
  profileUrl: text("profile_url"),
  // Monitoring settings
  isActive: boolean("is_active").notNull().default(true),
  checkInterval: integer("check_interval").notNull().default(60), // minutes
  autoEngage: boolean("auto_engage").notNull().default(false), // Auto-create campaigns for new posts
  engageCategory: text("engage_category").default("mixed"), // Category for auto-engagement
  // Stats
  postsTracked: integer("posts_tracked").notNull().default(0),
  lastPostAt: timestamp("last_post_at"),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompetitorSchema = createInsertSchema(competitors).omit({
  id: true,
  postsTracked: true,
  lastPostAt: true,
  lastCheckedAt: true,
  createdAt: true,
});

export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;
export type Competitor = typeof competitors.$inferSelect;

// Competitor posts tracking
export const competitorPosts = pgTable("competitor_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitorId: varchar("competitor_id").notNull().references(() => competitors.id),
  postUrl: text("post_url").notNull(),
  postType: text("post_type"), // image, video, reel, story
  caption: text("caption"),
  // Engagement stats at discovery
  likesAtDiscovery: integer("likes_at_discovery").default(0),
  commentsAtDiscovery: integer("comments_at_discovery").default(0),
  // Current stats
  currentLikes: integer("current_likes").default(0),
  currentComments: integer("current_comments").default(0),
  // Tracking
  discoveredAt: timestamp("discovered_at").defaultNow(),
  lastCheckedAt: timestamp("last_checked_at"),
  // Engagement status
  hasEngaged: boolean("has_engaged").notNull().default(false),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
});

export const insertCompetitorPostSchema = createInsertSchema(competitorPosts).omit({
  id: true,
  currentLikes: true,
  currentComments: true,
  discoveredAt: true,
  lastCheckedAt: true,
});

export type InsertCompetitorPost = z.infer<typeof insertCompetitorPostSchema>;
export type CompetitorPost = typeof competitorPosts.$inferSelect;
