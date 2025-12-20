/**
 * Client Demo Video - Full User Experience
 * 
 * Creates a polished demo video showing the complete app journey:
 * 1. Dashboard overview
 * 2. Accounts management
 * 3. Session import process
 * 4. Starting automation
 * 5. Results on social media
 * 
 * Run with: npx tsx server/client-demo-video.ts
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = "attached_assets/client_demo";
const APP_URL = "http://localhost:5000";

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function createClientDemo() {
  const timestamp = Date.now();
  
  console.log("======================================================================");
  console.log("   SOCIAL MEDIA GROWER - CLIENT DEMO VIDEO");
  console.log("   Recording the complete user experience");
  console.log("======================================================================\n");

  const browser = await chromium.launch({ headless: true });
  
  // Create context with video recording
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  try {
    // ========================================
    // SCENE 1: Dashboard Overview
    // ========================================
    console.log("SCENE 1: Dashboard Overview");
    console.log("----------------------------");
    
    await page.goto(APP_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log("  [1.1] Showing main dashboard with platform cards");
    
    // Slowly scroll to show all content
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(2000);
    console.log("  [1.2] Scrolling to show features");
    
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);

    // ========================================
    // SCENE 2: Accounts Management
    // ========================================
    console.log("\nSCENE 2: Accounts Management");
    console.log("-----------------------------");
    
    await page.goto(`${APP_URL}/accounts`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log("  [2.1] Viewing all 16 connected accounts");
    
    // Scroll through accounts list
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(2000);
    console.log("  [2.2] Scrolling through account list");
    
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);

    // ========================================
    // SCENE 3: Session Import
    // ========================================
    console.log("\nSCENE 3: Session Import");
    console.log("------------------------");
    
    await page.goto(`${APP_URL}/session-import`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log("  [3.1] Session import page - how cookies are loaded");
    
    // Show the import interface
    await page.waitForTimeout(2000);
    console.log("  [3.2] Demonstrating cookie import workflow");

    // ========================================
    // SCENE 4: Recording Viewer
    // ========================================
    console.log("\nSCENE 4: Recording Viewer");
    console.log("--------------------------");
    
    await page.goto(`${APP_URL}/recordings`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log("  [4.1] Viewing automation recordings");

    // ========================================
    // SCENE 5: Back to Dashboard - Ready State
    // ========================================
    console.log("\nSCENE 5: System Ready");
    console.log("----------------------");
    
    await page.goto(APP_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log("  [5.1] Dashboard showing system ready for automation");
    
    await page.waitForTimeout(2000);

    // Close and save video
    console.log("\nSaving app demo video...");
    const video = page.video();
    await context.close();
    await browser.close();

    let appVideoPath = "";
    if (video) {
      const tempPath = await video.path();
      appVideoPath = path.join(OUTPUT_DIR, `app_walkthrough_${timestamp}.webm`);
      fs.copyFileSync(tempPath, appVideoPath);
      console.log(`App demo saved: ${appVideoPath}`);
    }

    // ========================================
    // SCENE 6: Results on Social Media
    // ========================================
    console.log("\n======================================================================");
    console.log("SCENE 6: Results on Social Media Platforms");
    console.log("======================================================================\n");

    // Facebook result
    const fbBrowser = await chromium.launch({ headless: true });
    const fbContext = await fbBrowser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: OUTPUT_DIR, size: { width: 1920, height: 1080 } }
    });
    const fbPage = await fbContext.newPage();
    
    console.log("  [6.1] Capturing Facebook post with comments...");
    await fbPage.goto("https://www.facebook.com/PrWorxCommunications/posts/pfbid05b3UGpXPHnUz7N9DPUwejJuGHiPmUYBJqELqmVCw1rdUZVVcpUAE7FPW8zJhKqwrl", 
      { waitUntil: "domcontentloaded", timeout: 60000 });
    await fbPage.waitForTimeout(5000);
    await fbPage.evaluate(() => window.scrollBy(0, 400));
    await fbPage.waitForTimeout(3000);
    
    const fbVideo = fbPage.video();
    await fbContext.close();
    await fbBrowser.close();
    
    let fbVideoPath = "";
    if (fbVideo) {
      const tempPath = await fbVideo.path();
      fbVideoPath = path.join(OUTPUT_DIR, `facebook_result_${timestamp}.webm`);
      fs.copyFileSync(tempPath, fbVideoPath);
      console.log(`  Facebook result saved: ${fbVideoPath}`);
    }

    // TikTok result
    const ttBrowser = await chromium.launch({ headless: true });
    const ttContext = await ttBrowser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: OUTPUT_DIR, size: { width: 1920, height: 1080 } }
    });
    const ttPage = await ttContext.newPage();
    
    console.log("  [6.2] Capturing TikTok profile with engagement...");
    await ttPage.goto("https://www.tiktok.com/@stefanlegransie", 
      { waitUntil: "domcontentloaded", timeout: 60000 });
    await ttPage.waitForTimeout(5000);
    await ttPage.evaluate(() => window.scrollBy(0, 300));
    await ttPage.waitForTimeout(3000);
    
    const ttVideo = ttPage.video();
    await ttContext.close();
    await ttBrowser.close();
    
    let ttVideoPath = "";
    if (ttVideo) {
      const tempPath = await ttVideo.path();
      ttVideoPath = path.join(OUTPUT_DIR, `tiktok_result_${timestamp}.webm`);
      fs.copyFileSync(tempPath, ttVideoPath);
      console.log(`  TikTok result saved: ${ttVideoPath}`);
    }

    // ========================================
    // Summary
    // ========================================
    console.log("\n======================================================================");
    console.log("   CLIENT DEMO COMPLETE");
    console.log("======================================================================\n");
    
    console.log("Demo videos created:");
    console.log(`  1. App Walkthrough: ${appVideoPath}`);
    console.log(`  2. Facebook Result: ${fbVideoPath}`);
    console.log(`  3. TikTok Result:   ${ttVideoPath}`);
    
    console.log("\nTo create final client video:");
    console.log("  Combine these clips in sequence:");
    console.log("  [App Walkthrough] → [Facebook Result] → [TikTok Result]");
    console.log("\n  Use FFmpeg or video editor to add:");
    console.log("  - Transitions between scenes");
    console.log("  - Text overlays explaining each step");
    console.log("  - Your branding/logo");
    
    console.log("\n======================================================================");

    return {
      appVideo: appVideoPath,
      facebookVideo: fbVideoPath,
      tiktokVideo: ttVideoPath
    };

  } catch (error) {
    console.error("Error creating demo:", error);
    await context.close();
    await browser.close();
    throw error;
  }
}

createClientDemo().catch(console.error);
