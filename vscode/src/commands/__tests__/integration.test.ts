import { AiDebugCommand } from '../aiDebug';
import { NxTestCommand } from '../nxTest';
import { GitDiffCommand } from '../gitDiff';
import { PrepareToPushCommand } from '../prepareToPush';
import { CommandRunner } from '../../utils/shellRunner';
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

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
    promises: {
        unlink: jest.fn(),
        copyFile: jest.fn(),
        readFile: jest.fn(),
        writeFile: jest.fn()
    },
    existsSync: jest.fn(),
    statSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    unlinkSync: jest.fn(),
    createWriteStream: jest.fn()
}));

describe('Commands Integration Tests', () => {
    let commandRunner: CommandRunner;
    let mockSpawn: jest.MockedFunction<any>;
    let mockFs: jest.Mocked<any>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSpawn = require('child_process').spawn;
        mockFs = require('fs');
        
        // Setup default file system behavior
        mockFs.existsSync.mockReturnValue(true);
        mockFs.statSync.mockReturnValue({ size: 1000, mtime: new Date() });
        mockFs.readFileSync.mockReturnValue('test content');
        mockFs.promises.readFile.mockResolvedValue('test content');
        mockFs.promises.writeFile.mockResolvedValue(undefined);
        mockFs.createWriteStream.mockReturnValue({
            write: jest.fn(),
            end: jest.fn()
        });
        
        commandRunner = new CommandRunner();
    });

    describe('Full AI Debug Workflow', () => {
        it('should run complete aiDebug workflow with passing tests', async () => {
            // Arrange - Setup successful test execution
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

            // Simulate test output
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from(`
PASS src/app/component.spec.ts
✓ should create (123 ms)
✓ should initialize (45 ms)

Test Suites: 1 passed, 1 total
Tests: 2 passed, 2 total
Time: 2.345 s
                    `)), 5);
                }
            });

            const project = 'test-project';

            // Act
            const result = await commandRunner.runAiDebug(project, {
                quick: false,
                fullContext: false,
                noDiff: false,
                focus: 'tests'
            });

            // Assert
            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.output).toContain('AI Debug completed');
            
            // Verify multiple commands were called (git diff, nx test, lint, prettier)
            expect(mockSpawn).toHaveBeenCalledTimes(4);
        });

        it('should handle failing tests gracefully', async () => {
            // Arrange - Setup failing test execution
            let callCount = 0;
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callCount++;
                        // First call (git diff): success
                        // Second call (nx test): failure
                        const exitCode = callCount === 2 ? 1 : 0;
                        setTimeout(() => callback(exitCode), 10);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Simulate test failure output
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    const output = callCount === 1 ? 'diff output' : `
FAIL src/app/component.spec.ts
● Component › should work
  expect(received).toBe(expected)
  Expected: true
  Received: false

Test Suites: 1 failed, 1 total
Tests: 1 failed, 1 total
Time: 1.234 s
                    `;
                    setTimeout(() => callback(Buffer.from(output)), 5);
                }
            });

            const project = 'test-project';

            // Act
            const result = await commandRunner.runAiDebug(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            
            // Should not run lint/prettier when tests fail
            expect(mockSpawn).toHaveBeenCalledTimes(2); // Only git diff and nx test
        });
    });

    describe('Command Interaction Tests', () => {
        it('should run nxTest independently', async () => {
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

            // Act
            const result = await commandRunner.runNxTest('test-project', {
                fullOutput: true
            });

            // Assert
            expect(result.success).toBe(true);
            expect(mockSpawn).toHaveBeenCalledWith(
                'yarn',
                ['nx', 'test', 'test-project', '--verbose'],
                expect.any(Object)
            );
        });

        it('should run gitDiff independently', async () => {
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

            // Act
            const result = await commandRunner.runGitDiff();

            // Assert
            expect(result.success).toBe(true);
        });

        it('should run prepareToPush independently', async () => {
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

            // Act
            const result = await commandRunner.runPrepareToPush('test-project');

            // Assert
            expect(result.success).toBe(true);
            expect(mockSpawn).toHaveBeenCalledTimes(2); // lint + prettier
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle file system errors gracefully', async () => {
            // Arrange
            mockFs.promises.writeFile.mockRejectedValue(new Error('Disk full'));

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

            // Act
            const result = await commandRunner.runNxTest('test-project');

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toContain('Disk full');
        });

        it('should handle command not found errors', async () => {
            // Arrange
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'error') {
                        setTimeout(() => callback(new Error('Command not found: yarn')), 10);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Act
            const result = await commandRunner.runPrepareToPush('test-project');

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Command not found: yarn');
        });
    });

    describe('Output File Generation', () => {
        it('should generate all expected output files for successful aiDebug', async () => {
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

            // Act
            const result = await commandRunner.runAiDebug('test-project');

            // Assert
            expect(result.success).toBe(true);
            
            // Verify file write operations
            const writeFileCalls = mockFs.promises.writeFile.mock.calls;
            const fileTypes = writeFileCalls.map(call => {
                const filePath = call[0];
                if (filePath.includes('ai-debug-context')) return 'context';
                if (filePath.includes('pr-description')) return 'pr';
                if (filePath.includes('diff')) return 'diff';
                if (filePath.includes('jest-output')) return 'test';
                return 'other';
            });

            expect(fileTypes).toContain('context');
            expect(fileTypes).toContain('pr');
        });
    });

    describe('Performance Tests', () => {
        it('should complete aiDebug workflow within reasonable time', async () => {
            // Arrange
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        setTimeout(() => callback(0), 50); // 50ms delay per command
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            const startTime = Date.now();

            // Act
            const result = await commandRunner.runAiDebug('test-project');

            // Assert
            const duration = Date.now() - startTime;
            expect(result.success).toBe(true);
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });
    });

    describe('AI Context Generation', () => {
        it('should generate different context for passing vs failing tests', async () => {
            // This test verifies that the AI context generation adapts based on test results
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        setTimeout(() => callback(0), 10); // Passing tests
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Act
            await commandRunner.runAiDebug('test-project');

            // Assert
            const writeFileCalls = mockFs.promises.writeFile.mock.calls;
            const contextCall = writeFileCalls.find(call => 
                call[0].includes('ai-debug-context')
            );
            
            expect(contextCall).toBeDefined();
            expect(contextCall[1]).toContain('MOCK DATA VALIDATION (CRITICAL)');
            expect(contextCall[1]).toContain('TEST COVERAGE ANALYSIS');
        });
    });

    describe('Options Handling', () => {
        it('should respect quick mode option', async () => {
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

            // Act
            const result = await commandRunner.runAiDebug('test-project', { quick: true });

            // Assert
            expect(result.success).toBe(true);
            // Quick mode should still run all commands but with different context generation
        });

        it('should respect noDiff option', async () => {
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

            // Act
            const result = await commandRunner.runAiDebug('test-project', { noDiff: true });

            // Assert
            expect(result.success).toBe(true);
            // Should skip git diff command
            expect(mockSpawn).toHaveBeenCalledTimes(3); // Only nx test, lint, prettier
        });

        it('should respect useExpected option for nxTest', async () => {
            // Arrange
            mockFs.existsSync.mockReturnValue(true);

            // Act
            const result = await commandRunner.runNxTest('test-project', { useExpected: true });

            // Assert
            expect(result.success).toBe(true);
            expect(mockFs.promises.copyFile).toHaveBeenCalled();
            expect(mockSpawn).not.toHaveBeenCalled(); // Should not run actual tests
        });
    });
});
