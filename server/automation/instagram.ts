import { type Page } from "playwright";
import { PlatformAutomation, type CommentResult } from "./base";
import { type SocialAccount } from "@shared/schema";

export class InstagramAutomation extends PlatformAutomation {
  platform = "instagram";
  
  async performLogin(
    page: Page,
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await page.goto("https://www.instagram.com/accounts/login/", {
        waitUntil: "networkidle",
      });
      
      await this.humanDelay(2000, 4000);
      
      const cookieButton = page.locator("button:has-text('Accept'), button:has-text('Allow')");
      if (await cookieButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cookieButton.click();
        await this.humanDelay(1000, 2000);
      }
      
      await this.humanType(page, 'input[name="username"]', username);
      await this.humanDelay(500, 1000);
      await this.humanType(page, 'input[name="password"]', password);
      await this.humanDelay(500, 1000);
      
      await page.click('button[type="submit"]');
      
      await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
      await this.humanDelay(3000, 5000);
      
      const loggedIn = await this.checkIfLoggedIn(page);
      
      if (!loggedIn) {
        const errorElement = page.locator("#slfErrorAlert, [role='alert']");
        if (await errorElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          return { success: false, error: "Invalid credentials" };
        }
        
        const twoFactorInput = page.locator('input[name="verificationCode"]');
        if (await twoFactorInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          return { success: false, error: "Two-factor authentication required" };
        }
        
        return { success: false, error: "Login failed - unknown reason" };
      }
      
      const notNowButton = page.locator("button:has-text('Not Now')");
      if (await notNowButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await notNowButton.click();
        await this.humanDelay(1000, 2000);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
  
  async checkIfLoggedIn(page: Page): Promise<boolean> {
    try {
      const profileIcon = page.locator('[aria-label="Profile"], [data-testid="user-avatar"]');
      const homeIcon = page.locator('[aria-label="Home"]');
      
      const isLoggedIn = await Promise.race([
        profileIcon.isVisible({ timeout: 5000 }),
        homeIcon.isVisible({ timeout: 5000 }),
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
      await this.humanDelay(2000, 4000);
      
      if (!await this.checkIfLoggedIn(page)) {
        await page.close();
        return { success: false, errorMessage: "Session expired", sessionExpired: true };
      }
      
      const commentInput = page.locator('textarea[placeholder*="comment"], textarea[aria-label*="comment"]');
      
      if (!await commentInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.close();
        return { success: false, errorMessage: "Comment input not found - comments may be disabled" };
      }
      
      await commentInput.click();
      await this.humanDelay(500, 1000);
      
      await this.humanType(page, 'textarea[placeholder*="comment"], textarea[aria-label*="comment"]', commentText);
      await this.humanDelay(500, 1500);
      
      const postButton = page.locator('button:has-text("Post"), [role="button"]:has-text("Post")');
      
      if (!await postButton.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await page.close();
        return { success: false, errorMessage: "Post button not enabled" };
      }
      
      await postButton.click();
      await this.humanDelay(2000, 4000);
      
      const rateLimitWarning = page.locator('text=/try again later|rate limit|too fast/i');
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

export const instagramAutomation = new InstagramAutomation();
