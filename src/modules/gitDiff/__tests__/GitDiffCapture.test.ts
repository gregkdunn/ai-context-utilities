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
        jest.clearAllMocks();
    });

    describe('Legacy gitDiff.zsh Format Matching', () => {
        test('should generate exact header format as legacy script', async () => {
            // Mock git processes
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn()
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            // Setup process completion
            setTimeout(() => {
                // Simulate unstaged changes check (exit code 1 = changes exist)
                if (mockSpawn.mock.calls[0]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                } else {
                    // Simulate git diff output
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) {
                        stdout('diff --git a/src/test.ts b/src/test.ts\n');
                        stdout('index abc123..def456 100644\n');
                        stdout('--- a/src/test.ts\n');
                        stdout('+++ b/src/test.ts\n');
                        stdout('@@ -1,3 +1,3 @@\n');
                        stdout('-old line\n');
                        stdout('+new line\n');
                    }
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            expect(fs.promises.writeFile).toHaveBeenCalled();
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify exact legacy format headers
            expect(content).toContain('=================================================================');
            expect(content).toContain('🔍 AI-OPTIMIZED GIT DIFF ANALYSIS');
            expect(content).toContain('=================================================================');
            expect(content).toContain('COMMAND: git diff (smart detection)');
            expect(content).toContain('TIMESTAMP:');
            expect(content).toContain('BRANCH:');
            expect(content).toContain('📊 CHANGE SUMMARY');
        });

        test('should implement smart diff detection like legacy script', async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn()
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            // Test unstaged changes detection
            setTimeout(() => {
                const calls = mockSpawn.mock.calls;
                
                // First call should be checking for unstaged changes
                if (calls[0]?.[1]?.includes('--quiet') && !calls[0]?.[1]?.includes('--cached')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1); // Has unstaged changes
                }
                // Second call should be the actual diff
                else if (calls[1]?.[1]?.includes('diff') && !calls[1]?.[1]?.includes('--cached')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            // Verify smart detection messaging matches legacy
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('📝 Using unstaged changes');
        });

        test('should handle staged changes detection', async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn()
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                const calls = mockSpawn.mock.calls;
                
                // No unstaged changes
                if (calls[0]?.[1]?.includes('--quiet') && !calls[0]?.[1]?.includes('--cached')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
                // Has staged changes
                else if (calls[1]?.[1]?.includes('--cached') && calls[1]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                }
                // Execute staged diff
                else if (calls[2]?.[1]?.includes('--cached')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('📂 Using staged changes');
        });

        test('should fallback to last commit like legacy script', async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn()
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                const calls = mockSpawn.mock.calls;
                
                // No unstaged changes
                if (calls[0]?.[1]?.includes('--quiet') && !calls[0]?.[1]?.includes('--cached')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
                // No staged changes
                else if (calls[1]?.[1]?.includes('--cached') && calls[1]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
                // Execute HEAD~1..HEAD diff
                else if (calls[2]?.[1]?.includes('HEAD~1..HEAD')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

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

            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn()
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                // Simulate git processes
                if (mockSpawn.mock.calls[0]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                } else {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) stdout(mockDiff);
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify file categorization matches legacy format
            expect(content).toContain('🆕 NEW FILES (1):');
            expect(content).toContain('• src/new.ts');
            expect(content).toContain('📝 MODIFIED FILES (1):');
            expect(content).toContain('• src/modified.ts');
            expect(content).toContain('🗑️ DELETED FILES (1):');
            expect(content).toContain('• src/deleted.ts');
            expect(content).toContain('📦 RENAMED/MOVED FILES (1):');
            expect(content).toContain('• src/old.ts → src/new-name.ts');
        });

        test('should include file type analysis section', async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn()
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                if (mockSpawn.mock.calls[0]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                } else {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) {
                        stdout('diff --git a/src/test.ts b/src/test.ts\n');
                        stdout('diff --git a/src/component.spec.ts b/src/component.spec.ts\n');
                    }
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify file type analysis matches legacy format
            expect(content).toContain('🏷️ FILE TYPE ANALYSIS');
            expect(content).toContain('TypeScript:');
            expect(content).toContain('Test Files:');
        });

        test('should add file markers for AI parsing', async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn()
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                if (mockSpawn.mock.calls[0]?.[1]?.includes('--quiet')) {
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](1);
                } else {
                    const stdout = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
                    if (stdout) {
                        stdout('diff --git a/src/test.ts b/src/test.ts\n');
                        stdout('index abc123..def456 100644\n');
                    }
                    mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1](0);
                }
            }, 0);

            await gitCapture.captureDiff();

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify file markers match legacy format
            expect(content).toContain('📁 FILE: src/test.ts');
            expect(content).toContain('─────────────────────────────────────────');
        });
    });

    describe('No Changes Handling', () => {
        test('should handle no changes gracefully like legacy script', async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn()
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            setTimeout(() => {
                // Simulate no changes
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
        });
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
                path.join('/test/workspace', '.github', 'instructions', 'ai_debug_context', 'diff.txt')
            );
        });
    });
});