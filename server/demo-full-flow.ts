/**
 * Full End-to-End Demo with Recording
 * 
 * Records the complete automation flow:
 * 1. Opens Social Media Grower app
 * 2. Shows campaign creation/queue
 * 3. Uses imported session to post a comment on Facebook
 * 
 * Run with: npx tsx server/demo-full-flow.ts
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { storage } from "./storage";
import * as fs from "fs";
import * as path from "path";

const APP_URL = "http://localhost:5000";
const TARGET_URL = "https://www.facebook.com/share/v/1CyQrqyRoR/";

async function runFullDemo() {
  console.log("\n" + "=".repeat(70));
  console.log("   FULL END-TO-END DEMO - SOCIAL MEDIA GROWER");
  console.log("=".repeat(70) + "\n");

  // Create recordings directory
  const recordingsDir = "./attached_assets/recordings";
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  // Get the Alicia Facebook account and session
  const accounts = await storage.getSocialAccounts();
  const fbAccount = accounts.find(a => 
    a.platform === "facebook" && a.username === "alicialegransie@gmail.com"
  );
  
  if (!fbAccount) {
    console.error("Alicia account not found!");
    process.exit(1);
  }
  
  const session = await storage.getAccountSession(fbAccount.id);
  if (!session || !session.sessionData) {
    console.error("No session found! Import cookies first.");
    process.exit(1);
  }
  
  const storageState = JSON.parse(session.sessionData);
  console.log("Account: " + fbAccount.username);
  console.log("Session cookies: " + storageState.cookies.length);

  // Launch browser with recording
  console.log("\n[1/8] Launching browser with screen recording...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  
  // Create context with recording
  const context = await browser.newContext({
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1920, height: 1080 },
    },
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  
  const page = await context.newPage();
  
  try {
    // ==================== PART 1: SHOW THE APP ====================
    console.log("\n[2/8] Opening Social Media Grower app...");
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(recordingsDir, "demo_1_app_home.png") });
    console.log("       Screenshot: demo_1_app_home.png");
    
    // Navigate to Campaigns page
    console.log("\n[3/8] Navigating to Campaigns page...");
    const campaignsLink = page.locator('a[href="/campaigns"], button:has-text("Campaigns")').first();
    if (await campaignsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await campaignsLink.click();
      await page.waitForTimeout(2000);
    } else {
      // Try sidebar navigation
      await page.goto(APP_URL + "/campaigns", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: path.join(recordingsDir, "demo_2_campaigns.png") });
    console.log("       Screenshot: demo_2_campaigns.png");
    
    // Navigate to Accounts page
    console.log("\n[4/8] Showing Accounts page with session status...");
    await page.goto(APP_URL + "/accounts", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(recordingsDir, "demo_3_accounts.png") });
    console.log("       Screenshot: demo_3_accounts.png");
    
    // ==================== PART 2: FACEBOOK AUTOMATION ====================
    console.log("\n[5/8] Opening new tab for Facebook automation...");
    
    // Create a new context with Facebook session for the automation
    const fbContext = await browser.newContext({
      storageState: storageState,
      recordVideo: {
        dir: recordingsDir,
        size: { width: 1920, height: 1080 },
      },
      viewport: { width: 1920, height: 1080 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    
    const fbPage = await fbContext.newPage();
    
    // Navigate to Facebook
    console.log("\n[6/8] Navigating to Facebook (using imported session)...");
    await fbPage.goto("https://www.facebook.com", { waitUntil: "domcontentloaded", timeout: 45000 });
    await fbPage.waitForTimeout(4000);
    await fbPage.screenshot({ path: path.join(recordingsDir, "demo_4_facebook_home.png") });
    console.log("       Screenshot: demo_4_facebook_home.png");
    
    // Verify logged in
    const isLoggedIn = await fbPage.locator('[aria-label="Your profile"], [aria-label="Account"], [aria-label="Home"]')
      .isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isLoggedIn) {
      console.log("       WARNING: May not be logged in properly");
    } else {
      console.log("       SESSION ACTIVE - Logged into Facebook!");
    }
    
    // Navigate to target post
    console.log("\n[7/8] Navigating to target post...");
    await fbPage.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await fbPage.waitForTimeout(5000);
    await fbPage.screenshot({ path: path.join(recordingsDir, "demo_5_target_post.png") });
    console.log("       Screenshot: demo_5_target_post.png");
    
    // Find and interact with comment box
    console.log("\n[8/8] Finding comment box and posting comment...");
    
    // Scroll down to ensure comments are visible
    await fbPage.evaluate(() => window.scrollBy(0, 400));
    await fbPage.waitForTimeout(2000);
    
    // Try multiple approaches to find comment input
    let foundCommentBox = false;
    
    // Approach 1: Click on "Comment" link/button to open comment area
    const commentButton = fbPage.locator('span:has-text("Comment"), div[aria-label*="Comment" i]:not([aria-label*="comments" i])').first();
    if (await commentButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("       Found Comment button, clicking...");
      await commentButton.click();
      await fbPage.waitForTimeout(2000);
    }
    
    // Approach 2: Look for any contenteditable textbox
    const textboxSelectors = [
      '[contenteditable="true"][role="textbox"]',
      '[aria-label*="Write a comment" i]',
      '[aria-label*="comment" i][contenteditable="true"]',
      '[data-lexical-editor="true"]',
      'div[role="textbox"][spellcheck="true"]',
    ];
    
    for (const selector of textboxSelectors) {
      const elements = fbPage.locator(selector);
      const count = await elements.count();
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log("       Found textbox: " + selector + " (index " + i + ")");
          foundCommentBox = true;
          
          // Click to focus
          await element.click();
          await fbPage.waitForTimeout(1000);
          
          // Generate automated comment
          const timestamp = new Date().toLocaleString();
          const automatedComment = `This is amazing content! Shared from Social Media Grower at ${timestamp}`;
          
          // Type the comment character by character
          console.log("       Typing automated comment...");
          for (const char of automatedComment) {
            await fbPage.keyboard.type(char, { delay: 30 });
          }
          await fbPage.waitForTimeout(1500);
          
          await fbPage.screenshot({ path: path.join(recordingsDir, "demo_6_comment_typed.png") });
          console.log("       Screenshot: demo_6_comment_typed.png");
          
          // Submit the comment
          console.log("       Submitting comment (pressing Enter)...");
          await fbPage.keyboard.press("Enter");
          await fbPage.waitForTimeout(4000);
          
          await fbPage.screenshot({ path: path.join(recordingsDir, "demo_7_comment_posted.png") });
          console.log("       Screenshot: demo_7_comment_posted.png");
          console.log("       COMMENT POSTED SUCCESSFULLY!");
          break;
        }
      }
      if (foundCommentBox) break;
    }
    
    if (!foundCommentBox) {
      console.log("       Comment box not found after all attempts");
      console.log("       Taking final screenshot of current state...");
      await fbPage.screenshot({ path: path.join(recordingsDir, "demo_6_no_comment_box.png") });
    }
    
    // Final wait for recording
    await fbPage.waitForTimeout(3000);
    await fbPage.screenshot({ path: path.join(recordingsDir, "demo_8_final.png") });
    
    // Close Facebook context
    const fbVideo = fbPage.video();
    await fbContext.close();
    
    if (fbVideo) {
      const fbVideoPath = await fbVideo.path();
      const finalFbPath = path.join(recordingsDir, "full_demo_facebook.webm");
      fs.copyFileSync(fbVideoPath, finalFbPath);
      console.log("\nFacebook recording: " + finalFbPath);
    }
    
    // ==================== FINISH ====================
    console.log("\n" + "=".repeat(70));
    console.log("   FULL DEMO COMPLETE!");
    console.log("=".repeat(70));
    console.log("\nRecordings saved to: " + recordingsDir);
    console.log("Screenshots:");
    console.log("  - demo_1_app_home.png      (Social Media Grower home)");
    console.log("  - demo_2_campaigns.png     (Campaigns page)");
    console.log("  - demo_3_accounts.png      (Accounts with session)");
    console.log("  - demo_4_facebook_home.png (Facebook logged in)");
    console.log("  - demo_5_target_post.png   (Target post)");
    console.log("  - demo_6_comment_typed.png (Comment typed)");
    console.log("  - demo_7_comment_posted.png (Comment submitted)");
    console.log("  - demo_8_final.png         (Final state)");
    console.log("\nVideo recordings:");
    console.log("  - full_demo_facebook.webm  (Facebook automation)");
    console.log("=".repeat(70) + "\n");
    
  } catch (error) {
    console.error("\nError during demo:", error);
    await page.screenshot({ path: path.join(recordingsDir, "demo_error.png") });
  }
  
  // Get app video and close
  const appVideo = page.video();
  await context.close();
  await browser.close();
  
  if (appVideo) {
    const appVideoPath = await appVideo.path();
    const finalAppPath = path.join(recordingsDir, "full_demo_app.webm");
    fs.copyFileSync(appVideoPath, finalAppPath);
    console.log("App recording: " + finalAppPath);
  }
}

runFullDemo().catch(console.error);
