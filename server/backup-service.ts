import { db } from "./db";
import { backups, campaigns, socialAccounts, activityLogs, commentTemplates, competitors, competitorPosts, scheduledComments } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const BACKUP_DIR = "./backups";

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export async function createBackup(userId?: string, organizationId?: string): Promise<{ id: string; filePath: string }> {
  ensureBackupDir();
  
  const backupId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);
  
  const [backup] = await db.insert(backups).values({
    name: `Backup ${new Date().toLocaleString()}`,
    type: "manual",
    status: "pending",
    organizationId,
    createdBy: userId,
  }).returning();
  
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      campaigns: await db.select().from(campaigns),
      socialAccounts: await db.select().from(socialAccounts),
      activityLogs: await db.select().from(activityLogs).limit(1000),
      commentTemplates: await db.select().from(commentTemplates),
      competitors: await db.select().from(competitors),
      competitorPosts: await db.select().from(competitorPosts),
      scheduledComments: await db.select().from(scheduledComments),
    };
    
    const jsonContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonContent);
    
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    
    await db.update(backups)
      .set({ 
        status: "completed", 
        filePath, 
        size: `${sizeKB} KB`,
        completedAt: new Date() 
      })
      .where(eq(backups.id, backup.id));
    
    return { id: backup.id, filePath };
  } catch (error) {
    await db.update(backups)
      .set({ status: "failed" })
      .where(eq(backups.id, backup.id));
    throw error;
  }
}

export async function getBackups() {
  return db.select().from(backups).orderBy(backups.createdAt);
}

export async function getBackupData(backupId: string): Promise<Buffer | null> {
  const [backup] = await db.select().from(backups).where(eq(backups.id, backupId));
  
  if (!backup || !backup.filePath || !fs.existsSync(backup.filePath)) {
    return null;
  }
  
  return fs.readFileSync(backup.filePath);
}

export async function deleteBackup(backupId: string): Promise<boolean> {
  const [backup] = await db.select().from(backups).where(eq(backups.id, backupId));
  
  if (!backup) return false;
  
  if (backup.filePath && fs.existsSync(backup.filePath)) {
    fs.unlinkSync(backup.filePath);
  }
  
  await db.delete(backups).where(eq(backups.id, backupId));
  return true;
}
