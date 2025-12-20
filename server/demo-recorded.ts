/**
 * Automated Demo with Full Screen Recording
 * 
 * This script runs the complete automation flow:
 * 1. Login to Facebook
 * 2. Navigate to target post
 * 3. Attempt to post a comment
 * 
 * Everything is screen recorded for proof of concept.
 * Run with: npx tsx server/demo-recorded.ts
 */

import { chromium } from "playwright";
import { storage } from "./storage";

const TARGET_URL = "https://www.facebook.com/share/v/1CyQrqyRoR/";
const DEMO_COMMENT = "Automation test - " + Date.now();

async function runDemo() {
  console.log("\n" + "=".repeat(70));
  console.log("   FACEBOOK AUTOMATION DEMO - FULLY RECORDED");
  console.log("=".repeat(70) + "\n");

  // Get Facebook account
  const accounts = await storage.getSocialAccounts();
  const fbAccount = accounts.find(a => a.platform === "facebook" && a.username === "alicialegransie@gmail.com");
  
  if (!fbAccount) {
    console.error("Account not found!");
    process.exit(1);
  }
  
  console.log("Account: " + fbAccount.username);
  console.log("Credential Key: " + fbAccount.credentialKey);
  
  const password = process.env[fbAccount.credentialKey];
  if (!password) {
    console.error("Password not found in env: " + fbAccount.credentialKey);
    process.exit(1);
  }
  console.log("Password found in environment: Yes\n");

  // Launch browser with recording
  console.log("[1/7] Launching browser with screen recording...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  
  const context = await browser.newContext({
    recordVideo: {
      dir: "./recordings",
      size: { width: 1280, height: 720 },
    },
    viewport: { width: 1280, height: 720 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  
  const page = await context.newPage();
  
  try {
    // Step 2: Navigate to login
    console.log("[2/7] Navigating to Facebook login...");
    await page.goto("https://www.facebook.com/login", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: "./recordings/step2_login_page.png" });
    console.log("       Screenshot: step2_login_page.png");
    
    // Accept cookies if present
    const cookieBtn = page.locator('button[data-cookiebanner="accept_button"], button:has-text("Accept")');
    if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("       Accepting cookies...");
      await cookieBtn.click();
      await page.waitForTimeout(1500);
    }
    
    // Step 3: Enter credentials
    console.log("[3/7] Entering email...");
    await page.locator('#email').fill(fbAccount.username);
    await page.waitForTimeout(500);
    await page.screenshot({ path: "./recordings/step3_email_entered.png" });
    
    console.log("[4/7] Entering password...");
    await page.locator('#pass').fill(password);
    await page.waitForTimeout(500);
    await page.screenshot({ path: "./recordings/step4_password_entered.png" });
    
    // Step 5: Click login
    console.log("[5/7] Clicking login button...");
    await page.click('button[name="login"]');
    await page.waitForTimeout(8000);
    
    await page.screenshot({ path: "./recordings/step5_after_login.png" });
    console.log("       Screenshot: step5_after_login.png");
    
    // Check login result
    const isLoggedIn = await page.locator('[aria-label="Your profile"], [aria-label="Account"], [aria-label="Home"]')
      .isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isLoggedIn) {
      console.log("       LOGIN SUCCESSFUL!");
      
      // Save session
      console.log("[6/7] Saving session...");
      const storageState = await context.storageState();
      await storage.createAccountSession({
        accountId: fbAccount.id,
        sessionData: JSON.stringify(storageState),
        isValid: true,
        lastValidatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      console.log("       Session saved to database!");
      
      // Navigate to target
      console.log("[7/7] Navigating to target post...");
      await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "./recordings/step7_target_post.png" });
      
      // Try to post comment
      console.log("       Looking for comment box...");
      const commentBox = page.locator('[contenteditable="true"][role="textbox"]').first();
      
      if (await commentBox.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("       Found comment box! Typing...");
        await commentBox.click();
        await page.waitForTimeout(500);
        await page.keyboard.type(DEMO_COMMENT, { delay: 50 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: "./recordings/step8_comment_typed.png" });
        
        console.log("       Submitting comment...");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(3000);
        await page.screenshot({ path: "./recordings/step9_comment_submitted.png" });
        console.log("       COMMENT POSTED!");
      } else {
        console.log("       Comment box not found on this page");
        await page.screenshot({ path: "./recordings/step7_no_comment_box.png" });
      }
      
    } else {
      console.log("       Login requires verification (checkpoint detected)");
      
      // Check what type of verification
      const checkpointTitle = await page.locator('#checkpoint_title, [data-testid="checkpoint_title"]')
        .isVisible({ timeout: 2000 }).catch(() => false);
      
      if (checkpointTitle) {
        console.log("       Security checkpoint active - manual verification needed");
      }
      
      await page.screenshot({ path: "./recordings/step5_verification_required.png" });
      console.log("       Screenshot: step5_verification_required.png");
    }
    
    // Wait for recording to capture final state
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error("Error:", error);
    await page.screenshot({ path: "./recordings/error_state.png" });
  }
  
  // Get video and close
  const video = page.video();
  await context.close();
  await browser.close();
  
  // Copy recording
  if (video) {
    const videoPath = await video.path();
    console.log("\n" + "=".repeat(70));
    console.log("DEMO COMPLETE!");
    console.log("=".repeat(70));
    console.log("\nRecording saved: " + videoPath);
    
    const fs = await import("fs");
    const path = await import("path");
    
    // Copy to attached_assets
    const destPath = path.join(process.cwd(), "attached_assets", "demo_proof_of_concept.webm");
    fs.copyFileSync(videoPath, destPath);
    console.log("Copied to: attached_assets/demo_proof_of_concept.webm");
    
    // List screenshots
    console.log("\nScreenshots captured:");
    const files = fs.readdirSync("./recordings").filter(f => f.endsWith(".png"));
    files.forEach(f => console.log("  - recordings/" + f));
    
    console.log("\nView the recording at: /recording in the web app");
    console.log("=".repeat(70) + "\n");
  }
}

runDemo().catch(console.error);
