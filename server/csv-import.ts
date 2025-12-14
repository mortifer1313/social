import { readFileSync } from 'fs';
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

// Robust CSV parser that handles quoted values with commas
function parseCSV(csvContent: string): CSVAccountRecord[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    console.log('CSV file is empty or has no data rows');
    return [];
  }
  
  const headers = parseCSVLine(lines[0]);
  console.log('CSV Headers:', headers);
  
  const records: CSVAccountRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = parseCSVLine(line);
    if (values.length >= 3) { // Minimum required fields
      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      records.push(record as CSVAccountRecord);
    } else {
      console.warn(`Skipping invalid CSV line ${i + 1}: insufficient columns`);
    }
  }
  
  console.log(`Parsed ${records.length} valid records from CSV`);
  return records;
}

// Parse a single CSV line handling quoted values with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export async function importAccountsFromCSV(csvPath: string = './accounts_export.csv'): Promise<number> {
  console.log('🔄 Starting CSV import from:', csvPath);
  
  try {
    // Check if file exists
    console.log('📁 Checking if CSV file exists...');
    const csvContent = readFileSync(csvPath, 'utf-8');
    console.log(`📄 CSV file loaded successfully (${csvContent.length} characters)`);
    
    const records = parseCSV(csvContent);

    if (records.length === 0) {
      console.warn('⚠️ No valid records found in CSV file');
      return 0;
    }

    console.log(`📊 Found ${records.length} account records in CSV`);

    const storage = new DatabaseStorage();
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const record of records) {
      console.log(`🔍 Processing record: ${record.platform}/${record.username}`);
      
      // Validate required fields
      if (!record.platform || !record.username || !record.credential_key) {
        console.warn('⚠️ Skipping invalid record (missing required fields):', {
          platform: record.platform,
          username: record.username,
          credential_key: record.credential_key ? '[PROVIDED]' : '[MISSING]'
        });
        skippedCount++;
        continue;
      }

      // Check if account already exists
      try {
        const existingAccounts = await storage.getSocialAccounts(record.platform);
        const exists = existingAccounts.find(acc => 
          acc.username === record.username && acc.platform === record.platform
        );

        if (exists) {
          console.log(`⏭️ Account already exists: ${record.platform}/${record.username}`);
          skippedCount++;
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

        console.log(`💾 Creating account: ${JSON.stringify(accountData)}`);
        await storage.createSocialAccount(accountData);
        importedCount++;
        console.log(`✅ Successfully imported: ${record.platform}/${record.username}`);
        
      } catch (error) {
        console.error(`❌ Failed to import ${record.platform}/${record.username}:`, error);
        errorCount++;
      }
    }

    console.log(`🎯 Import Summary:`);
    console.log(`   ✅ Imported: ${importedCount}`);
    console.log(`   ⏭️ Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total processed: ${records.length}`);
    
    return importedCount;
  } catch (error) {
    console.error('💥 CSV import failed:', error);
    throw error;
  }
}

// Auto-import on server startup if CSV exists
export async function autoImportAccounts(): Promise<void> {
  console.log('🚀 Auto-import: Checking if accounts need to be imported...');
  
  try {
    const storage = new DatabaseStorage();
    console.log('🔍 Auto-import: Checking existing accounts in database...');
    
    const existingAccounts = await storage.getSocialAccounts();
    console.log(`📊 Auto-import: Found ${existingAccounts.length} existing accounts in database`);
    
    // Only auto-import if no accounts exist in database
    if (existingAccounts.length === 0) {
      console.log('📂 Auto-import: No accounts found in database, attempting CSV import...');
      const importedCount = await importAccountsFromCSV();
      console.log(`🎉 Auto-import completed: ${importedCount} accounts imported`);
    } else {
      console.log(`⏭️ Auto-import: Database already has ${existingAccounts.length} accounts, skipping CSV import`);
      
      // Log some existing accounts for debugging
      const sampleAccounts = existingAccounts.slice(0, 3);
      console.log('📝 Sample existing accounts:', sampleAccounts.map(acc => `${acc.platform}/${acc.username}`));
    }
  } catch (error) {
    console.error('💥 Auto-import failed:', error);
    console.log('⚠️ Continuing server startup without CSV import');
  }
}
