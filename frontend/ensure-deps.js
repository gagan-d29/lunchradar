// Auto-installs missing dependencies before the frontend dev server / build.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED = ['react', 'react-dom', 'react-router-dom', 'vite', '@vitejs/plugin-react'];
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
