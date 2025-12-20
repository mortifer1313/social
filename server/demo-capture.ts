/**
 * Demo Capture Script for Client Videos
 * 
 * This creates client-friendly demo videos showing:
 * 1. The Social Media Grower app interface (campaign setup, progress)
 * 2. The RESULTS on social media platforms (posted comments visible)
 * 
 * It does NOT show the automation steps (browser navigation, typing, etc.)
 * 
 * Run with: npx tsx server/demo-capture.ts
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const ASSETS_DIR = "attached_assets/demo_videos";
const SCREENSHOTS_DIR = "attached_assets/demo_screenshots";

// Ensure directories exist
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const APP_URL = "http://localhost:5000";

async function captureAppInterface() {
  console.log("\n========================================");
  console.log("STEP 1: Capturing App Interface");
  console.log("========================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: ASSETS_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  const timestamp = Date.now();
  const screenshots: string[] = [];

  try {
    // 1. Dashboard/Home page
    console.log("[1/4] Capturing Dashboard...");
    await page.goto(APP_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    const ss1 = path.join(SCREENSHOTS_DIR, `01_dashboard_${timestamp}.png`);
    await page.screenshot({ path: ss1 });
    screenshots.push(ss1);
    console.log("   Saved: Dashboard - shows platform status and controls");

    // 2. Accounts page
    console.log("[2/4] Capturing Accounts page...");
    await page.goto(`${APP_URL}/accounts`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const ss2 = path.join(SCREENSHOTS_DIR, `02_accounts_${timestamp}.png`);
    await page.screenshot({ path: ss2 });
    screenshots.push(ss2);
    console.log("   Saved: 16 active accounts ready for automation");

    // 3. Session Import page
    console.log("[3/4] Capturing Session Import...");
    await page.goto(`${APP_URL}/session-import`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const ss3 = path.join(SCREENSHOTS_DIR, `03_session_import_${timestamp}.png`);
    await page.screenshot({ path: ss3 });
    screenshots.push(ss3);
    console.log("   Saved: Session import - how cookies are loaded");

    // 4. Recording Viewer page (if exists)
    console.log("[4/4] Capturing Recording Viewer...");
    await page.goto(`${APP_URL}/recordings`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const ss4 = path.join(SCREENSHOTS_DIR, `04_recordings_${timestamp}.png`);
    await page.screenshot({ path: ss4 });
    screenshots.push(ss4);
    console.log("   Saved: Recordings page");

    // Get video
    await page.waitForTimeout(1000);
    const video = page.video();
    await context.close();
    await browser.close();

    let videoPath = "";
    if (video) {
      const tempPath = await video.path();
      videoPath = path.join(ASSETS_DIR, `app_interface_${timestamp}.webm`);
      fs.copyFileSync(tempPath, videoPath);
      console.log(`\nApp interface video saved: ${videoPath}`);
    }

    return { screenshots, videoPath };

  } catch (error) {
    console.error("Error capturing app interface:", error);
    await context.close();
    await browser.close();
    return { screenshots, videoPath: "" };
  }
}

async function captureResultsOnly(platform: string, postUrl: string) {
  console.log(`\n========================================`);
  console.log(`STEP 2: Capturing ${platform} Results`);
  console.log(`========================================\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: ASSETS_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  const timestamp = Date.now();

  try {
    console.log(`[1/2] Navigating to ${platform} post...`);
    await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    // Scroll to show comments
    console.log("[2/2] Capturing comments section...");
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(2000);

    const ssPath = path.join(SCREENSHOTS_DIR, `${platform.toLowerCase()}_result_${timestamp}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    console.log(`   Result screenshot saved: ${ssPath}`);

    const video = page.video();
    await page.waitForTimeout(1000);
    await context.close();
    await browser.close();

    let videoPath = "";
    if (video) {
      const tempPath = await video.path();
      videoPath = path.join(ASSETS_DIR, `${platform.toLowerCase()}_result_${timestamp}.webm`);
      fs.copyFileSync(tempPath, videoPath);
      console.log(`   Result video saved: ${videoPath}`);
    }

    return { screenshot: ssPath, videoPath };

  } catch (error) {
    console.error(`Error capturing ${platform} results:`, error);
    await context.close();
    await browser.close();
    return { screenshot: "", videoPath: "" };
  }
}

async function main() {
  console.log("======================================================================");
  console.log("   CLIENT DEMO VIDEO CAPTURE");
  console.log("   Shows: App Interface → Results on Social Media");
  console.log("======================================================================");

  // Step 1: Capture the app interface
  const appCapture = await captureAppInterface();

  // Step 2: Capture results on social media (example URLs - replace with actual post URLs)
  // These would be posts where automation has already placed comments
  const examplePosts = [
    { platform: "Facebook", url: "https://www.facebook.com/PrWorxCommunications/posts/pfbid05b3UGpXPHnUz7N9DPUwejJuGHiPmUYBJqELqmVCw1rdUZVVcpUAE7FPW8zJhKqwrl" },
    { platform: "TikTok", url: "https://www.tiktok.com/@stefanlegransie" }
  ];

  const resultCaptures = [];
  for (const post of examplePosts) {
    const result = await captureResultsOnly(post.platform, post.url);
    resultCaptures.push({ ...post, ...result });
  }

  // Summary
  console.log("\n======================================================================");
  console.log("   CAPTURE SUMMARY");
  console.log("======================================================================\n");

  console.log("APP INTERFACE:");
  console.log(`  Video: ${appCapture.videoPath}`);
  console.log(`  Screenshots: ${appCapture.screenshots.length} captured`);
  appCapture.screenshots.forEach(s => console.log(`    - ${path.basename(s)}`));

  console.log("\nRESULTS ON PLATFORMS:");
  for (const r of resultCaptures) {
    console.log(`  ${r.platform}:`);
    console.log(`    Screenshot: ${r.screenshot ? path.basename(r.screenshot) : "failed"}`);
    console.log(`    Video: ${r.videoPath ? path.basename(r.videoPath) : "failed"}`);
  }

  console.log("\n======================================================================");
  console.log("   DEMO FILES READY");
  console.log(`   Screenshots: ${SCREENSHOTS_DIR}/`);
  console.log(`   Videos: ${ASSETS_DIR}/`);
  console.log("======================================================================\n");

  console.log("To create final client video:");
  console.log("1. Combine app interface video with result screenshots/clips");
  console.log("2. Use video editor or FFmpeg to sequence them");
  console.log("3. Add transitions and branding as needed");
}

main().catch(console.error);
