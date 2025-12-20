import type { Request } from "express";
import { db } from "./db";
import { auditLogs } from "@shared/schema";

export type AuditAction = 
  | "login" | "logout" 
  | "create" | "update" | "delete" 
  | "view" | "export" | "import"
  | "campaign_start" | "campaign_pause" | "campaign_cancel"
  | "session_import" | "session_invalidate"
  | "backup_create" | "backup_restore";

export type ResourceType = 
  | "user" | "campaign" | "account" | "template" 
  | "competitor" | "session" | "backup" | "organization";

interface AuditLogParams {
  req?: Request;
  userId?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, unknown>;
  organizationId?: string;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const { req, userId, action, resourceType, resourceId, details, organizationId } = params;
    
    let ipAddress: string | undefined;
    let userAgent: string | undefined;
    let resolvedUserId = userId;
    let resolvedOrgId = organizationId;
    
    if (req) {
      const forwarded = req.headers["x-forwarded-for"];
      ipAddress = typeof forwarded === "string" 
        ? forwarded.split(",")[0].trim() 
        : req.ip || req.socket.remoteAddress;
      userAgent = req.headers["user-agent"];
      
      const user = (req as any).user;
      if (user?.claims?.sub && !resolvedUserId) {
        resolvedUserId = user.claims.sub;
      }
    }
    
    await db.insert(auditLogs).values({
      userId: resolvedUserId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      organizationId: resolvedOrgId,
    });
  } catch (error) {
    console.error("[Audit] Failed to log action:", error);
  }
}

export async function getAuditLogs(options: {
  userId?: string;
  organizationId?: string;
  resourceType?: ResourceType;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}) {
  const { limit = 100, offset = 0 } = options;
  
  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(auditLogs.createdAt)
    .limit(limit)
    .offset(offset);
  
  return logs;
}
