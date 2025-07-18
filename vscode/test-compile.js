#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  console.log('🔄 Running TypeScript compilation...');
  execSync('npm run compile', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ TypeScript compilation successful!');
  
  console.log('\n🔄 Running lint check...');
  execSync('npm run lint', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Lint check passed!');
  
  console.log('\n🔄 Running tests...');
  execSync('npm test', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ All tests passed!');
  
} catch (error) {
  console.error('❌ Process failed:', error.message);
  process.exit(1);
}
