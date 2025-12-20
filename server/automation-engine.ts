/**
 * Real Automation Engine with Playwright
 * Handles actual browser automation for Instagram, Facebook, and TikTok
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import type { SocialAccount } from "@shared/schema";
import { storage } from "./storage";

export interface AutomationResult {
  success: boolean;
  errorMessage?: string;
  rateLimited?: boolean;
  screenshotPath?: string;
}

export interface AutomationConfig {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
  useProxy?: boolean;
}

const DEFAULT_CONFIG: AutomationConfig = {
  headless: true,
  slowMo: 50,
  timeout: 30000,
  useProxy: true,
};

// Cookie sameSite value mapping
function normalizeSameSite(value: string): "Strict" | "Lax" | "None" {
  const lower = value?.toLowerCase?.() || "lax";
  if (lower === "strict") return "Strict";
  if (lower === "none" || lower === "no_restriction") return "None";
  return "Lax";
}

// Load session cookies for account
async function loadSessionCookies(accountId: string): Promise<any[] | null> {
  const session = await storage.getAccountSession(accountId);
  if (!session?.sessionData) return null;
  
  try {
    const parsed = JSON.parse(session.sessionData);
    return parsed.cookies || parsed;
  } catch {
    return null;
  }
}

// Create browser context with session and proxy
async function createAutomationContext(
  browser: Browser,
  account: SocialAccount,
  config: AutomationConfig
): Promise<BrowserContext> {
  const contextOptions: any = {
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  // Add proxy if configured
  if (config.useProxy && account.proxyHost && account.proxyPort) {
    const proxyPassword = account.proxyPassword 
      ? process.env[account.proxyPassword] || process.env.SMARTPROXY_PASSWORD
      : process.env.SMARTPROXY_PASSWORD;
    
    contextOptions.proxy = {
      server: `http://${account.proxyHost}:${account.proxyPort}`,
      username: account.proxyUsername || undefined,
      password: proxyPassword || undefined,
    };
  }

  const context = await browser.newContext(contextOptions);
  
  // Load session cookies
  const cookies = await loadSessionCookies(account.id);
  if (cookies && cookies.length > 0) {
    const normalizedCookies = cookies.map((cookie: any) => {
      const normalized: any = {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || "/",
        httpOnly: cookie.httpOnly ?? false,
        secure: cookie.secure ?? true,
      };
      
      if (cookie.sameSite) {
        normalized.sameSite = normalizeSameSite(cookie.sameSite);
      }
      if (cookie.expirationDate || cookie.expires) {
        normalized.expires = cookie.expirationDate || cookie.expires;
      }
      
      return normalized;
    });
    
    await context.addCookies(normalizedCookies);
  }

  return context;
}

// ============================================
// INSTAGRAM AUTOMATION
// ============================================
export async function postInstagramComment(
  account: SocialAccount,
  targetUrl: string,
  commentText: string,
  config: AutomationConfig = DEFAULT_CONFIG
): Promise<AutomationResult> {
  const browser = await chromium.launch({ headless: config.headless, slowMo: config.slowMo });
  
  try {
    const context = await createAutomationContext(browser, account, config);
    const page = await context.newPage();
    
    // Navigate to Instagram
    await page.goto("https://www.instagram.com", { waitUntil: "domcontentloaded", timeout: config.timeout });
    await page.waitForTimeout(3000);
    
    // Check if logged in
    const isLoggedIn = await page.locator('svg[aria-label="Home"]').isVisible({ timeout: 5000 }).catch(() => false);
    if (!isLoggedIn) {
      await context.close();
      await browser.close();
      return { success: false, errorMessage: "Session expired - not logged in" };
    }
    
    // Navigate to target post
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: config.timeout });
    await page.waitForTimeout(3000);
    
    // Find comment textarea
    const commentSelectors = [
      'textarea[aria-label="Add a comment…"]',
      'textarea[placeholder="Add a comment…"]',
      'form textarea',
    ];
    
    let commentBox = null;
    for (const selector of commentSelectors) {
      const box = page.locator(selector).first();
      if (await box.isVisible({ timeout: 3000 }).catch(() => false)) {
        commentBox = box;
        break;
      }
    }
    
    if (!commentBox) {
      await context.close();
      await browser.close();
      return { success: false, errorMessage: "Could not find comment box" };
    }
    
    // Click to focus and type comment
    await commentBox.click();
    await page.waitForTimeout(500);
    
    // Type with human-like delays
    for (const char of commentText) {
      await page.keyboard.type(char, { delay: 50 + Math.random() * 100 });
    }
    
    await page.waitForTimeout(1000);
    
    // Find and click post button
    const postButton = page.locator('button:has-text("Post")').first();
    if (await postButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await postButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Update account activity
    await storage.updateSocialAccount(account.id, {
      commentsToday: (account.commentsToday || 0) + 1,
      commentsThisHour: (account.commentsThisHour || 0) + 1,
      totalComments: (account.totalComments || 0) + 1,
      lastUsedAt: new Date(),
    });
    
    await context.close();
    await browser.close();
    
    return { success: true };
    
  } catch (error) {
    await browser.close();
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Instagram automation failed",
    };
  }
}

// ============================================
// FACEBOOK AUTOMATION
// ============================================
export async function postFacebookComment(
  account: SocialAccount,
  targetUrl: string,
  commentText: string,
  config: AutomationConfig = DEFAULT_CONFIG
): Promise<AutomationResult> {
  const browser = await chromium.launch({ headless: config.headless, slowMo: config.slowMo });
  
  try {
    const context = await createAutomationContext(browser, account, config);
    const page = await context.newPage();
    
    // Navigate to Facebook
    await page.goto("https://www.facebook.com", { waitUntil: "domcontentloaded", timeout: config.timeout });
    await page.waitForTimeout(3000);
    
    // Check if logged in
    const profileLink = await page.locator('[aria-label="Your profile"]').isVisible({ timeout: 5000 }).catch(() => false);
    const accountLink = await page.locator('[aria-label="Account"]').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!profileLink && !accountLink) {
      await context.close();
      await browser.close();
      return { success: false, errorMessage: "Session expired - not logged in" };
    }
    
    // Navigate to target post
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: config.timeout });
    await page.waitForTimeout(4000);
    
    // Scroll to comments section
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2000);
    
    // Find comment box
    const commentSelectors = [
      '[aria-label="Write a comment"]',
      '[aria-label="Write a comment…"]',
      '[contenteditable="true"][role="textbox"]',
      'div[data-lexical-editor="true"]',
    ];
    
    let commentBox = null;
    for (const selector of commentSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        const box = page.locator(selector).first();
        if (await box.isVisible({ timeout: 2000 }).catch(() => false)) {
          commentBox = box;
          break;
        }
      } catch {}
    }
    
    if (!commentBox) {
      // Try clicking "Write a comment" area first
      const writeCommentArea = page.locator('[aria-label="Leave a comment"]').first();
      if (await writeCommentArea.isVisible({ timeout: 3000 }).catch(() => false)) {
        await writeCommentArea.click();
        await page.waitForTimeout(1500);
        commentBox = page.locator('[contenteditable="true"][role="textbox"]').first();
      }
    }
    
    if (!commentBox || !(await commentBox.isVisible({ timeout: 3000 }).catch(() => false))) {
      await context.close();
      await browser.close();
      return { success: false, errorMessage: "Could not find comment box on this post" };
    }
    
    // Click to focus
    await commentBox.click();
    await page.waitForTimeout(500);
    
    // Type comment with human-like delays
    for (const char of commentText) {
      await page.keyboard.type(char, { delay: 40 + Math.random() * 80 });
    }
    
    await page.waitForTimeout(1000);
    
    // Press Enter to post (Facebook uses Enter, not a button)
    await page.keyboard.press("Enter");
    await page.waitForTimeout(3000);
    
    // Update account activity
    await storage.updateSocialAccount(account.id, {
      commentsToday: (account.commentsToday || 0) + 1,
      commentsThisHour: (account.commentsThisHour || 0) + 1,
      totalComments: (account.totalComments || 0) + 1,
      lastUsedAt: new Date(),
    });
    
    await context.close();
    await browser.close();
    
    return { success: true };
    
  } catch (error) {
    await browser.close();
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Facebook automation failed",
    };
  }
}

// ============================================
// TIKTOK AUTOMATION
// ============================================
export async function postTikTokComment(
  account: SocialAccount,
  targetUrl: string,
  commentText: string,
  config: AutomationConfig = DEFAULT_CONFIG
): Promise<AutomationResult> {
  const browser = await chromium.launch({ headless: config.headless, slowMo: config.slowMo });
  
  try {
    const context = await createAutomationContext(browser, account, config);
    const page = await context.newPage();
    
    // Navigate to TikTok
    await page.goto("https://www.tiktok.com", { waitUntil: "domcontentloaded", timeout: config.timeout });
    await page.waitForTimeout(3000);
    
    // Check if logged in - look for profile or upload button
    const uploadBtn = await page.locator('[data-e2e="upload-icon"]').isVisible({ timeout: 5000 }).catch(() => false);
    const profileIcon = await page.locator('[data-e2e="profile-icon"]').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!uploadBtn && !profileIcon) {
      await context.close();
      await browser.close();
      return { success: false, errorMessage: "Session expired - not logged in" };
    }
    
    // Navigate to target video
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: config.timeout });
    await page.waitForTimeout(4000);
    
    // Find comment input
    const commentSelectors = [
      '[data-e2e="comment-input"]',
      'div[contenteditable="true"][data-placeholder]',
      '[placeholder*="Add comment"]',
    ];
    
    let commentBox = null;
    for (const selector of commentSelectors) {
      const box = page.locator(selector).first();
      if (await box.isVisible({ timeout: 3000 }).catch(() => false)) {
        commentBox = box;
        break;
      }
    }
    
    if (!commentBox) {
      await context.close();
      await browser.close();
      return { success: false, errorMessage: "Could not find comment box" };
    }
    
    // Click to focus
    await commentBox.click();
    await page.waitForTimeout(500);
    
    // Type comment
    for (const char of commentText) {
      await page.keyboard.type(char, { delay: 30 + Math.random() * 60 });
    }
    
    await page.waitForTimeout(1000);
    
    // Find and click post button
    const postButton = page.locator('[data-e2e="comment-post"]').first();
    if (await postButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await postButton.click();
      await page.waitForTimeout(3000);
    } else {
      // Try Enter key
      await page.keyboard.press("Enter");
      await page.waitForTimeout(3000);
    }
    
    // Update account activity
    await storage.updateSocialAccount(account.id, {
      commentsToday: (account.commentsToday || 0) + 1,
      commentsThisHour: (account.commentsThisHour || 0) + 1,
      totalComments: (account.totalComments || 0) + 1,
      lastUsedAt: new Date(),
    });
    
    await context.close();
    await browser.close();
    
    return { success: true };
    
  } catch (error) {
    await browser.close();
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "TikTok automation failed",
    };
  }
}

// ============================================
// MAIN AUTOMATION DISPATCHER
// ============================================
export async function executeComment(
  account: SocialAccount,
  targetUrl: string,
  commentText: string,
  config: AutomationConfig = DEFAULT_CONFIG
): Promise<AutomationResult> {
  console.log(`[${account.platform.toUpperCase()}] Posting comment as @${account.username}`);
  console.log(`[${account.platform.toUpperCase()}] Target: ${targetUrl}`);
  console.log(`[${account.platform.toUpperCase()}] Comment: ${commentText.substring(0, 50)}...`);
  
  let result: AutomationResult;
  
  switch (account.platform) {
    case "instagram":
      result = await postInstagramComment(account, targetUrl, commentText, config);
      break;
    case "facebook":
      result = await postFacebookComment(account, targetUrl, commentText, config);
      break;
    case "tiktok":
      result = await postTikTokComment(account, targetUrl, commentText, config);
      break;
    default:
      result = { success: false, errorMessage: `Unsupported platform: ${account.platform}` };
  }
  
  if (result.success) {
    console.log(`[${account.platform.toUpperCase()}] Comment posted successfully`);
  } else {
    console.error(`[${account.platform.toUpperCase()}] Failed: ${result.errorMessage}`);
  }
  
  return result;
}
