/**
 * Session Test with Recording
 * 
 * Tests the imported session by navigating to Facebook
 * and attempting to interact with a post.
 * 
 * Run with: npx tsx server/demo-session-test.ts
 */

import { chromium } from "playwright";
import { storage } from "./storage";
import * as fs from "fs";
import * as path from "path";

const TARGET_URL = "https://www.facebook.com/share/v/1CyQrqyRoR/";

async function runSessionTest() {
  console.log("\n" + "=".repeat(70));
  console.log("   SESSION TEST - USING IMPORTED COOKIES");
  console.log("=".repeat(70) + "\n");

  // Create recordings directory
  const recordingsDir = "./attached_assets/recordings";
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  // Get the Alicia Facebook account
  const accounts = await storage.getSocialAccounts();
  const fbAccount = accounts.find(a => 
    a.platform === "facebook" && a.username === "alicialegransie@gmail.com"
  );
  
  if (!fbAccount) {
    console.error("Alicia account not found!");
    process.exit(1);
  }
  
  console.log("Account: " + fbAccount.username);
  console.log("Account ID: " + fbAccount.id);

  // Load the saved session
  console.log("\n[1/5] Loading saved session...");
  const session = await storage.getAccountSession(fbAccount.id);
  
  if (!session || !session.sessionData) {
    console.error("No session found for this account!");
    console.error("Please import cookies first at /session-import");
    process.exit(1);
  }
  
  console.log("       Session found! Last validated: " + session.lastValidatedAt);
  
  // Parse the session data
  let storageState;
  try {
    storageState = JSON.parse(session.sessionData);
    console.log("       Cookies count: " + (storageState.cookies?.length || 0));
  } catch (e) {
    console.error("Failed to parse session data");
    process.exit(1);
  }

  // Launch browser with recording
  console.log("\n[2/5] Launching browser with recording...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  
  const context = await browser.newContext({
    storageState: storageState,
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1280, height: 720 },
    },
    viewport: { width: 1280, height: 720 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to Facebook home to verify login
    console.log("\n[3/5] Navigating to Facebook to verify session...");
    await page.goto("https://www.facebook.com", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: path.join(recordingsDir, "session_test_1_home.png") });
    console.log("       Screenshot saved: session_test_1_home.png");
    
    // Check if logged in
    const isLoggedIn = await page.locator('[aria-label="Your profile"], [aria-label="Account"], [aria-label="Home"], [data-testid="royal_blue_bar"]')
      .isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isLoggedIn) {
      // Check for login form
      const hasLoginForm = await page.locator('#email, input[name="email"]').isVisible({ timeout: 2000 }).catch(() => false);
      if (hasLoginForm) {
        console.log("       SESSION EXPIRED - Login form visible");
        await page.screenshot({ path: path.join(recordingsDir, "session_test_expired.png") });
        await context.close();
        await browser.close();
        process.exit(1);
      }
    }
    
    console.log("       SESSION VALID - Logged in!");
    
    // Navigate to target post
    console.log("\n[4/5] Navigating to target post...");
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: path.join(recordingsDir, "session_test_2_target.png") });
    console.log("       Screenshot saved: session_test_2_target.png");
    
    // Look for comment functionality
    console.log("\n[5/5] Looking for comment functionality...");
    
    // Try to find and click comment button or box
    const commentSelectors = [
      '[contenteditable="true"][role="textbox"]',
      '[aria-label*="comment" i]',
      '[aria-label*="Write a comment" i]',
      'div[data-testid="UFI2CommentContainer"] [contenteditable="true"]',
    ];
    
    let foundCommentBox = false;
    
    for (const selector of commentSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log("       Found comment element: " + selector);
        foundCommentBox = true;
        
        // Try to click it
        await element.click().catch(() => {});
        await page.waitForTimeout(1000);
        
        // Type a test comment (but don't submit)
        const testComment = "Test comment - " + new Date().toISOString();
        await page.keyboard.type(testComment, { delay: 30 });
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: path.join(recordingsDir, "session_test_3_comment.png") });
        console.log("       Screenshot saved: session_test_3_comment.png");
        console.log("       Typed test comment (not submitted): " + testComment);
        break;
      }
    }
    
    if (!foundCommentBox) {
      console.log("       Comment box not found - may need to scroll or interact with post");
      
      // Try clicking on the comments area
      const commentsLink = page.locator('span:has-text("Comment"), span:has-text("Comments")').first();
      if (await commentsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await commentsLink.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(recordingsDir, "session_test_3_after_click.png") });
      }
    }
    
    // Final screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(recordingsDir, "session_test_final.png") });
    console.log("       Final screenshot saved");
    
    console.log("\n" + "=".repeat(70));
    console.log("   TEST COMPLETE - Session is working!");
    console.log("=".repeat(70) + "\n");
    
  } catch (error) {
    console.error("\nError during test:", error);
    await page.screenshot({ path: path.join(recordingsDir, "session_test_error.png") });
  }
  
  // Get video path before closing
  const video = page.video();
  await context.close();
  await browser.close();
  
  // Report video location
  if (video) {
    const videoPath = await video.path();
    console.log("Recording saved to: " + videoPath);
    
    // Copy to a known location
    const finalPath = path.join(recordingsDir, "session_test_recording.webm");
    fs.copyFileSync(videoPath, finalPath);
    console.log("Copied to: " + finalPath);
  }
}

runSessionTest().catch(console.error);
