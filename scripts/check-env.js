#!/usr/bin/env node

/**
 * Environment validation script for deployment
 * Checks that required environment variables are set
 */

const requiredVars = [
  'DATABASE_URL',
  'SESSION_SECRET'
];

const optionalVars = [
  'REPL_ID',
  'OIDC_CLIENT_ID',
  'OPENAI_API_KEY',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS'
];

console.log('🔍 Checking environment variables...\n');

let hasErrors = false;

// Check required variables
console.log('Required variables:');
for (const varName of requiredVars) {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: SET`);
  }
}

// Check optional variables
console.log('\nOptional variables:');
for (const varName of optionalVars) {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚠️  ${varName}: NOT SET (optional)`);
  } else {
    console.log(`✅ ${varName}: SET`);
  }
}

if (hasErrors) {
  console.log('\n❌ Environment validation failed. Please set the missing required variables.');
  process.exit(1);
} else {
  console.log('\n✅ Environment validation passed!');
}