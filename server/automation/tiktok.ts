import { type Page } from "playwright";
import { PlatformAutomation, type CommentResult } from "./base";
import { type SocialAccount } from "@shared/schema";

export class TikTokAutomation extends PlatformAutomation {
  platform = "tiktok";
  
  async performLogin(
    page: Page,
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await page.goto("https://www.tiktok.com/login/phone-or-email/email", {
        waitUntil: "networkidle",
      });
      
      await this.humanDelay(2000, 4000);
      
      const cookieButton = page.locator('button:has-text("Accept all")');
      if (await cookieButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cookieButton.click();
        await this.humanDelay(1000, 2000);
      }
      
      await this.humanType(page, 'input[name="username"], input[placeholder*="email"]', username);
      await this.humanDelay(500, 1000);
      await this.humanType(page, 'input[type="password"]', password);
      await this.humanDelay(500, 1000);
      
      await page.click('button[type="submit"]');
      
      await this.humanDelay(5000, 8000);
      
      const loggedIn = await this.checkIfLoggedIn(page);
      
      if (!loggedIn) {
        const errorElement = page.locator('[class*="error"], [class*="Error"]');
        if (await errorElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          return { success: false, error: "Invalid credentials" };
        }
        
        const captcha = page.locator('[class*="captcha"], [id*="captcha"]');
        if (await captcha.isVisible({ timeout: 2000 }).catch(() => false)) {
          return { success: false, error: "CAPTCHA verification required" };
        }
        
        return { success: false, error: "Login failed - may require manual verification" };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
  
  async checkIfLoggedIn(page: Page): Promise<boolean> {
    try {
      const profileLink = page.locator('[data-e2e="profile-icon"], [href*="/profile"]');
      const uploadButton = page.locator('[data-e2e="upload-icon"]');
      
      const isLoggedIn = await Promise.race([
        profileLink.isVisible({ timeout: 5000 }),
        uploadButton.isVisible({ timeout: 5000 }),
      ]).catch(() => false);
      
      return isLoggedIn;
    } catch {
      return false;
    }
  }
  
  async postComment(
    account: SocialAccount,
    targetUrl: string,
    commentText: string
  ): Promise<CommentResult> {
    const context = await this.getContextForAccount(account);
    if (!context) {
      return { success: false, errorMessage: "No valid session", sessionExpired: true };
    }
    
    const page = await context.newPage();
    
    try {
      await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
      await this.humanDelay(3000, 5000);
      
      if (!await this.checkIfLoggedIn(page)) {
        await page.close();
        return { success: false, errorMessage: "Session expired", sessionExpired: true };
      }
      
      const commentInput = page.locator('[data-e2e="comment-input"], [class*="CommentInputTextArea"]');
      
      if (!await commentInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        const clickToComment = page.locator('div[class*="DivCommentInputWrapper"], [data-e2e="browse-comment-input"]');
        if (await clickToComment.isVisible({ timeout: 2000 }).catch(() => false)) {
          await clickToComment.click();
          await this.humanDelay(1000, 2000);
        } else {
          await page.close();
          return { success: false, errorMessage: "Comment input not found - comments may be disabled" };
        }
      }
      
      await commentInput.click();
      await this.humanDelay(500, 1000);
      
      await page.keyboard.type(commentText, { delay: 50 + Math.random() * 50 });
      await this.humanDelay(500, 1500);
      
      const postButton = page.locator('[data-e2e="comment-post"], button:has-text("Post")');
      
      if (await postButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await postButton.click();
      } else {
        await page.keyboard.press("Enter");
      }
      
      await this.humanDelay(2000, 4000);
      
      const rateLimitWarning = page.locator('text=/too fast|rate limit|try again/i');
      if (await rateLimitWarning.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.close();
        return { success: false, errorMessage: "Rate limited", rateLimited: true };
      }
      
      await page.close();
      return { success: true };
      
    } catch (error) {
      await page.close();
      return { success: false, errorMessage: String(error) };
    }
  }
}

export const tiktokAutomation = new TikTokAutomation();
