import { instagramAutomation } from "./instagram";
import { facebookAutomation } from "./facebook";
import { tiktokAutomation } from "./tiktok";
import { type PlatformAutomation, type CommentResult } from "./base";
import { type SocialAccount } from "@shared/schema";

const platformAutomations: Record<string, PlatformAutomation> = {
  instagram: instagramAutomation,
  facebook: facebookAutomation,
  tiktok: tiktokAutomation,
};

export function getAutomationForPlatform(platform: string): PlatformAutomation | null {
  return platformAutomations[platform] || null;
}

export async function postComment(
  account: SocialAccount,
  targetUrl: string,
  commentText: string
): Promise<CommentResult> {
  const automation = getAutomationForPlatform(account.platform);
  if (!automation) {
    return { success: false, errorMessage: `Unsupported platform: ${account.platform}` };
  }
  
  return automation.postComment(account, targetUrl, commentText);
}

export async function loginAccount(
  account: SocialAccount,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const automation = getAutomationForPlatform(account.platform);
  if (!automation) {
    return { success: false, error: `Unsupported platform: ${account.platform}` };
  }
  
  return automation.loginAndSaveSession(account, password);
}

export async function validateSession(account: SocialAccount): Promise<boolean> {
  const automation = getAutomationForPlatform(account.platform);
  if (!automation) {
    return false;
  }
  
  return automation.validateSession(account);
}

export async function initializeAllAutomations(): Promise<void> {
  for (const automation of Object.values(platformAutomations)) {
    await automation.initialize();
  }
}

export async function cleanupAllAutomations(): Promise<void> {
  for (const automation of Object.values(platformAutomations)) {
    await automation.cleanup();
  }
}

export { type CommentResult };
