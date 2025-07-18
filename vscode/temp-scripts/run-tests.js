const { spawn } = require('child_process');
const path = require('path');

const projectDir = '/Users/gregdunn/src/test/ai_debug_context/vscode';

// First run TypeScript compilation check
console.log('Running TypeScript compilation check...');
const tscCheck = spawn('npx', ['tsc', '--noEmit', '--skipLibCheck'], {
  cwd: projectDir,
  stdio: 'pipe',
  shell: true
});

let tscOutput = '';
let tscError = '';

tscCheck.stdout.on('data', (data) => {
  tscOutput += data.toString();
});

tscCheck.stderr.on('data', (data) => {
  tscError += data.toString();
});

tscCheck.on('close', (code) => {
  console.log('TypeScript check exit code:', code);
  if (tscOutput) {
    console.log('TypeScript output:', tscOutput);
  }
  if (tscError) {
    console.log('TypeScript errors:', tscError);
  }
  
  // Now run the tests
  console.log('\nRunning tests...');
  const testProcess = spawn('npm', ['test'], {
    cwd: projectDir,
    stdio: 'pipe',
    shell: true
  });
  
  let testOutput = '';
  let testError = '';
  
  testProcess.stdout.on('data', (data) => {
    testOutput += data.toString();
  });
  
  testProcess.stderr.on('data', (data) => {
    testError += data.toString();
  });
  
  testProcess.on('close', (code) => {
    console.log('Test exit code:', code);
    if (testOutput) {
      console.log('Test output:', testOutput);
    }
    if (testError) {
      console.log('Test errors:', testError);
    }
  });
  
  testProcess.on('error', (error) => {
    console.error('Failed to start test process:', error);
  });
});

tscCheck.on('error', (error) => {
  console.error('Failed to start TypeScript check:', error);
});
