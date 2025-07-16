import { GitDiffCommand } from '../gitDiff';
import { CommandOptions } from '../../types';
import { FileManager } from '../../utils/fileManager';

// Mock VSCode API
jest.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
        getConfiguration: jest.fn(() => ({
            get: jest.fn(() => '.github/instructions/ai_utilities_context')
        }))
    },
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn()
        }))
    }
}));

// Mock FileManager
jest.mock('../../utils/fileManager');
const MockedFileManager = FileManager as jest.MockedClass<typeof FileManager>;

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

describe('GitDiffCommand', () => {
    let gitDiffCommand: GitDiffCommand;
    let mockFileManager: jest.Mocked<FileManager>;
    let mockSpawn: jest.MockedFunction<any>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup FileManager mock
        mockFileManager = {
            getOutputFilePath: jest.fn().mockResolvedValue('/test/diff.txt'),
            ensureDirectoryExists: jest.fn(),
            deleteFile: jest.fn(),
            writeFile: jest.fn(),
            getFileStats: jest.fn().mockResolvedValue({
                size: '5KB',
                lines: 150
            })
        } as any;

        mockSpawn = require('child_process').spawn;

        MockedFileManager.mockImplementation(() => mockFileManager);
        
        gitDiffCommand = new GitDiffCommand();
    });

    describe('run', () => {
        it('should execute git diff and create AI-optimized output', async () => {
            // Arrange
            const options: CommandOptions = {};
            const mockDiffOutput = `diff --git a/file1.ts b/file1.ts
index 123..456 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1,3 +1,4 @@
 export class TestClass {
+  newMethod() {}
 }`;

            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        setTimeout(() => callback(0), 10); // Success
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Simulate stdout data
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from(mockDiffOutput)), 5);
                }
            });

            // Act
            const result = await gitDiffCommand.run(options);

            // Assert
            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(mockFileManager.writeFile).toHaveBeenCalled();
        });

        it('should detect smart diff when no changes in working directory', async () => {
            // Arrange
            const options: CommandOptions = {};

            // Mock git diff --quiet to return 0 (no changes)
            // Mock git diff --cached --quiet to return 0 (no staged changes)
            // Mock git rev-parse to return success (has commits)
            let callCount = 0;
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callCount++;
                        if (callCount <= 2) {
                            // First two calls return 0 (no unstaged/staged changes)
                            setTimeout(() => callback(0), 10);
                        } else if (callCount === 3) {
                            // Third call (rev-parse) returns 0 (has commits)
                            setTimeout(() => callback(0), 10);
                        } else {
                            // Final diff call with HEAD~1..HEAD
                            setTimeout(() => callback(0), 10);
                        }
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Act
            await gitDiffCommand.run(options);

            // Assert
            expect(mockSpawn).toHaveBeenCalledWith(
                'git',
                ['diff', '--quiet'],
                expect.any(Object)
            );
            expect(mockSpawn).toHaveBeenCalledWith(
                'git',
                ['diff', '--cached', '--quiet'],
                expect.any(Object)
            );
            expect(mockSpawn).toHaveBeenCalledWith(
                'git',
                ['rev-parse', '--verify', 'HEAD~1'],
                expect.any(Object)
            );
        });

        it('should use staged changes when no unstaged changes', async () => {
            // Arrange
            const options: CommandOptions = {};

            let callCount = 0;
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callCount++;
                        if (callCount === 1) {
                            // First call (unstaged): no changes
                            setTimeout(() => callback(0), 10);
                        } else if (callCount === 2) {
                            // Second call (staged): has changes
                            setTimeout(() => callback(1), 10);
                        } else {
                            // Final diff call with --cached
                            setTimeout(() => callback(0), 10);
                        }
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Act
            await gitDiffCommand.run(options);

            // Assert
            expect(mockSpawn).toHaveBeenCalledWith(
                'git',
                ['diff', '--cached'],
                expect.any(Object)
            );
        });

        it('should handle git command errors', async () => {
            // Arrange
            const options: CommandOptions = {};

            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'error') {
                        setTimeout(() => callback(new Error('Git not found')), 10);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Act
            const result = await gitDiffCommand.run(options);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Git not found');
        });

        it('should skip diff when noDiff option is true', async () => {
            // Arrange
            const options: CommandOptions = { noDiff: true };

            // Act
            const result = await gitDiffCommand.run(options);

            // Assert
            expect(mockSpawn).not.toHaveBeenCalled();
        });

        it('should create no changes output when diff is empty', async () => {
            // Arrange
            const options: CommandOptions = {};

            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        setTimeout(() => callback(0), 10);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Simulate empty stdout
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('')), 5);
                }
            });

            // Act
            const result = await gitDiffCommand.run(options);

            // Assert
            expect(result.success).toBe(true);
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('No changes detected')
            );
        });
    });

    describe('analyzeDiffChanges', () => {
        it('should analyze different types of file changes', () => {
            // Arrange
            const diffOutput = `diff --git a/new-file.ts b/new-file.ts
new file mode 100644
index 000..123
--- /dev/null
+++ b/new-file.ts
diff --git a/modified-file.ts b/modified-file.ts
index 123..456 100644
--- a/modified-file.ts
+++ b/modified-file.ts
diff --git a/deleted-file.ts b/deleted-file.ts
deleted file mode 100644
index 123..000
--- a/deleted-file.ts
+++ /dev/null
diff --git a/old-name.ts b/new-name.ts
similarity index 100%
rename from old-name.ts
rename to new-name.ts`;

            // Act
            const result = (gitDiffCommand as any).analyzeDiffChanges(diffOutput);

            // Assert
            expect(result.newFiles).toContain('new-file.ts');
            expect(result.modifiedFiles).toContain('modified-file.ts');
            expect(result.deletedFiles).toContain('deleted-file.ts');
            expect(result.renamedFiles).toContain('old-name.ts → new-name.ts');
            expect(result.totalChanges).toBe(4);
        });

        it('should handle empty diff output', () => {
            // Arrange
            const diffOutput = '';

            // Act
            const result = (gitDiffCommand as any).analyzeDiffChanges(diffOutput);

            // Assert
            expect(result.newFiles).toEqual([]);
            expect(result.modifiedFiles).toEqual([]);
            expect(result.deletedFiles).toEqual([]);
            expect(result.renamedFiles).toEqual([]);
            expect(result.totalChanges).toBe(0);
        });
    });

    describe('analyzeFileTypes', () => {
        it('should categorize different file types', () => {
            // Arrange
            const diffOutput = `diff --git a/component.ts b/component.ts
diff --git a/component.spec.ts b/component.spec.ts
diff --git a/template.html b/template.html
diff --git a/styles.css b/styles.css
diff --git a/config.json b/config.json
diff --git a/readme.md b/readme.md`;

            // Act
            const result = (gitDiffCommand as any).analyzeFileTypes(diffOutput);

            // Assert
            expect(result).toContain('TypeScript files: 1');
            expect(result).toContain('Test files: 1');
            expect(result).toContain('Templates: 1');
            expect(result).toContain('Styles: 1');
            expect(result).toContain('Config/JSON: 1');
            expect(result).toContain('Other: 1');
        });

        it('should provide AI insights based on file types', () => {
            // Arrange
            const diffOutput = `diff --git a/component.spec.ts b/component.spec.ts
diff --git a/service.ts b/service.ts
diff --git a/other.ts b/other.ts
diff --git a/config.json b/config.json`;

            // Act
            const result = (gitDiffCommand as any).analyzeFileTypes(diffOutput);

            // Assert
            expect(result).toContain('🧪 Test files modified');
            expect(result).toContain('⚠️  More source files than test files changed');
            expect(result).toContain('⚙️  Configuration changes detected');
        });
    });

    describe('addFileSeparators', () => {
        it('should add file separators to diff output', () => {
            // Arrange
            const diffOutput = `diff --git a/file1.ts b/file1.ts
index 123..456
--- a/file1.ts
+++ b/file1.ts
@@ -1 +1,2 @@
 line1
+line2
diff --git a/file2.ts b/file2.ts
index 456..789
--- a/file2.ts
+++ b/file2.ts`;

            // Act
            const result = (gitDiffCommand as any).addFileSeparators(diffOutput);

            // Assert
            expect(result).toContain('📁 FILE: file1.ts');
            expect(result).toContain('📁 FILE: file2.ts');
            expect(result).toContain('─'.repeat(40));
        });
    });

    describe('countChangedFiles', () => {
        it('should count changed files from processed output', () => {
            // Arrange
            const output = `📁 FILE: file1.ts
Some content
📁 FILE: file2.ts
More content
📁 FILE: file3.ts
Even more content`;

            // Act
            const result = (gitDiffCommand as any).countChangedFiles(output);

            // Assert
            expect(result).toBe(3);
        });

        it('should return 0 for output without file markers', () => {
            // Arrange
            const output = 'Some content without file markers';

            // Act
            const result = (gitDiffCommand as any).countChangedFiles(output);

            // Assert
            expect(result).toBe(0);
        });
    });

    describe('createNoChangesOutput', () => {
        it('should create informative output for no changes', () => {
            // Act
            const result = (gitDiffCommand as any).createNoChangesOutput();

            // Assert
            expect(result).toContain('No changes detected');
            expect(result).toContain('Working directory: Clean');
            expect(result).toContain('Staged changes: None');
            expect(result).toContain('AI ANALYSIS CONTEXT');
        });
    });

    describe('getCurrentBranch', () => {
        it('should return current branch name', async () => {
            // Arrange
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        setTimeout(() => callback(0), 10);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Simulate branch output
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('main\n')), 5);
                }
            });

            // Act
            const result = await (gitDiffCommand as any).getCurrentBranch();

            // Assert
            expect(result).toBe('main');
        });

        it('should return "unknown" when git command fails', async () => {
            // Arrange
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        setTimeout(() => callback(1), 10); // Error
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Act
            const result = await (gitDiffCommand as any).getCurrentBranch();

            // Assert
            expect(result).toBe('unknown');
        });
    });
});
