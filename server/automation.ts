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
  
  // Import the actual automation module
  const { postInstagramComment: realPostInstagram } = await import('./automation/instagram');
  return await realPostInstagram(account, target, commentText, session);
}

async function postFacebookComment(
  account: SocialAccount,
  target: string,
  commentText: string,
  session: any
): Promise<PostResult> {
  console.log(`[Facebook] Posting comment to ${target} as ${account.username}`);
  console.log(`[Facebook] Comment: ${commentText.substring(0, 50)}...`);
  
  // Import the actual automation module
  const { postFacebookComment: realPostFacebook } = await import('./automation/facebook');
  return await realPostFacebook(account, target, commentText, session);
}

async function postTikTokComment(
  account: SocialAccount,
  target: string,
  commentText: string,
  session: any
): Promise<PostResult> {
  console.log(`[TikTok] Posting comment to ${target} as @${account.username}`);
  console.log(`[TikTok] Comment: ${commentText.substring(0, 50)}...`);
  
  // Import the actual automation module
  const { postTikTokComment: realPostTikTok } = await import('./automation/tiktok');
  return await realPostTikTok(account, target, commentText, session);
}

// Removed simulation function - now using real automation modules
