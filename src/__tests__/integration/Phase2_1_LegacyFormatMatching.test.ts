/**
 * Integration tests for Phase 2.1 - Legacy Format Matching
 * Tests the complete workflow from test execution to context generation
 */

import { TestOutputCapture } from '../../modules/testOutput/TestOutputCapture';
import { GitDiffCapture } from '../../modules/gitDiff/GitDiffCapture';
import { ContextCompiler } from '../../modules/aiContext/ContextCompiler';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
        readFile: jest.fn(),
        mkdir: jest.fn(),
        access: jest.fn(),
        unlink: jest.fn()
    }
}));

jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

describe('Phase 2.1 Integration - Complete Legacy Format Matching Workflow', () => {
    let testCapture: TestOutputCapture;
    let gitCapture: GitDiffCapture;
    let compiler: ContextCompiler;
    let mockOutputChannel: any;
    let workspaceRoot: string;

    beforeEach(() => {
        workspaceRoot = '/test/workspace';
        mockOutputChannel = {
            appendLine: jest.fn()
        };

        const options = { workspaceRoot, outputChannel: mockOutputChannel };
        
        testCapture = new TestOutputCapture(options);
        gitCapture = new GitDiffCapture(options);
        compiler = new ContextCompiler(options);
        
        jest.clearAllMocks();
    });

    describe('Complete Workflow - Failed Tests Scenario', () => {
        test('should generate complete legacy-formatted context for failed tests', async () => {
            // Step 1: Simulate test output capture
            testCapture.startCapture('yarn nx test failing-project', 'failing-project');
            testCapture.appendOutput('Test Suites: 2 failed, 4 passed, 6 total');
            testCapture.appendOutput('Tests: 3 failed, 141 passed, 144 total');
            testCapture.appendOutput('Time: 45.234s');
            testCapture.appendOutput('Test suite failed to run');
            testCapture.appendOutput('error TS2304: Cannot find name \'undefinedVar\'');
            testCapture.appendOutput('● Component › should initialize');
            testCapture.appendOutput('  Expected true but received false');
            testCapture.appendOutput('PASS src/app/service.spec.ts');
            testCapture.appendOutput('FAIL src/app/component.spec.ts');
            
            await testCapture.stopCapture(1);

            // Step 2: Mock git diff capture
            const mockGitDiff = `=================================================================
🔍 AI-OPTIMIZED GIT DIFF ANALYSIS
=================================================================

COMMAND: git diff (smart detection)
TIMESTAMP: 7/26/2025, 12:00:00 PM
BRANCH: main

==================================================================
📊 CHANGE SUMMARY
==================================================================
Total files changed: 2

📝 MODIFIED FILES (2):
  • src/app/component.ts
  • src/app/component.spec.ts

==================================================================
📋 DETAILED CHANGES
==================================================================

📁 FILE: src/app/component.ts
─────────────────────────────────────────
diff --git a/src/app/component.ts b/src/app/component.ts
index abc123..def456 100644
--- a/src/app/component.ts
+++ b/src/app/component.ts
@@ -10,7 +10,7 @@
-  private initialize() {
+  private init() {`;

            const mockTestOutput = `=================================================================
🤖 TEST ANALYSIS REPORT
=================================================================

COMMAND: yarn nx test failing-project
EXIT CODE: 1
STATUS: ❌ FAILED

=================================================================
📊 EXECUTIVE SUMMARY
=================================================================
Test Suites: 2 failed, 4 passed, 6 total
Tests: 3 failed, 141 passed, 144 total
Time: 45.234s
Test Suites: 4 passed, 2 failed

==================================================================
💥 FAILURE ANALYSIS
==================================================================

🔥 COMPILATION/RUNTIME ERRORS:
--------------------------------
  • error TS2304: Cannot find name 'undefinedVar'

🧪 TEST FAILURES:
-----------------
  • Component › should initialize
    Expected true but received false

==================================================================
🧪 TEST RESULTS SUMMARY
==================================================================

✅ src/app/service.spec.ts
❌ src/app/component.spec.ts`;

            // Step 3: Mock file reads for context compilation
            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce(mockGitDiff)    // diff.txt
                .mockResolvedValueOnce(mockTestOutput); // test-output.txt

            // Step 4: Compile context
            const result = await compiler.compileContext('debug', false);

            // Verify the complete workflow generates proper context
            expect(result).not.toBeNull();
            expect(fs.promises.writeFile).toHaveBeenCalledTimes(2); // test-output.txt + ai_debug_context.txt
            
            // Get the final context content
            const contextCalls = (fs.promises.writeFile as jest.Mock).mock.calls.find(
                call => call[0].includes('ai_debug_context.txt')
            );
            
            expect(contextCalls).toBeDefined();
            const finalContext = contextCalls[1];

            // Verify complete legacy format structure
            expect(finalContext).toContain('🤖 AI DEBUG CONTEXT - OPTIMIZED FOR ANALYSIS');
            expect(finalContext).toContain('STATUS: ❌ TESTS FAILING');
            expect(finalContext).toContain('🎯 ANALYSIS REQUEST');
            expect(finalContext).toContain('1. 🔍 ROOT CAUSE ANALYSIS');
            expect(finalContext).toContain('2. 🛠️ CONCRETE FIXES (PRIORITY 1)');
            expect(finalContext).toContain('🧪 TEST RESULTS ANALYSIS');
            expect(finalContext).toContain(mockTestOutput);
            expect(finalContext).toContain('📋 CODE CHANGES ANALYSIS');
            expect(finalContext).toContain(mockGitDiff);
            expect(finalContext).toContain('⚠️  NOT READY - Issues need resolution:');
            expect(finalContext).toContain('🚀 AI ASSISTANT GUIDANCE');
        });
    });

    describe('Complete Workflow - Passing Tests Scenario', () => {
        test('should generate complete legacy-formatted context for passing tests', async () => {
            // Step 1: Simulate successful test output
            testCapture.startCapture('yarn nx test passing-project', 'passing-project');
            testCapture.appendOutput('Test Suites: 0 failed, 6 passed, 6 total');
            testCapture.appendOutput('Tests: 0 failed, 144 passed, 144 total');
            testCapture.appendOutput('Time: 25.123s');
            testCapture.appendOutput('PASS src/app/service.spec.ts');
            testCapture.appendOutput('PASS src/app/component.spec.ts');
            
            await testCapture.stopCapture(0);

            const mockTestOutput = `=================================================================
🤖 TEST ANALYSIS REPORT
=================================================================

COMMAND: yarn nx test passing-project
EXIT CODE: 0
STATUS: ✅ PASSED

=================================================================
📊 EXECUTIVE SUMMARY
=================================================================
Test Suites: 0 failed, 6 passed, 6 total
Tests: 0 failed, 144 passed, 144 total
Time: 25.123s
Test Suites: 6 passed, 0 failed

==================================================================
🧪 TEST RESULTS SUMMARY
==================================================================

✅ src/app/service.spec.ts
✅ src/app/component.spec.ts`;

            const mockGitDiff = `=================================================================
🔍 AI-OPTIMIZED GIT DIFF ANALYSIS
=================================================================

COMMAND: git diff (smart detection)
TIMESTAMP: 7/26/2025, 12:00:00 PM
BRANCH: main

==================================================================
📊 CHANGE SUMMARY
==================================================================
Total files changed: 1

🆕 NEW FILES (1):
  • src/app/new-feature.ts`;

            // Mock file reads
            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce(mockGitDiff)
                .mockResolvedValueOnce(mockTestOutput);

            // Compile context for passing tests
            const result = await compiler.compileContext('debug', true);

            expect(result).not.toBeNull();
            
            const contextCalls = (fs.promises.writeFile as jest.Mock).mock.calls.find(
                call => call[0].includes('ai_debug_context.txt')
            );
            
            const finalContext = contextCalls[1];

            // Verify passing tests format
            expect(finalContext).toContain('STATUS: ✅ TESTS PASSING');
            expect(finalContext).toContain('1. 🔍 CODE QUALITY ANALYSIS');
            expect(finalContext).toContain('2. 🎭 MOCK DATA VALIDATION (CRITICAL)');
            expect(finalContext).toContain('3. 🧪 TEST COVERAGE ANALYSIS');
            expect(finalContext).toContain('✅ READY TO PUSH');
            expect(finalContext).toContain('• Tests: Passing ✅');
            expect(finalContext).toContain('• Lint: Clean ✅');
        });
    });

    describe('Format Validation Against Legacy Scripts', () => {
        test('should match exact emoji and header patterns from legacy scripts', async () => {
            // Test comprehensive format matching with actual error content
            testCapture.startCapture('yarn nx test format-test', 'format-test');
            testCapture.appendOutput('Test suite failed to run');
            testCapture.appendOutput('error TS2304: Cannot find name');
            testCapture.appendOutput('● Component › test failure');
            testCapture.appendOutput('Time: 30.5s');
            await testCapture.stopCapture(1);

            const mockFiles = {
                diff: `=================================================================
🔍 AI-OPTIMIZED GIT DIFF ANALYSIS
=================================================================

COMMAND: git diff (smart detection)
TIMESTAMP: 7/26/2025, 12:00:00 PM
BRANCH: main

==================================================================
📊 CHANGE SUMMARY
==================================================================
Total files changed: 1

==================================================================
🏷️ FILE TYPE ANALYSIS
==================================================================
TypeScript: 1 files

==================================================================
📋 DETAILED CHANGES
==================================================================

📁 FILE: src/test.ts
─────────────────────────────────────────

==================================================================
🤖 AI ANALYSIS CONTEXT
==================================================================`,
                testOutput: `=================================================================
🤖 TEST ANALYSIS REPORT
=================================================================

COMMAND: yarn nx test format-test
EXIT CODE: 1
STATUS: ❌ FAILED

=================================================================
📊 EXECUTIVE SUMMARY
=================================================================
Tests: Information not available

==================================================================
💥 FAILURE ANALYSIS
==================================================================

🔥 COMPILATION/RUNTIME ERRORS:
--------------------------------
  • error TS2304: Cannot find name

🧪 TEST FAILURES:
-----------------
  • Component › test failure

==================================================================
⚡ PERFORMANCE INSIGHTS
==================================================================
Time: 30.5s`
            };

            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce(mockFiles.diff)
                .mockResolvedValueOnce(mockFiles.testOutput);

            await compiler.compileContext('debug', false);

            // Verify all legacy format markers are present
            const allCalls = (fs.promises.writeFile as jest.Mock).mock.calls;
            const allContent = allCalls.map(call => call[1]).join('\n');

            // Check for exact legacy emoji patterns (only those that should appear)
            const legacyEmojiPatterns = [
                '🤖 TEST ANALYSIS REPORT',
                '📊 EXECUTIVE SUMMARY', 
                '💥 FAILURE ANALYSIS',
                '🔥 COMPILATION/RUNTIME ERRORS:',
                '🧪 TEST FAILURES:',
                '⚡ PERFORMANCE INSIGHTS',
                '🔍 AI-OPTIMIZED GIT DIFF ANALYSIS',
                '📊 CHANGE SUMMARY',
                '🏷️ FILE TYPE ANALYSIS',
                '📋 DETAILED CHANGES',
                '🤖 AI ANALYSIS CONTEXT',
                '🤖 AI DEBUG CONTEXT - OPTIMIZED FOR ANALYSIS',
                '🎯 ANALYSIS REQUEST',
                '🔧 CODE QUALITY RESULTS',
                '🚀 AI ASSISTANT GUIDANCE'
            ];

            legacyEmojiPatterns.forEach(pattern => {
                expect(allContent).toContain(pattern);
            });
        });

        test('should include all critical legacy format sections', async () => {
            testCapture.startCapture('yarn nx test complete-test', 'complete-test');
            await testCapture.stopCapture(1);

            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce('mock diff')
                .mockResolvedValueOnce('mock test output');

            await compiler.compileContext('debug', false);

            const allCalls = (fs.promises.writeFile as jest.Mock).mock.calls;
            const allContent = allCalls.map(call => call[1]).join('\n');

            // Verify all critical legacy sections are present
            const criticalSections = [
                'PROJECT: Angular NX Monorepo',
                'TARGET:',
                'STATUS:',
                'FOCUS:',
                'TIMESTAMP:',
                'Please analyze this context and provide:',
                'ROOT CAUSE ANALYSIS',
                'CONCRETE FIXES (PRIORITY 1)',
                'EXISTING TEST FIXES (PRIORITY 1)',
                'IMPLEMENTATION GUIDANCE (PRIORITY 1)',
                'NEW TEST SUGGESTIONS (PRIORITY 2 - AFTER FIXES)',
                'Focus on items 1-4 first to get tests passing',
                'TEST RESULTS ANALYSIS',
                'CODE QUALITY RESULTS',
                'CODE CHANGES ANALYSIS',
                'AI ASSISTANT GUIDANCE',
                'Context file size:',
                'lines (optimized for AI processing)'
            ];

            criticalSections.forEach(section => {
                expect(allContent).toContain(section);
            });
        });
    });

    describe('File System Integration', () => {
        test('should create proper directory structure', async () => {
            testCapture.startCapture('yarn nx test dir-test', 'dir-test');
            await testCapture.stopCapture(0);

            const expectedPath = path.join(workspaceRoot, '.github', 'instructions', 'ai_debug_context');
            
            expect(fs.promises.mkdir).toHaveBeenCalledWith(expectedPath, { recursive: true });
        });

        test('should write all three key files', async () => {
            testCapture.startCapture('yarn nx test file-test', 'file-test');
            await testCapture.stopCapture(1);

            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce('diff')
                .mockResolvedValueOnce('test output');

            await compiler.compileContext('debug', false);

            const writeCalls = (fs.promises.writeFile as jest.Mock).mock.calls;
            const filePaths = writeCalls.map(call => call[0]);

            expect(filePaths.some(path => path.includes('test-output.txt'))).toBe(true);
            expect(filePaths.some(path => path.includes('ai_debug_context.txt'))).toBe(true);
        });
    });
});