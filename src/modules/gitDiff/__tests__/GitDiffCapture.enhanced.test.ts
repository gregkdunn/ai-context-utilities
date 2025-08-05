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

    // Helper to create realistic diff content
    const createRealisticDiff = () => {
        return `diff --git a/src/test.ts b/src/test.ts
index abc123..def456 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,3 @@
 function test() {
-  return false;
+  return true;
 }

diff --git a/src/component.ts b/src/component.ts
index ghi789..jkl012 100644
--- a/src/component.ts
+++ b/src/component.ts
@@ -1,5 +1,5 @@
 export class Component {
-  name = 'old';
+  name = 'new';
 }`;
    };

    const createStagedDiff = () => {
        return `diff --git a/staged.ts b/staged.ts
index staged123..staged456 100644
--- a/staged.ts
+++ b/staged.ts
@@ -1,3 +1,3 @@
 function staged() {
-  return 'old';
+  return 'new';
 }`;
    };

    // Helper for simplified git process mocking
    const createMockGitProcess = (unstagedChanges = false, stagedChanges = false, diffContent = 'mock diff content\n') => {
        return (cmd: string, args?: readonly string[], options?: any) => {
            const mockProcess: any = {
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data' && args && args.includes('diff') && !args.includes('--quiet')) {
                            process.nextTick(() => callback(diffContent));
                        }
                    })
                },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        if (args?.includes('diff') && args.includes('--quiet') && !args.includes('--cached')) {
                            // git diff --quiet: check for unstaged changes
                            process.nextTick(() => callback(unstagedChanges ? 1 : 0));
                        } else if (args?.includes('diff') && args.includes('--cached') && args.includes('--quiet')) {
                            // git diff --cached --quiet: check for staged changes
                            process.nextTick(() => callback(stagedChanges ? 1 : 0));
                        } else if (args?.includes('diff') && !args.includes('--quiet')) {
                            // git diff: actual diff command
                            process.nextTick(() => callback(0));
                        } else {
                            process.nextTick(() => callback(0));
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
        
        // Setup default mocks
        (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);
        
        jest.clearAllMocks();
    });

    describe('Legacy gitDiff.zsh Smart Detection - Comprehensive', () => {
        test('should implement exact smart detection logic from legacy script', async () => {
            // Mock with unstaged changes
            mockSpawn.mockImplementation(createMockGitProcess(true, false, createRealisticDiff()));

            await gitCapture.captureDiff();

            // Verify smart detection messaging matches legacy exactly
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('📝 Using unstaged changes');
            expect(fs.promises.writeFile).toHaveBeenCalled();
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            expect(content).toContain('COMMAND: git diff (smart detection)');
        }, 15000);

        test('should fallback to staged changes when no unstaged changes exist', async () => {
            // Mock: no unstaged changes, has staged changes
            mockSpawn.mockImplementation(createMockGitProcess(false, true, createStagedDiff()));

            await gitCapture.captureDiff();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('📂 Using staged changes');
            expect(fs.promises.writeFile).toHaveBeenCalled();
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            expect(content).toContain('COMMAND: git diff (smart detection)');
        }, 15000);

        test('should fallback to last commit when no changes exist', async () => {
            // Mock: no unstaged changes, no staged changes
            mockSpawn.mockImplementation(createMockGitProcess(false, false, createRealisticDiff()));

            await gitCapture.captureDiff();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '📋 Using last commit changes (no unstaged/staged changes found)'
            );
            expect(fs.promises.writeFile).toHaveBeenCalled();
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            expect(content).toContain('COMMAND: git diff (smart detection)');
        }, 15000);
    });

    describe('Legacy gitDiff.zsh Format Compliance - Comprehensive', () => {
        test('should generate exact header format matching legacy script', async () => {
            mockSpawn.mockImplementation(createMockGitProcess(true, false, createRealisticDiff()));

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify exact legacy format headers
            expect(content).toContain('=================================================================');
            expect(content).toContain('🔍 GIT DIFF FOR AI CONTEXT');
            expect(content).toContain('=================================================================');
            expect(content).toContain('COMMAND: git diff (smart detection)');
            expect(content).toContain('TIMESTAMP:');
            expect(content).toContain('BRANCH:');
            expect(content).toContain('📊 CHANGE SUMMARY');
        }, 15000);

        test('should categorize file changes exactly like legacy script', async () => {
            const complexDiff = `diff --git a/src/new.ts b/src/new.ts
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

            mockSpawn.mockImplementation(createMockGitProcess(true, false, complexDiff));

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
        }, 15000);

        test('should include file type analysis matching legacy script', async () => {
            const typescriptDiff = `diff --git a/src/test.ts b/src/test.ts
index abc123..def456 100644
--- a/src/test.ts
+++ b/src/test.ts

diff --git a/src/component.spec.ts b/src/component.spec.ts
index ghi789..jkl012 100644
--- a/src/component.spec.ts
+++ b/src/component.spec.ts`;

            mockSpawn.mockImplementation(createMockGitProcess(true, false, typescriptDiff));

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify file type analysis matches legacy format
            expect(content).toContain('🏷️ FILE TYPE ANALYSIS');
            expect(content).toContain('TypeScript:');
        }, 15000);

        test('should add file markers for AI parsing like legacy script', async () => {
            const singleFileDiff = `diff --git a/src/test.ts b/src/test.ts
index abc123..def456 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,3 @@
 function test() {
-  return false;
+  return true;
 }`;

            mockSpawn.mockImplementation(createMockGitProcess(true, false, singleFileDiff));

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify file markers match legacy format
            expect(content).toContain('📁 FILE: src/test.ts');
            expect(content).toContain('─────────────────────────────────────────');
        }, 15000);

        test('should include AI analysis context section like legacy script', async () => {
            mockSpawn.mockImplementation(createMockGitProcess(true, false, createRealisticDiff()));

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify AI context section matches legacy format
            expect(content).toContain('🤖 AI ANALYSIS CONTEXT');
            expect(content).toContain('=================================================================');
        }, 15000);
    });

    describe('No Changes Handling - Enhanced', () => {
        test('should handle empty diff output gracefully', async () => {
            // Mock with empty diff content
            mockSpawn.mockImplementation(createMockGitProcess(true, false, ''));

            await gitCapture.captureDiff();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('ℹ️  No changes detected in git diff');
        }, 15000);
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle git command failures gracefully', async () => {
            // Mock git command failure
            const failedProcess = (cmd: string, args?: readonly string[], options?: any) => {
                const mockProcess: any = {
                    stdout: { on: jest.fn() },
                    stderr: { 
                        on: jest.fn((event, callback) => {
                            if (event === 'data') {
                                process.nextTick(() => callback('fatal: not a git repository'));
                            }
                        })
                    },
                    on: jest.fn((event, callback) => {
                        if (event === 'close') {
                            process.nextTick(() => callback(128)); // Git error code
                        }
                    })
                };
                return mockProcess;
            };

            mockSpawn.mockImplementation(failedProcess);

            // The captureDiff method should handle errors gracefully rather than throwing
            await gitCapture.captureDiff();
            
            // Verify error handling occurred
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Error')
            );
        }, 15000);

        test('should handle file system errors properly', async () => {
            (fs.promises.writeFile as jest.Mock).mockRejectedValue(new Error('Write permission denied'));

            mockSpawn.mockImplementation(createMockGitProcess(true, false, createRealisticDiff()));

            // The captureDiff method should handle file system errors gracefully
            await gitCapture.captureDiff();
            
            // Verify error handling occurred
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Error')
            );
        }, 15000);
    });
});