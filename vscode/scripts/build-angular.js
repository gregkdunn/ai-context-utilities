#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ANGULAR_DIR = path.join(__dirname, '../angular-app');
const OUTPUT_DIR = path.join(__dirname, '../out/webview');

console.log('🚀 Building Angular app for VSCode extension...');

// Change to Angular directory
process.chdir(ANGULAR_DIR);

try {
  // Install dependencies if needed
  if (!fs.existsSync(path.join(ANGULAR_DIR, 'node_modules'))) {
    console.log('📦 Installing Angular dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // Build Angular app
  console.log('🔨 Building Angular production build...');
  execSync('npm run build:webview', { stdio: 'inherit' });

  // Copy built files to extension output directory
  console.log('📁 Copying built files to extension output...');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Copy files
  const distDir = path.join(ANGULAR_DIR, 'dist/ai-debug-utilities-angular');
  if (fs.existsSync(distDir)) {
    execSync(`cp -r ${distDir}/* ${OUTPUT_DIR}/`, { stdio: 'inherit' });
    console.log('✅ Angular build completed successfully!');
  } else {
    console.error('❌ Angular build output not found');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
