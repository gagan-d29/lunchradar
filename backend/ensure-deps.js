// Auto-installs missing dependencies before the backend starts.
// Runs automatically via the "prestart" / "preseed" npm hooks, so a fresh
// clone (or a failed/interrupted install) can never cause ERR_MODULE_NOT_FOUND.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED = ['express', 'cors', 'jsonwebtoken', 'bcryptjs'];
const missing = REQUIRED.filter(
  (p) => !existsSync(path.join(__dirname, 'node_modules', p, 'package.json'))
);

if (missing.length) {
  console.log(`⏳ Missing dependencies (${missing.join(', ')}) — installing them now…`);
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Dependencies installed. Continuing…');
  } catch {
    console.error('');
    console.error('❌ npm install failed. Please run it manually in this folder:');
    console.error(`   cd "${__dirname}"`);
    console.error('   npm install');
    process.exit(1);
  }
}
