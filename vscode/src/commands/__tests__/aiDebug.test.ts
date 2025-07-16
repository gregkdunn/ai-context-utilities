import { AiDebugCommand } from '../aiDebug';
import { CommandOptions } from '../../types';
import { FileManager } from '../../utils/fileManager';
import { CommandRunner } from '../../utils/shellRunner';
import * as vscode from 'vscode';

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

// Mock CommandRunner
jest.mock('../../utils/shellRunner');
const MockedCommandRunner = CommandRunner as jest.MockedClass<typeof CommandRunner>;

describe('AiDebugCommand', () => {
    let aiDebugCommand: AiDebugCommand;
    let mockFileManager: jest.Mocked<FileManager>;
    let mockCommandRunner: jest.Mocked<CommandRunner>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup FileManager mock
        mockFileManager = {
            initializeOutputFiles: jest.fn().mockResolvedValue({
                'ai-debug-context': '/test/ai-debug-context.txt',
                'pr-description-prompt': '/test/pr-description-prompt.txt',
                'diff': '/test/diff.txt',
                'jest-output': '/test/jest-output.txt'
            }),
            readFile: jest.fn(),
            writeFile: jest.fn(),
            getFileStats: jest.fn().mockResolvedValue({
                size: '10KB',
                lines: 250
            }),
            ensureDirectoryExists: jest.fn(),
            deleteFile: jest.fn()
        } as any;

        // Setup CommandRunner mock
        mockCommandRunner = {
            runGitDiff: jest.fn(),
            runNxTest: jest.fn(),
            runPrepareToPush: jest.fn()
        } as any;

        MockedFileManager.mockImplementation(() => mockFileManager);
        MockedCommandRunner.mockImplementation(() => mockCommandRunner);
        
        aiDebugCommand = new AiDebugCommand();
    });

    describe('run', () => {
        it('should execute full aiDebug workflow when tests pass', async () => {
            // Arrange
            const project = 'test-project';
            const options: CommandOptions = {
                quick: false,
                fullContext: false,
                noDiff: false,
                focus: 'tests'
            };

            mockCommandRunner.runGitDiff.mockResolvedValue({
                success: true,
                exitCode: 0,
                output: 'git diff output',
                duration: 1000
            });

            mockCommandRunner.runNxTest.mockResolvedValue({
                success: true,
                exitCode: 0,
                output: 'test output',
                duration: 5000
            });

            mockFileManager.readFile.mockResolvedValue('test file content');

            // Act
            const result = await aiDebugCommand.run(project, options);

            // Assert
            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(mockFileManager.initializeOutputFiles).toHaveBeenCalledWith([
                'ai-debug-context', 'pr-description-prompt', 'diff', 'jest-output'
            ]);
            expect(mockCommandRunner.runGitDiff).toHaveBeenCalledWith({
                aiContext: true,
                smartDiff: true
            });
            expect(mockCommandRunner.runNxTest).toHaveBeenCalledWith(project, {
                fullOutput: false,
                useExpected: undefined
            });
            expect(mockFileManager.writeFile).toHaveBeenCalled();
        });

        it('should skip git diff when noDiff option is true', async () => {
            // Arrange
            const project = 'test-project';
            const options: CommandOptions = { noDiff: true };

            mockCommandRunner.runNxTest.mockResolvedValue({
                success: true,
                exitCode: 0,
                output: 'test output',
                duration: 5000
            });

            mockFileManager.readFile.mockResolvedValue('test file content');

            // Act
            await aiDebugCommand.run(project, options);

            // Assert
            expect(mockCommandRunner.runGitDiff).not.toHaveBeenCalled();
        });

        it('should use fullContext when option is specified', async () => {
            // Arrange
            const project = 'test-project';
            const options: CommandOptions = { fullContext: true };

            mockCommandRunner.runNxTest.mockResolvedValue({
                success: true,
                exitCode: 0,
                output: 'test output',
                duration: 5000
            });

            mockFileManager.readFile.mockResolvedValue('test file content');

            // Act
            await aiDebugCommand.run(project, options);

            // Assert
            expect(mockCommandRunner.runNxTest).toHaveBeenCalledWith(project, {
                fullOutput: true,
                useExpected: undefined
            });
        });

        it('should run prepareToPush when tests pass', async () => {
            // Arrange
            const project = 'test-project';
            
            mockCommandRunner.runNxTest.mockResolvedValue({
                success: true,
                exitCode: 0,
                output: 'test output',
                duration: 5000
            });

            mockFileManager.readFile.mockResolvedValue('test file content');

            // Mock spawn for lint and prettier
            const { spawn } = require('child_process');
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0); // Success
                    }
                })
            };
            
            jest.mock('child_process', () => ({
                spawn: jest.fn(() => mockProcess)
            }));

            // Act
            await aiDebugCommand.run(project);

            // Assert - The command should attempt to run lint and prettier
            expect(mockFileManager.writeFile).toHaveBeenCalled();
        });

        it('should handle test failures gracefully', async () => {
            // Arrange
            const project = 'test-project';
            
            mockCommandRunner.runNxTest.mockResolvedValue({
                success: false,
                exitCode: 1,
                output: 'test failed',
                error: 'Test failure message',
                duration: 5000
            });

            mockFileManager.readFile.mockResolvedValue('test file content');

            // Act
            const result = await aiDebugCommand.run(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(mockFileManager.writeFile).toHaveBeenCalled(); // Should still create context file
        });

        it('should handle errors during execution', async () => {
            // Arrange
            const project = 'test-project';
            
            mockFileManager.initializeOutputFiles.mockRejectedValue(new Error('File system error'));

            // Act
            const result = await aiDebugCommand.run(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.error).toBe('File system error');
        });

        it('should generate PR description when tests pass', async () => {
            // Arrange
            const project = 'test-project';
            
            mockCommandRunner.runNxTest.mockResolvedValue({
                success: true,
                exitCode: 0,
                output: 'test output',
                duration: 5000
            });

            mockFileManager.readFile.mockResolvedValue('test file content');

            // Act
            await aiDebugCommand.run(project);

            // Assert
            const writeFileCalls = mockFileManager.writeFile.mock.calls;
            const prDescriptionCall = writeFileCalls.find(call => 
                call[0].includes('pr-description-prompt')
            );
            expect(prDescriptionCall).toBeDefined();
        });

        it('should include focus-specific guidance in context', async () => {
            // Arrange
            const project = 'test-project';
            const options: CommandOptions = { focus: 'types' };
            
            mockCommandRunner.runNxTest.mockResolvedValue({
                success: true,
                exitCode: 0,
                output: 'test output',
                duration: 5000
            });

            mockFileManager.readFile.mockResolvedValue('test file content');

            // Act
            await aiDebugCommand.run(project, options);

            // Assert
            const writeFileCalls = mockFileManager.writeFile.mock.calls;
            const contextCall = writeFileCalls.find(call => 
                call[0].includes('ai-debug-context')
            );
            expect(contextCall).toBeDefined();
            expect(contextCall[1]).toContain('FOCUS AREA: TypeScript type issues');
        });
    });

    describe('createAiDebugContext', () => {
        it('should create context for passing tests', async () => {
            // Arrange
            const contextFile = '/test/context.txt';
            const project = 'test-project';
            
            mockFileManager.readFile.mockResolvedValue('test results');

            // Act
            await (aiDebugCommand as any).createAiDebugContext(
                contextFile,
                '/test/diff.txt',
                '/test/jest.txt',
                project,
                0, // exitCode: 0 (passing)
                'general',
                false,
                0, // lintExitCode: 0 (passing)
                0  // prettierExitCode: 0 (passing)
            );

            // Assert
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                contextFile,
                expect.stringContaining('STATUS: ✅ TESTS PASSING')
            );
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                contextFile,
                expect.stringContaining('MOCK DATA VALIDATION (CRITICAL)')
            );
        });

        it('should create context for failing tests', async () => {
            // Arrange
            const contextFile = '/test/context.txt';
            const project = 'test-project';
            
            mockFileManager.readFile.mockResolvedValue('test failures');

            // Act
            await (aiDebugCommand as any).createAiDebugContext(
                contextFile,
                '/test/diff.txt',
                '/test/jest.txt',
                project,
                1, // exitCode: 1 (failing)
                'general',
                false,
                0, // lintExitCode: 0 (passing)
                0  // prettierExitCode: 0 (passing)
            );

            // Assert
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                contextFile,
                expect.stringContaining('STATUS: ❌ TESTS FAILING')
            );
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                contextFile,
                expect.stringContaining('ROOT CAUSE ANALYSIS')
            );
        });

        it('should handle missing test file', async () => {
            // Arrange
            const contextFile = '/test/context.txt';
            const project = 'test-project';
            
            mockFileManager.readFile.mockRejectedValue(new Error('File not found'));

            // Act
            await (aiDebugCommand as any).createAiDebugContext(
                contextFile,
                '/test/diff.txt',
                '/test/jest.txt',
                project,
                0,
                'general',
                false,
                0,
                0
            );

            // Assert
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                contextFile,
                expect.stringContaining('❌ No test results available')
            );
        });
    });

    describe('createPrDescriptionPrompts', () => {
        it('should create PR description prompts', async () => {
            // Arrange
            const prFile = '/test/pr-description.txt';
            const project = 'test-project';

            // Act
            await (aiDebugCommand as any).createPrDescriptionPrompts(
                prFile,
                '/test/diff.txt',
                '/test/jest.txt',
                project,
                0, // exitCode: 0 (passing)
                0, // lintExitCode: 0 (passing)
                0  // prettierExitCode: 0 (passing)
            );

            // Assert
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                prFile,
                expect.stringContaining('GITHUB PR DESCRIPTION GENERATION PROMPTS')
            );
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                prFile,
                expect.stringContaining('TEST STATUS: ✅ All tests passing')
            );
        });

        it('should indicate failing tests in PR prompts', async () => {
            // Arrange
            const prFile = '/test/pr-description.txt';
            const project = 'test-project';

            // Act
            await (aiDebugCommand as any).createPrDescriptionPrompts(
                prFile,
                '/test/diff.txt',
                '/test/jest.txt',
                project,
                1, // exitCode: 1 (failing)
                0, // lintExitCode: 0 (passing)
                0  // prettierExitCode: 0 (passing)
            );

            // Assert
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                prFile,
                expect.stringContaining('TEST STATUS: ❌ Some tests failing')
            );
        });
    });

    describe('countChangedFiles', () => {
        it('should count changed files from diff output', () => {
            // Arrange
            const diffOutput = `📁 FILE: file1.ts
Some diff content
📁 FILE: file2.ts
More diff content
📁 FILE: file3.spec.ts
Test diff content`;

            // Act
            const count = (aiDebugCommand as any).countChangedFiles(diffOutput);

            // Assert
            expect(count).toBe(3);
        });

        it('should return 0 for empty diff output', () => {
            // Arrange
            const diffOutput = '';

            // Act
            const count = (aiDebugCommand as any).countChangedFiles(diffOutput);

            // Assert
            expect(count).toBe(0);
        });
    });
});
