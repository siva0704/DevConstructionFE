#!/usr/bin/env node
/**
 * DEV CONSTRUCTIONS — Credential Setup Script
 * ============================================
 * Run this once to generate a hashed password and a cookie secret.
 * The output is written to server/.env
 *
 * Usage:
 *   cd server
 *   npm install
 *   node setup-credentials.js
 *
 * You will be prompted for admin username and password.
 * The password is stored as a bcrypt hash — never in plain text.
 */

import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { createInterface } from 'readline';
import { writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH  = resolve(__dirname, '.env');

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('\n=== DEV CONSTRUCTIONS — Admin Credential Setup ===\n');

  if (existsSync(ENV_PATH)) {
    const overwrite = await ask('.env already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Aborted. Existing .env preserved.');
      rl.close();
      return;
    }
  }

  const username = (await ask('Admin username [admin]: ')).trim() || 'admin';
  const password = (await ask('Admin password (min 8 chars): ')).trim();

  if (password.length < 8) {
    console.error('\n❌  Password must be at least 8 characters.');
    rl.close();
    process.exit(1);
  }

  console.log('\n⏳  Hashing password...');
  const passwordHash = await bcrypt.hash(password, 12);
  const cookieSecret = randomBytes(64).toString('hex');
  const port         = (await ask('Port [4000]: ')).trim() || '4000';
  const frontendOrigin = (await ask('Frontend origin [http://localhost:5173]: ')).trim() || 'http://localhost:5173';

  const envContent = `# DEV CONSTRUCTIONS — Server Environment Variables
# ================================================
# NEVER commit this file to git!

NODE_ENV=production
PORT=${port}

# Admin credentials
ADMIN_USERNAME=${username}
ADMIN_PASSWORD_HASH=${passwordHash}

# Random cookie signing secret (keep this secret!)
COOKIE_SECRET=${cookieSecret}

# Your deployed frontend URL (for CORS)
FRONTEND_ORIGIN=${frontendOrigin}
`;

  writeFileSync(ENV_PATH, envContent);
  rl.close();

  console.log('\n✅  Credentials configured!');
  console.log(`   File written: server/.env`);
  console.log(`   Username:     ${username}`);
  console.log(`   Password:     [bcrypt hashed, ${password.length} chars]`);
  console.log('\n   Start the server with: npm start\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
