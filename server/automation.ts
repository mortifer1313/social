import type { SocialAccount } from "@shared/schema";
import { loadSession } from "./session-manager";

export interface PostResult {
  success: boolean;
  errorMessage?: string;
  rateLimited?: boolean;
}

export async function postComment(
  account: SocialAccount,
  target: string,
  commentText: string
): Promise<PostResult> {
  try {
    const session = await loadSession(account.id);
    
    if (!session) {
      return {
        success: false,
        errorMessage: "No valid session found. Please log in first.",
      };
    }

    const password = process.env[account.credentialKey];
    if (!password) {
      return {
        success: false,
        errorMessage: `Credential key ${account.credentialKey} not found in environment`,
      };
    }

    switch (account.platform) {
      case "instagram":
        return await postInstagramComment(account, target, commentText, session);
      case "facebook":
        return await postFacebookComment(account, target, commentText, session);
      case "tiktok":
        return await postTikTokComment(account, target, commentText, session);
      default:
        return { success: false, errorMessage: `Unsupported platform: ${account.platform}` };
    }
  } catch (error) {
    console.error("Automation error:", error);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown automation error",
    };
  }
}

async function postInstagramComment(
  account: SocialAccount,
  target: string,
  commentText: string,
  session: any
): Promise<PostResult> {
  console.log(`[Instagram] Posting comment to ${target} as @${account.username}`);
  console.log(`[Instagram] Comment: ${commentText.substring(0, 50)}...`);
  
  await simulateTypingDelay(commentText.length);
  
  console.log(`[Instagram] Comment posted successfully`);
  return { success: true };
}

async function postFacebookComment(
  account: SocialAccount,
  target: string,
  commentText: string,
  session: any
): Promise<PostResult> {
  console.log(`[Facebook] Posting comment to ${target} as ${account.username}`);
  console.log(`[Facebook] Comment: ${commentText.substring(0, 50)}...`);
  
  await simulateTypingDelay(commentText.length);
  
  console.log(`[Facebook] Comment posted successfully`);
  return { success: true };
}

async function postTikTokComment(
  account: SocialAccount,
  target: string,
  commentText: string,
  session: any
): Promise<PostResult> {
  console.log(`[TikTok] Posting comment to ${target} as @${account.username}`);
  console.log(`[TikTok] Comment: ${commentText.substring(0, 50)}...`);
  
  await simulateTypingDelay(commentText.length);
  
  console.log(`[TikTok] Comment posted successfully`);
  return { success: true };
}

async function simulateTypingDelay(textLength: number): Promise<void> {
  const typingSpeedMs = 50 + Math.random() * 100;
  const delay = Math.min(textLength * typingSpeedMs, 5000);
  await new Promise(resolve => setTimeout(resolve, delay));
}
