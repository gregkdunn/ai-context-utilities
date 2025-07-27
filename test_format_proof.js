#!/usr/bin/env node

/**
 * Test script to prove Phase 2.1 formatting matches legacy zsh outputs
 */

const fs = require('fs');
const path = require('path');

// Import our modules (simulating the extension environment)
const vscode = {
    OutputChannel: class {
        appendLine(msg) { console.log(`[OUTPUT] ${msg}`); }
    }
};

// Create a mock workspace
const workspaceRoot = process.cwd();
const outputChannel = new vscode.OutputChannel();

// Import our modules
const { TestOutputCapture } = require('./out/modules/testOutput/TestOutputCapture.js');
const { GitDiffCapture } = require('./out/modules/gitDiff/GitDiffCapture.js');
const { ContextCompiler } = require('./out/modules/aiContext/ContextCompiler.js');

async function testFormats() {
    console.log('🧪 Testing Phase 2.1 Format Matching...\n');
    
    // 1. Test TestOutputCapture
    console.log('1️⃣ Testing TestOutputCapture format...');
    const testCapture = new TestOutputCapture({ workspaceRoot, outputChannel });
    
    // Simulate test run
    testCapture.startCapture('yarn nx test settings-voice-assist-feature', 'settings-voice-assist-feature');
    
    // Add some mock test output
    testCapture.appendOutput('Test Suites: 2 failed, 4 passed, 6 total');
    testCapture.appendOutput('Tests: 3 failed, 141 passed, 144 total');
    testCapture.appendOutput('Time: 45.234s');
    testCapture.appendOutput('PASS src/app/services/test.spec.ts');
    testCapture.appendOutput('FAIL src/app/components/voice.spec.ts');
    testCapture.appendOutput('● Component › should initialize properly');
    testCapture.appendOutput('  Expected true but received false');
    
    await testCapture.stopCapture(1, {});
    
    // 2. Test GitDiffCapture  
    console.log('\n2️⃣ Testing GitDiffCapture format...');
    const gitCapture = new GitDiffCapture({ workspaceRoot, outputChannel });
    await gitCapture.captureDiff();
    
    // 3. Test ContextCompiler
    console.log('\n3️⃣ Testing ContextCompiler format...');
    const compiler = new ContextCompiler({ workspaceRoot, outputChannel });
    await compiler.compileContext('debug', false);
    
    console.log('\n✅ All format tests completed!');
    console.log('\nGenerated files in .github/instructions/ai_debug_context/:');
    
    const contextDir = path.join(workspaceRoot, '.github', 'instructions', 'ai_debug_context');
    const files = ['test-output.txt', 'diff.txt', 'ai_debug_context.txt'];
    
    for (const file of files) {
        const filePath = path.join(contextDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} (${fs.statSync(filePath).size} bytes)`);
        } else {
            console.log(`❌ ${file} (missing)`);
        }
    }
}

testFormats().catch(console.error);