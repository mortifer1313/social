import { storage } from "./storage";
import type { SocialAccount, AccountSession } from "@shared/schema";

export interface BrowserSession {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  }>;
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
  userAgent?: string;
  lastValidatedAt: string;
}

export interface SessionValidationResult {
  isValid: boolean;
  reason?: string;
  session?: AccountSession;
}

export async function saveSession(
  accountId: string,
  sessionData: BrowserSession,
  expiresInHours: number = 168
): Promise<AccountSession> {
  const existingSession = await storage.getAccountSession(accountId);
  
  const sessionPayload = {
    accountId,
    sessionData: JSON.stringify(sessionData),
    isValid: true,
    lastValidatedAt: new Date(),
    expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
  };

  if (existingSession) {
    const updated = await storage.updateAccountSession(existingSession.id, sessionPayload);
    if (updated) {
      await storage.createActivityLog({
        type: "info",
        message: `Session updated for account`,
      });
      return updated;
    }
  }
  
  const newSession = await storage.createAccountSession(sessionPayload);
  
  await storage.createActivityLog({
    type: "success",
    message: `Session saved for account`,
  });
  
  return newSession;
}

export async function loadSession(accountId: string): Promise<BrowserSession | null> {
  const session = await storage.getAccountSession(accountId);
  
  if (!session || !session.isValid) {
    return null;
  }
  
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    await storage.updateAccountSession(session.id, { isValid: false });
    return null;
  }
  
  if (!session.sessionData) {
    return null;
  }
  
  try {
    return JSON.parse(session.sessionData) as BrowserSession;
  } catch {
    await storage.updateAccountSession(session.id, { isValid: false });
    return null;
  }
}

export async function invalidateSession(accountId: string, reason?: string): Promise<void> {
  const session = await storage.getAccountSession(accountId);
  
  if (session) {
    await storage.updateAccountSession(session.id, { isValid: false });
    
    await storage.createActivityLog({
      type: "warning",
      message: `Session invalidated for account: ${reason || "Manual invalidation"}`,
    });
  }
}

export async function validateSession(accountId: string): Promise<SessionValidationResult> {
  const session = await storage.getAccountSession(accountId);
  
  if (!session) {
    return { isValid: false, reason: "No session found" };
  }
  
  if (!session.isValid) {
    return { isValid: false, reason: "Session marked as invalid", session };
  }
  
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    await storage.updateAccountSession(session.id, { isValid: false });
    return { isValid: false, reason: "Session expired", session };
  }
  
  if (!session.sessionData) {
    return { isValid: false, reason: "No session data", session };
  }
  
  try {
    const data = JSON.parse(session.sessionData) as BrowserSession;
    
    if (!data.cookies || data.cookies.length === 0) {
      return { isValid: false, reason: "No cookies in session", session };
    }
    
    const expiredCookies = data.cookies.filter(c => c.expires > 0 && c.expires * 1000 < Date.now());
    const validCookies = data.cookies.filter(c => c.expires === 0 || c.expires * 1000 >= Date.now());
    
    if (validCookies.length === 0) {
      await storage.updateAccountSession(session.id, { isValid: false });
      return { isValid: false, reason: "All cookies expired", session };
    }
    
    await storage.updateAccountSession(session.id, { lastValidatedAt: new Date() });
    
    return { 
      isValid: true, 
      session,
      reason: expiredCookies.length > 0 ? `${expiredCookies.length} cookies expired, ${validCookies.length} still valid` : undefined
    };
  } catch {
    return { isValid: false, reason: "Failed to parse session data", session };
  }
}

export async function getSessionStatus(accountId: string): Promise<{
  hasSession: boolean;
  isValid: boolean;
  expiresAt: Date | null;
  lastValidatedAt: Date | null;
  cookieCount: number;
}> {
  const session = await storage.getAccountSession(accountId);
  
  if (!session) {
    return {
      hasSession: false,
      isValid: false,
      expiresAt: null,
      lastValidatedAt: null,
      cookieCount: 0,
    };
  }
  
  let cookieCount = 0;
  if (session.sessionData) {
    try {
      const data = JSON.parse(session.sessionData) as BrowserSession;
      cookieCount = data.cookies?.length || 0;
    } catch {}
  }
  
  const isExpired = session.expiresAt ? new Date(session.expiresAt) < new Date() : false;
  
  return {
    hasSession: true,
    isValid: session.isValid && !isExpired,
    expiresAt: session.expiresAt,
    lastValidatedAt: session.lastValidatedAt,
    cookieCount,
  };
}

export async function getAllSessionStatuses(): Promise<Map<string, {
  hasSession: boolean;
  isValid: boolean;
  expiresAt: Date | null;
}>> {
  const accounts = await storage.getSocialAccounts();
  const statuses = new Map<string, { hasSession: boolean; isValid: boolean; expiresAt: Date | null }>();
  
  for (const account of accounts) {
    const session = await storage.getAccountSession(account.id);
    
    if (!session) {
      statuses.set(account.id, { hasSession: false, isValid: false, expiresAt: null });
    } else {
      const isExpired = session.expiresAt ? new Date(session.expiresAt) < new Date() : false;
      statuses.set(account.id, {
        hasSession: true,
        isValid: session.isValid && !isExpired,
        expiresAt: session.expiresAt,
      });
    }
  }
  
  return statuses;
}

export async function cleanupExpiredSessions(): Promise<number> {
  const accounts = await storage.getSocialAccounts();
  let cleaned = 0;
  
  for (const account of accounts) {
    const session = await storage.getAccountSession(account.id);
    if (session && session.expiresAt && new Date(session.expiresAt) < new Date()) {
      await storage.updateAccountSession(session.id, { isValid: false });
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    await storage.createActivityLog({
      type: "info",
      message: `Cleaned up ${cleaned} expired sessions`,
    });
  }
  
  return cleaned;
}
