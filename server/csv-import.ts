import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import type { InsertSocialAccount } from '@shared/schema';
import { DatabaseStorage } from './storage';

export interface CSVAccountRecord {
  platform: string;
  username: string;
  credential_key: string;
  status: string;
  health_score: number;
  warmup_level: number;
}

export async function importAccountsFromCSV(csvPath: string = './accounts_export.csv'): Promise<number> {
  console.log('Loading accounts from CSV:', csvPath);
  
  try {
    const csvContent = readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CSVAccountRecord[];

    console.log(`Found ${records.length} account records in CSV`);

    const storage = new DatabaseStorage();
    let importedCount = 0;

    for (const record of records) {
      // Validate required fields
      if (!record.platform || !record.username || !record.credential_key) {
        console.warn('Skipping invalid record:', record);
        continue;
      }

      // Check if account already exists
      const existingAccounts = await storage.getSocialAccounts(record.platform);
      const exists = existingAccounts.find(acc => 
        acc.username === record.username && acc.platform === record.platform
      );

      if (exists) {
        console.log(`Account already exists: ${record.platform}/${record.username}`);
        continue;
      }

      // Create account record
      const accountData: InsertSocialAccount = {
        platform: record.platform,
        username: record.username,
        displayName: record.username,
        credentialKey: record.credential_key,
        status: record.status || 'active'
      };

      try {
        await storage.createSocialAccount(accountData);
        importedCount++;
        console.log(`✅ Imported: ${record.platform}/${record.username}`);
      } catch (error) {
        console.error(`❌ Failed to import ${record.platform}/${record.username}:`, error);
      }
    }

    console.log(`Import completed: ${importedCount} accounts imported`);
    return importedCount;
  } catch (error) {
    console.error('CSV import failed:', error);
    throw error;
  }
}

// Auto-import on server startup if CSV exists
export async function autoImportAccounts(): Promise<void> {
  try {
    const storage = new DatabaseStorage();
    const existingAccounts = await storage.getSocialAccounts();
    
    // Only auto-import if no accounts exist in database
    if (existingAccounts.length === 0) {
      console.log('No accounts found in database, attempting CSV import...');
      await importAccountsFromCSV();
    } else {
      console.log(`Database already has ${existingAccounts.length} accounts, skipping CSV import`);
    }
  } catch (error) {
    console.log('CSV file not found or import failed, continuing without import');
  }
}