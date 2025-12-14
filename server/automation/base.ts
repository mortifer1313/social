import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { storage } from "../storage";
import { type SocialAccount } from "@shared/schema";

export interface CommentResult {
  success: boolean;
  errorMessage?: string;
  rateLimited?: boolean;
  sessionExpired?: boolean;
}

export abstract class PlatformAutomation {
  protected browser: Browser | null = null;
  protected contexts: Map<string, BrowserContext> = new Map();
  
  abstract platform: string;
  
  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });
    }
  }
  
  async getContextForAccount(account: SocialAccount): Promise<BrowserContext | null> {
    const existingContext = this.contexts.get(account.id);
    if (existingContext) {
      return existingContext;
    }
    
    const session = await storage.getAccountSession(account.id);
    if (!session || !session.sessionData) {
      return null;
    }
    
    if (!this.browser) {
      await this.initialize();
    }
    
    try {
      const storageState = JSON.parse(session.sessionData);
      const context = await this.browser!.newContext({
        storageState,
        userAgent: this.getRandomUserAgent(),
        viewport: { width: 1280, height: 800 },
      });
      
      this.contexts.set(account.id, context);
      return context;
    } catch (error) {
      console.error(`Failed to create context for ${account.username}:`, error);
      return null;
    }
  }
  
  async loginAndSaveSession(
    account: SocialAccount,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.browser) {
      await this.initialize();
    }
    
    const context = await this.browser!.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1280, height: 800 },
    });
    
    try {
      const page = await context.newPage();
      const loginResult = await this.performLogin(page, account.username, password);
      
      if (loginResult.success) {
        const storageState = await context.storageState();
        
        await storage.createAccountSession({
          accountId: account.id,
          sessionData: JSON.stringify(storageState),
          isValid: true,
          lastValidatedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        
        this.contexts.set(account.id, context);
        
        return { success: true };
      } else {
        await context.close();
        return { success: false, error: loginResult.error };
      }
    } catch (error) {
      await context.close();
      return { success: false, error: String(error) };
    }
  }
  
  abstract performLogin(
    page: Page,
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }>;
  
  abstract postComment(
    account: SocialAccount,
    targetUrl: string,
    commentText: string
  ): Promise<CommentResult>;
  
  async validateSession(account: SocialAccount): Promise<boolean> {
    const context = await this.getContextForAccount(account);
    if (!context) return false;
    
    try {
      const page = await context.newPage();
      const isValid = await this.checkIfLoggedIn(page);
      await page.close();
      return isValid;
    } catch {
      return false;
    }
  }
  
  abstract checkIfLoggedIn(page: Page): Promise<boolean>;
  
  protected getRandomUserAgent(): string {
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
  
  protected async humanDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  protected async humanType(page: Page, selector: string, text: string): Promise<void> {
    await page.click(selector);
    await this.humanDelay(500, 1000);
    
    for (const char of text) {
      await page.keyboard.type(char, { delay: 50 + Math.random() * 100 });
      
      if (Math.random() < 0.02) {
        await this.humanDelay(300, 800);
      }
    }
  }
  
  async cleanup(): Promise<void> {
    const contexts = Array.from(this.contexts.values());
    for (const context of contexts) {
      await context.close();
    }
    this.contexts.clear();
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
