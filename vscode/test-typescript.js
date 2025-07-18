#!/usr/bin/env node

// Simple script to test TypeScript compilation
const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Testing TypeScript compilation...');

const projectRoot = '/Users/gregdunn/src/test/ai_debug_context/vscode';

// Run TypeScript compiler
const tsc = spawn('npx', ['tsc', '--noEmit'], {
  cwd: projectRoot,
  stdio: 'pipe'
});

let output = '';
let errorOutput = '';

tsc.stdout.on('data', (data) => {
  output += data.toString();
});

tsc.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

tsc.on('close', (code) => {
  if (code === 0) {
    console.log('✅ TypeScript compilation successful!');
    console.log('No TypeScript errors found.');
  } else {
    console.log('❌ TypeScript compilation failed with exit code:', code);
    if (output) {
      console.log('Output:', output);
    }
    if (errorOutput) {
      console.log('Errors:', errorOutput);
    }
  }
  
  console.log('\n🔄 Now testing npm run compile...');
  
  // Test npm compile
  const npmCompile = spawn('npm', ['run', 'compile'], {
    cwd: projectRoot,
    stdio: 'pipe'
  });
  
  let npmOutput = '';
  let npmErrorOutput = '';
  
  npmCompile.stdout.on('data', (data) => {
    npmOutput += data.toString();
  });
  
  npmCompile.stderr.on('data', (data) => {
    npmErrorOutput += data.toString();
  });
  
  npmCompile.on('close', (npmCode) => {
    if (npmCode === 0) {
      console.log('✅ npm run compile successful!');
    } else {
      console.log('❌ npm run compile failed with exit code:', npmCode);
      if (npmOutput) {
        console.log('npm Output:', npmOutput);
      }
      if (npmErrorOutput) {
        console.log('npm Errors:', npmErrorOutput);
      }
    }
    
    // Exit with the error code from the first failed command
    process.exit(code !== 0 ? code : npmCode);
  });
});
