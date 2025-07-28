/**
 * Enhanced Unit Tests for GitDiffCapture module
 * Comprehensive testing for Phase 2.1 legacy format matching with gitDiff.zsh
 */

import { GitDiffCapture, GitDiffOptions } from '../GitDiffCapture';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// Mock dependencies
jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        access: jest.fn(),
        unlink: jest.fn()
    }
}));

jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

describe('GitDiffCapture - Enhanced Phase 2.1 Testing', () => {
    let gitCapture: GitDiffCapture;
    let mockOutputChannel: any;
    let mockOptions: GitDiffOptions;
    let mockSpawn: jest.MockedFunction<typeof spawn>;

    beforeEach(() => {
        mockOutputChannel = {
            appendLine: jest.fn()
        };

        mockOptions = {
            workspaceRoot: '/test/workspace',
            outputChannel: mockOutputChannel
        };

        gitCapture = new GitDiffCapture(mockOptions);
        mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
        
        // Setup default mocks
        (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);
        
        jest.clearAllMocks();
    });

    describe('Legacy gitDiff.zsh Smart Detection - Comprehensive', () => {
        test('should implement exact smart detection logic from legacy script', async () => {
            const mockProcess = createMockProcess();
            mockSpawn.mockReturnValue(mockProcess as any);

            // Test the exact sequence: unstaged check -> staged check -> final diff
            let callIndex = 0;
            
            setTimeout(() => {
                const calls = mockSpawn.mock.calls;
                
                // First call: check for unstaged changes (git diff --quiet)
                if (calls[callIndex] && calls[callIndex][1]?.includes('--quiet') && !calls[callIndex][1]?.includes('--cached')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1); // Has unstaged changes
                    callIndex++;
                }
                // Second call: execute unstaged diff (git diff)
                else if (calls[callIndex] && calls[callIndex][1]?.includes('diff') && !calls[callIndex][1]?.includes('--cached')) {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) {
                        stdout(createRealisticDiff());
                    }
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            // Verify smart detection messaging matches legacy exactly
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('📝 Using unstaged changes');
            expect(fs.promises.writeFile).toHaveBeenCalled();
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            expect(content).toContain('COMMAND: git diff (smart detection)');
        });

        test('should fallback to staged changes when no unstaged changes exist', async () => {
            const mockProcess = createMockProcess();
            mockSpawn.mockReturnValue(mockProcess as any);

            let callIndex = 0;
            
            setTimeout(() => {
                const calls = mockSpawn.mock.calls;
                
                // No unstaged changes
                if (calls[callIndex] && calls[callIndex][1]?.includes('--quiet') && !calls[callIndex][1]?.includes('--cached')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                    callIndex++;
                }
                // Has staged changes
                else if (calls[callIndex] && calls[callIndex][1]?.includes('--cached') && calls[callIndex][1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                    callIndex++;
                }
                // Execute staged diff
                else if (calls[callIndex] && calls[callIndex][1]?.includes('--cached')) {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) {
                        stdout(createStagedDiff());
                    }
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('📂 Using staged changes');
        });

        test('should fallback to last commit when no changes exist', async () => {
            const mockProcess = createMockProcess();
            mockSpawn.mockReturnValue(mockProcess as any);

            let callIndex = 0;
            
            setTimeout(() => {
                const calls = mockSpawn.mock.calls;
                
                // No unstaged changes
                if (calls[callIndex] && calls[callIndex][1]?.includes('--quiet') && !calls[callIndex][1]?.includes('--cached')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                    callIndex++;
                }
                // No staged changes
                else if (calls[callIndex] && calls[callIndex][1]?.includes('--cached') && calls[callIndex][1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                    callIndex++;
                }
                // Execute HEAD~1..HEAD diff
                else if (calls[callIndex] && calls[callIndex][1]?.includes('HEAD~1..HEAD')) {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) {
                        stdout(createCommitDiff());
                    }
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '📋 Using last commit changes (no unstaged/staged changes found)'
            );
        });
    });

    describe('Legacy gitDiff.zsh Format Compliance - Comprehensive', () => {
        test('should generate exact header format matching legacy script', async () => {
            const mockProcess = createMockProcess();
            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                if (mockSpawn.mock.calls[0]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                } else {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) stdout(createRealisticDiff());
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify exact legacy header format
            const lines = content.split('\n');
            expect(lines[0]).toBe('=================================================================');
            expect(lines[1]).toBe('🔍 AI-OPTIMIZED GIT DIFF ANALYSIS');
            expect(lines[2]).toBe('=================================================================');
            expect(lines[4]).toContain('COMMAND: git diff (smart detection)');
            expect(lines[5]).toContain('TIMESTAMP:');
            expect(lines[6]).toContain('BRANCH:');
        });

        test('should categorize file changes exactly like legacy script', async () => {
            const mockProcess = createMockProcess();
            mockSpawn.mockReturnValue(mockProcess as any);

            const complexDiff = `diff --git a/src/new-feature.ts b/src/new-feature.ts
new file mode 100644
index 0000000..abc123
--- /dev/null
+++ b/src/new-feature.ts
@@ -0,0 +1,25 @@
+export class NewFeature {
+  constructor() {}
+}

diff --git a/src/existing-service.ts b/src/existing-service.ts
index def456..ghi789 100644
--- a/src/existing-service.ts
+++ b/src/existing-service.ts
@@ -10,7 +10,7 @@
-  private oldMethod() {
+  private newMethod() {

diff --git a/src/obsolete-util.ts b/src/obsolete-util.ts
deleted file mode 100644
index jkl012..0000000
--- a/src/obsolete-util.ts
+++ /dev/null
@@ -1,15 +0,0 @@
-export function oldUtil() {
-  return 'deprecated';
-}

diff --git a/src/old-name.ts b/src/new-name.ts
similarity index 90%
rename from src/old-name.ts
rename to src/new-name.ts
index mno345..pqr678 100644
--- a/src/old-name.ts
+++ b/src/new-name.ts
@@ -1,3 +1,3 @@
-export class OldName {
+export class NewName {
   constructor() {}
 }`;

            setTimeout(() => {
                if (mockSpawn.mock.calls[0]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                } else {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) stdout(complexDiff);
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify file categorization matches legacy format exactly
            expect(content).toContain('📊 CHANGE SUMMARY');
            expect(content).toContain('Total files changed: 4');
            
            expect(content).toContain('🆕 NEW FILES (1):');
            expect(content).toContain('• src/new-feature.ts');
            
            expect(content).toContain('📝 MODIFIED FILES (1):');
            expect(content).toContain('• src/existing-service.ts');
            
            expect(content).toContain('🗑️ DELETED FILES (1):');
            expect(content).toContain('• src/obsolete-util.ts');
            
            expect(content).toContain('📦 RENAMED/MOVED FILES (1):');
            expect(content).toContain('• src/old-name.ts → src/new-name.ts');
        });

        test('should include file type analysis matching legacy script', async () => {
            const mockProcess = createMockProcess();
            mockSpawn.mockReturnValue(mockProcess as any);

            const typedDiff = `diff --git a/src/service.ts b/src/service.ts
index abc123..def456 100644

diff --git a/src/component.spec.ts b/src/component.spec.ts
index ghi789..jkl012 100644

diff --git a/src/styles.scss b/src/styles.scss
index mno345..pqr678 100644

diff --git a/package.json b/package.json
index stu901..vwx234 100644

diff --git a/README.md b/README.md
index yza567..bcd890 100644`;

            setTimeout(() => {
                if (mockSpawn.mock.calls[0]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                } else {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) stdout(typedDiff);
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify file type analysis matches legacy format
            expect(content).toContain('🏷️ FILE TYPE ANALYSIS');
            expect(content).toContain('TypeScript: 1');
            expect(content).toContain('Test Files: 1');
            expect(content).toContain('Styles: 1');
            expect(content).toContain('JSON Config: 1');
            expect(content).toContain('Documentation: 1');
        });

        test('should add file markers for AI parsing like legacy script', async () => {
            const mockProcess = createMockProcess();
            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                if (mockSpawn.mock.calls[0]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                } else {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) stdout(createRealisticDiff());
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify file markers match legacy format
            expect(content).toContain('📋 DETAILED CHANGES');
            expect(content).toContain('📁 FILE: src/test-file.ts');
            expect(content).toContain('─────────────────────────────────────────');
        });

        test('should include AI analysis context section like legacy script', async () => {
            const mockProcess = createMockProcess();
            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                if (mockSpawn.mock.calls[0]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                } else {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) stdout(createRealisticDiff());
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify AI analysis context matches legacy format
            expect(content).toContain('🤖 AI ANALYSIS CONTEXT');
            expect(content).toContain('Key areas for analysis:');
            expect(content).toContain('• Focus on test-related files (.spec.ts, .test.ts)');
            expect(content).toContain('• Look for type/interface changes that might break tests');
            expect(content).toContain('• Check for new functionality that needs test coverage');
            expect(content).toContain('• Identify breaking changes in method signatures');
            expect(content).toContain('• Review dependency changes and imports');
        });
    });

    describe('No Changes Handling - Enhanced', () => {
        test('should handle empty diff output gracefully', async () => {
            const mockProcess = createMockProcess();
            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                if (mockSpawn.mock.calls[0]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                } else {
                    // Empty diff output
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                'ℹ️  No changes detected in git diff'
            );
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            expect(content).toContain('Total files changed: 0');
            expect(content).toContain('No changes detected.');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle git command failures gracefully', async () => {
            const mockProcess = createMockProcess();
            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                const stderr = mockProcess.stderr.on.mock.calls.find(call => call[0] === 'data')?.[1];
                if (stderr) stderr('fatal: not a git repository');
                mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](128);
            }, 0);

            const result = await gitCapture.captureDiff();

            expect(result).toBe(false);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('❌ Failed to capture git diff')
            );
        });

        test('should handle file system errors properly', async () => {
            (fs.promises.writeFile as jest.Mock).mockRejectedValue(new Error('Write permission denied'));
            
            const mockProcess = createMockProcess();
            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                if (mockSpawn.mock.calls[0]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                } else {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) stdout(createRealisticDiff());
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            const result = await gitCapture.captureDiff();

            expect(result).toBe(false);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('❌ Failed to capture git diff: Error: Write permission denied')
            );
        });
    });

    describe('API Contract Validation', () => {
        test('should maintain all expected public methods', () => {
            expect(typeof gitCapture.captureDiff).toBe('function');
            expect(typeof gitCapture.diffExists).toBe('function');
            expect(typeof gitCapture.getDiffFilePath).toBe('function');
            expect(typeof gitCapture.clearDiff).toBe('function');
        });

        test('should return correct file path', () => {
            const expectedPath = path.join(
                '/test/workspace',
                '.github',
                'instructions',
                'ai-utilities-context',
                'diff.txt'
            );
            
            expect(gitCapture.getDiffFilePath()).toBe(expectedPath);
        });

        test('should handle diff existence checking correctly', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            
            let exists = await gitCapture.diffExists();
            expect(exists).toBe(true);
            
            (fs.promises.access as jest.Mock).mockRejectedValue(new Error('File not found'));
            
            exists = await gitCapture.diffExists();
            expect(exists).toBe(false);
        });

        test('should clear diff files properly', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);
            
            await gitCapture.clearDiff();
            
            expect(fs.promises.unlink).toHaveBeenCalledWith(gitCapture.getDiffFilePath());
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('🗑️  Git diff cleared');
        });
    });

    // Helper functions
    function createMockProcess() {
        return {
            stdout: { on: jest.fn() },
            stderr: { on: jest.fn() },
            on: jest.fn()
        };
    }

    function createRealisticDiff(): string {
        return `diff --git a/src/test-file.ts b/src/test-file.ts
index abc123..def456 100644
--- a/src/test-file.ts
+++ b/src/test-file.ts
@@ -1,5 +1,5 @@
 export class TestFile {
-  private oldProperty: string;
+  private newProperty: string;
   
   constructor() {
-    this.oldProperty = 'old value';
+    this.newProperty = 'new value';
   }
 }`;
    }

    function createStagedDiff(): string {
        return `diff --git a/src/staged-file.ts b/src/staged-file.ts
index ghi789..jkl012 100644
--- a/src/staged-file.ts
+++ b/src/staged-file.ts
@@ -1,3 +1,3 @@
-// Old staged comment
+// New staged comment
 export const config = {
   version: '1.0.0'
 };`;
    }

    function createCommitDiff(): string {
        return `diff --git a/src/commit-file.ts b/src/commit-file.ts
index mno345..pqr678 100644
--- a/src/commit-file.ts
+++ b/src/commit-file.ts
@@ -1,4 +1,4 @@
 export function commitFunction() {
-  return 'previous commit';
+  return 'current commit';
 }`;
    }
});