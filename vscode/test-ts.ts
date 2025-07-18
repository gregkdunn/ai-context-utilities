import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Function to run command and capture output
function runCommand(command: string, cwd?: string): { success: boolean; output: string } {
  try {
    const output = execSync(command, { 
      cwd: cwd || __dirname,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { success: true, output };
  } catch (error: any) {
    return { success: false, output: error.stdout + error.stderr };
  }
}

console.log('🔄 Testing TypeScript compilation...');

// Test compilation
const compileResult = runCommand('npx tsc --noEmit');
if (compileResult.success) {
  console.log('✅ TypeScript compilation successful!');
} else {
  console.log('❌ TypeScript compilation failed:');
  console.log(compileResult.output);
  process.exit(1);
}

// Test lint
console.log('\n🔄 Testing lint...');
const lintResult = runCommand('npm run lint');
if (lintResult.success) {
  console.log('✅ Lint check passed!');
} else {
  console.log('❌ Lint check failed:');
  console.log(lintResult.output);
}

// Test compilation with npm script
console.log('\n🔄 Testing npm compile...');
const npmCompileResult = runCommand('npm run compile');
if (npmCompileResult.success) {
  console.log('✅ npm compile successful!');
} else {
  console.log('❌ npm compile failed:');
  console.log(npmCompileResult.output);
}

console.log('\n🎉 All checks completed!');
