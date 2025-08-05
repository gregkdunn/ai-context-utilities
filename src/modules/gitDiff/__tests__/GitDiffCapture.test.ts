/**
 * Unit tests for GitDiffCapture module
 * Tests Phase 2.1 legacy format matching with gitDiff.zsh
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

describe('GitDiffCapture - Phase 2.1 Legacy Format Matching', () => {
    let gitCapture: GitDiffCapture;
    let mockOutputChannel: any;
    let mockOptions: GitDiffOptions;
    let mockSpawn: jest.MockedFunction<typeof spawn>;

    // Helper to create a proper mock process
    const createMockGitProcess = (unstagedChanges = false, stagedChanges = false, diffContent = 'mock diff content\n') => {
        return (cmd: string, args?: readonly string[], options?: any) => {
            const mockProcess: any = {
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data' && args && args.includes('diff') && !args.includes('--quiet')) {
                            setImmediate(() => callback(diffContent));
                        }
                    })
                },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        if (args?.includes('diff') && args.includes('--quiet') && !args.includes('--cached')) {
                            // git diff --quiet: check for unstaged changes
                            setImmediate(() => callback(unstagedChanges ? 1 : 0));
                        } else if (args?.includes('diff') && args.includes('--cached') && args.includes('--quiet')) {
                            // git diff --cached --quiet: check for staged changes
                            setImmediate(() => callback(stagedChanges ? 1 : 0));
                        } else if (args?.includes('diff') && !args.includes('--quiet')) {
                            // git diff: actual diff command
                            setImmediate(() => callback(0));
                        } else {
                            setImmediate(() => callback(0));
                        }
                    }
                })
            };
            return mockProcess;
        };
    };

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
        
        // Default mock: unstaged changes exist
        mockSpawn.mockImplementation(createMockGitProcess(true, false));

        jest.clearAllMocks();
    });

    describe('Legacy gitDiff.zsh Format Matching', () => {
        test('should generate exact header format as legacy script', async () => {
            await gitCapture.captureDiff();

            expect(fs.promises.writeFile).toHaveBeenCalled();
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify exact legacy format headers
            expect(content).toContain('=================================================================');
            expect(content).toContain('🔍 GIT DIFF FOR AI CONTEXT');
            expect(content).toContain('=================================================================');
            expect(content).toContain('COMMAND: git diff (smart detection)');
            expect(content).toContain('TIMESTAMP:');
            expect(content).toContain('BRANCH:');
            expect(content).toContain('📊 CHANGE SUMMARY');
        });

        test('should implement smart diff detection like legacy script', async () => {
            // Mock: has unstaged changes, no staged changes
            mockSpawn.mockImplementation(createMockGitProcess(true, false));

            await gitCapture.captureDiff();

            // Verify smart detection messaging matches legacy
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('📝 Using unstaged changes');
        });

        test('should handle staged changes detection', async () => {
            // Mock: no unstaged changes, has staged changes
            mockSpawn.mockImplementation(createMockGitProcess(false, true));

            await gitCapture.captureDiff();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('📂 Using staged changes');
        });

        test('should fallback to last commit like legacy script', async () => {
            // Mock: no unstaged changes, no staged changes (fallback to last commit)
            mockSpawn.mockImplementation(createMockGitProcess(false, false));

            await gitCapture.captureDiff();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '📋 Using last commit changes (no unstaged/staged changes found)'
            );
        });
    });

    describe('File Analysis Matching Legacy Format', () => {
        test('should categorize file changes like legacy script', async () => {
            const mockDiff = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
index 0000000..abc123
--- /dev/null
+++ b/src/new.ts

diff --git a/src/modified.ts b/src/modified.ts
index def456..ghi789 100644
--- a/src/modified.ts
+++ b/src/modified.ts

diff --git a/src/deleted.ts b/src/deleted.ts
deleted file mode 100644
index jkl012..0000000

diff --git a/src/old.ts b/src/new-name.ts
similarity index 90%
rename from src/old.ts
rename to src/new-name.ts`;

            // Mock with complex diff content
            mockSpawn.mockImplementation(createMockGitProcess(true, false, mockDiff));

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify file categorization matches legacy format
            expect(content).toContain('🆕 NEW FILES (1):');
            expect(content).toContain('• src/new.ts');
            expect(content).toContain('📝 MODIFIED FILES (3):');
            expect(content).toContain('• src/modified.ts');
            expect(content).toContain('🗑️ DELETED FILES (1):');
            expect(content).toContain('• src/deleted.ts');
            expect(content).toContain('📦 RENAMED/MOVED FILES (1):');
            expect(content).toContain('• src/old.ts → src/new-name.ts');
        });

        test('should include file type analysis section', async () => {
            const mockDiff = `diff --git a/src/test.ts b/src/test.ts
index abc123..def456 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,3 @@
 function test() {
-  return false;
+  return true;
 }

diff --git a/src/component.spec.ts b/src/component.spec.ts
index ghi789..jkl012 100644
--- a/src/component.spec.ts
+++ b/src/component.spec.ts
@@ -1,5 +1,5 @@
 describe('Component', () => {
-  it('should work', () => {
+  it('should work correctly', () => {
     expect(true).toBe(true);
   });
 });`;

            // Mock with TypeScript and test files
            mockSpawn.mockImplementation(createMockGitProcess(true, false, mockDiff));

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify file type analysis matches legacy format
            expect(content).toContain('🏷️ FILE TYPE ANALYSIS');
            expect(content).toContain('TypeScript:');
        }, 15000);

        test('should add file markers for AI parsing', async () => {
            const mockDiff = `diff --git a/src/test.ts b/src/test.ts
index abc123..def456 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,3 @@
 function test() {
-  return false;
+  return true;
 }`;

            // Mock with single test file
            mockSpawn.mockImplementation(createMockGitProcess(true, false, mockDiff));

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify file markers match legacy format
            expect(content).toContain('📁 FILE: src/test.ts');
            expect(content).toContain('─────────────────────────────────────────');
        }, 15000);
    });

    describe('No Changes Handling', () => {
        test('should handle no changes gracefully like legacy script', async () => {
            // Mock: no changes detected (empty diff)
            mockSpawn.mockImplementation(createMockGitProcess(true, false, ''));

            await gitCapture.captureDiff();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                'ℹ️  No changes detected in git diff'
            );
        }, 15000);
    });

    describe('API Compatibility', () => {
        test('should maintain expected public interface', () => {
            expect(gitCapture.captureDiff).toBeDefined();
            expect(gitCapture.diffExists).toBeDefined();
            expect(gitCapture.getDiffFilePath).toBeDefined();
            expect(gitCapture.clearDiff).toBeDefined();
        });

        test('should return correct file path', () => {
            const filePath = gitCapture.getDiffFilePath();
            expect(filePath).toBe(
                path.join('/test/workspace', '.github', 'instructions', 'ai-utilities-context', 'diff.txt')
            );
        });
    });
});