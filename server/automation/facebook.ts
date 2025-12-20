import { type Page } from "playwright";
import { PlatformAutomation, type CommentResult } from "./base";
import { type SocialAccount } from "@shared/schema";

export class FacebookAutomation extends PlatformAutomation {
  platform = "facebook";
  
  async performLogin(
    page: Page,
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await page.goto("https://www.facebook.com/login", {
        waitUntil: "networkidle",
      });
      
      await this.humanDelay(2000, 4000);
      
      const cookieButton = page.locator('button[data-cookiebanner="accept_button"], button:has-text("Accept")');
      if (await cookieButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cookieButton.click();
        await this.humanDelay(1000, 2000);
      }
      
      await this.humanType(page, '#email', username);
      await this.humanDelay(500, 1000);
      await this.humanType(page, '#pass', password);
      await this.humanDelay(500, 1000);
      
      await page.click('button[name="login"]');
      
      await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
      await this.humanDelay(3000, 5000);
      
      const loggedIn = await this.checkIfLoggedIn(page);
      
      if (!loggedIn) {
        const errorElement = page.locator('[data-testid="royal_login_box"] .login_error_box, ._9ay7');
        if (await errorElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          return { success: false, error: "Invalid credentials" };
        }
        
        const checkpointForm = page.locator('#checkpoint_title, [data-testid="checkpoint_title"]');
        if (await checkpointForm.isVisible({ timeout: 2000 }).catch(() => false)) {
          return { success: false, error: "Security checkpoint - manual verification required" };
        }
        
        return { success: false, error: "Login failed - unknown reason" };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
  
  async checkIfLoggedIn(page: Page): Promise<boolean> {
    try {
      const profileMenu = page.locator('[aria-label="Your profile"], [aria-label="Account"]');
      const homeButton = page.locator('[aria-label="Home"]');
      const messengerIcon = page.locator('[aria-label="Messenger"]');
      
      const isLoggedIn = await Promise.race([
        profileMenu.isVisible({ timeout: 5000 }),
        homeButton.isVisible({ timeout: 5000 }),
        messengerIcon.isVisible({ timeout: 5000 }),
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
      
      const commentBox = page.locator('[contenteditable="true"][role="textbox"], [data-testid="comment_composer_root"] [contenteditable="true"]');
      
      const firstCommentBox = commentBox.first();
      if (!await firstCommentBox.isVisible({ timeout: 5000 }).catch(() => false)) {
        const writeComment = page.locator('div:has-text("Write a comment")');
        if (await writeComment.isVisible({ timeout: 2000 }).catch(() => false)) {
          await writeComment.click();
          await this.humanDelay(1000, 2000);
        } else {
          await page.close();
          return { success: false, errorMessage: "Comment box not found - comments may be disabled" };
        }
      }
      
      await firstCommentBox.click();
      await this.humanDelay(500, 1000);
      
      await page.keyboard.type(commentText, { delay: 50 + Math.random() * 50 });
      await this.humanDelay(500, 1500);
      
      await page.keyboard.press("Enter");
      await this.humanDelay(2000, 4000);
      
      const errorMessage = page.locator('text=/couldn\'t post|error|try again/i');
      if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.close();
        return { success: false, errorMessage: "Failed to post comment" };
      }
      
      await page.close();
      return { success: true };
      
    } catch (error) {
      await page.close();
      return { success: false, errorMessage: String(error) };
    }
  }
}

export const facebookAutomation = new FacebookAutomation();
