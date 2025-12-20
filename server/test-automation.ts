/**
 * Test script for Facebook automation with screen recording
 * Run with: npx tsx server/test-automation.ts
 */

import { chromium } from "playwright";
import { storage } from "./storage";
import { facebookAutomation } from "./automation/facebook";

const TARGET_URL = "https://www.facebook.com/share/v/1CyQrqyRoR/";
const TEST_COMMENT = "This is a test comment from automation - " + new Date().toISOString();

async function runTest() {
  console.log("=".repeat(60));
  console.log("FACEBOOK AUTOMATION TEST WITH SCREEN RECORDING");
  console.log("=".repeat(60));
  console.log("Target URL:", TARGET_URL);
  console.log("Test Comment:", TEST_COMMENT);
  console.log("");

  // Get a Facebook account from the database
  const accounts = await storage.getSocialAccounts();
  const fbAccount = accounts.find(a => a.platform === "facebook");
  
  if (!fbAccount) {
    console.error("No Facebook account found in database!");
    process.exit(1);
  }
  
  console.log("Using account:", fbAccount.username);
  console.log("Account ID:", fbAccount.id);
  
  // Check if we have a session
  const session = await storage.getAccountSession(fbAccount.id);
  
  if (!session || !session.isValid) {
    console.log("\nNo valid session found. Need to login first.");
    console.log("Getting password from environment...");
    
    // Get password from credential key
    const passwordKey = fbAccount.credentialKey;
    const password = process.env[passwordKey];
    
    if (!password) {
      console.error(`Password not found in environment variable: ${passwordKey}`);
      console.error("Please set this environment variable with the account password.");
      process.exit(1);
    }
    
    console.log("\nPerforming login with screen recording...");
    
    // Initialize automation and login with recording
    await facebookAutomation.initialize();
    
    // Create a browser with video recording
    const browser = await chromium.launch({
      headless: false, // Use headed mode for recording
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
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
    
    console.log("Navigating to Facebook login...");
    await page.goto("https://www.facebook.com/login", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    
    // Handle cookie consent
    const cookieButton = page.locator('button[data-cookiebanner="accept_button"], button:has-text("Accept")');
    if (await cookieButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("Accepting cookies...");
      await cookieButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Type email
    console.log("Entering email...");
    await page.locator('#email').fill(fbAccount.username);
    await page.waitForTimeout(1000);
    
    // Type password
    console.log("Entering password...");
    await page.locator('#pass').fill(password);
    await page.waitForTimeout(1000);
    
    // Click login
    console.log("Clicking login button...");
    await page.click('button[name="login"]');
    
    // Wait for navigation
    console.log("Waiting for login to complete...");
    await page.waitForTimeout(10000);
    
    // Check if logged in
    const isLoggedIn = await page.locator('[aria-label="Your profile"], [aria-label="Account"], [aria-label="Home"]')
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    
    if (isLoggedIn) {
      console.log("Login successful!");
      
      // Save session
      const storageState = await context.storageState();
      await storage.createAccountSession({
        accountId: fbAccount.id,
        sessionData: JSON.stringify(storageState),
        isValid: true,
        lastValidatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      console.log("Session saved to database.");
      
      // Now navigate to target and post comment
      console.log("\nNavigating to target post...");
      await page.goto(TARGET_URL, { waitUntil: "networkidle" });
      await page.waitForTimeout(5000);
      
      // Find and click comment box
      console.log("Looking for comment box...");
      const commentBox = page.locator('[contenteditable="true"][role="textbox"]').first();
      
      if (await commentBox.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("Found comment box, clicking...");
        await commentBox.click();
        await page.waitForTimeout(1000);
        
        // Type comment
        console.log("Typing comment...");
        await page.keyboard.type(TEST_COMMENT, { delay: 80 });
        await page.waitForTimeout(2000);
        
        // Press Enter to submit
        console.log("Submitting comment...");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(5000);
        
        console.log("\nComment posted successfully!");
      } else {
        console.log("Comment box not found. Trying to click 'Write a comment'...");
        const writeComment = page.locator('div:has-text("Write a comment")').first();
        if (await writeComment.isVisible({ timeout: 3000 }).catch(() => false)) {
          await writeComment.click();
          await page.waitForTimeout(2000);
        }
      }
    } else {
      console.log("Login failed or requires additional verification.");
      
      // Check for security checkpoint
      const checkpoint = page.locator('#checkpoint_title, [data-testid="checkpoint_title"]');
      if (await checkpoint.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log("Security checkpoint detected - manual verification required.");
      }
    }
    
    // Get video path before closing
    const video = page.video();
    await page.waitForTimeout(3000);
    await context.close();
    await browser.close();
    
    if (video) {
      const videoPath = await video.path();
      console.log("\n" + "=".repeat(60));
      console.log("RECORDING SAVED TO:", videoPath);
      console.log("=".repeat(60));
    }
    
  } else {
    console.log("\nExisting session found. Using cached login.");
    
    // Use existing session with recording
    const browser = await chromium.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    
    const storageState = JSON.parse(session.sessionData!);
    const context = await browser.newContext({
      storageState,
      recordVideo: {
        dir: "./recordings",
        size: { width: 1280, height: 720 },
      },
      viewport: { width: 1280, height: 720 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    
    const page = await context.newPage();
    
    console.log("Navigating to target post...");
    await page.goto(TARGET_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(5000);
    
    // Check if still logged in
    const isLoggedIn = await page.locator('[aria-label="Your profile"], [aria-label="Account"], [aria-label="Home"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    
    if (isLoggedIn) {
      console.log("Session is valid, logged in.");
      
      // Find and click comment box
      console.log("Looking for comment box...");
      const commentBox = page.locator('[contenteditable="true"][role="textbox"]').first();
      
      if (await commentBox.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("Found comment box, clicking...");
        await commentBox.click();
        await page.waitForTimeout(1000);
        
        // Type comment
        console.log("Typing comment...");
        await page.keyboard.type(TEST_COMMENT, { delay: 80 });
        await page.waitForTimeout(2000);
        
        // Press Enter to submit
        console.log("Submitting comment...");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(5000);
        
        console.log("\nComment posted successfully!");
      } else {
        console.log("Comment box not found on this page.");
      }
    } else {
      console.log("Session expired. Need to login again.");
      await storage.updateAccountSession(fbAccount.id, { isValid: false });
    }
    
    // Get video path
    const video = page.video();
    await page.waitForTimeout(3000);
    await context.close();
    await browser.close();
    
    if (video) {
      const videoPath = await video.path();
      console.log("\n" + "=".repeat(60));
      console.log("RECORDING SAVED TO:", videoPath);
      console.log("=".repeat(60));
    }
  }
  
  console.log("\nTest completed!");
}

runTest().catch(error => {
  console.error("Test failed:", error);
  process.exit(1);
});
