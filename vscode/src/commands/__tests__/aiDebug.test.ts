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

// Mock child_process for spawn calls
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

describe('AiDebugCommand', () => {
    let aiDebugCommand: AiDebugCommand;
    let mockFileManager: jest.Mocked<FileManager>;
    let mockCommandRunner: jest.Mocked<CommandRunner>;
    let mockSpawn: jest.MockedFunction<any>;

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
            saveOutput: jest.fn().mockResolvedValue('/test/file.txt'),
            getFileContent: jest.fn().mockResolvedValue('test file content'),
            getFileStats: jest.fn().mockResolvedValue({
                size: 1024,
                created: new Date(),
                modified: new Date(),
                accessed: new Date()
            }),
            readFile: jest.fn(),
            writeFile: jest.fn().mockResolvedValue({ success: true, path: '/test/file.txt' }),
            ensureDirectoryExists: jest.fn(),
            deleteFile: jest.fn()
        } as any;

        // Setup CommandRunner mock
        mockCommandRunner = {
            runGitDiff: jest.fn().mockResolvedValue({
                success: true,
                exitCode: 0,
                output: 'git diff output',
                duration: 1000
            }),
            runNxTest: jest.fn().mockResolvedValue({
                success: true,
                exitCode: 0,
                output: 'test output',
                duration: 5000
            })
        } as any;

        MockedFileManager.mockImplementation(() => mockFileManager);
        MockedCommandRunner.mockImplementation(() => mockCommandRunner);
        
        // Setup spawn mock
        mockSpawn = require('child_process').spawn;
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

            // Command runner is already set up in beforeEach with successful responses

            // Act
            const result = await aiDebugCommand.run(project, options);

            // Assert
            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(mockCommandRunner.runGitDiff).toHaveBeenCalled();
            expect(mockCommandRunner.runNxTest).toHaveBeenCalledWith(project, expect.objectContaining({ fullOutput: false }));
            expect(mockFileManager.saveOutput).toHaveBeenCalled();
        });

        it('should skip git diff when noDiff option is true', async () => {
            // Arrange
            const project = 'test-project';
            const options: CommandOptions = { noDiff: true };

            // Test runner already mocked with successful response

            // Act
            await aiDebugCommand.run(project, options);

            // Assert
            expect(mockCommandRunner.runGitDiff).not.toHaveBeenCalled();
        });

        it('should use fullContext when option is specified', async () => {
            // Arrange
            const project = 'test-project';
            const options: CommandOptions = { fullContext: true };

            // Test already set up with successful mocks

            // Act
            await aiDebugCommand.run(project, options);

            // Assert
            expect(mockCommandRunner.runNxTest).toHaveBeenCalledWith(project, expect.objectContaining({ fullOutput: true }));
        });

        it('should run prepareToPush when tests pass', async () => {
            // Arrange
            const project = 'test-project';
            
            // Spawn is already mocked with successful responses

            // Act
            await aiDebugCommand.run(project);

            // Assert - The command should attempt to run lint and prettier
            expect(mockFileManager.saveOutput).toHaveBeenCalled();
        });

        it('should handle test failures gracefully', async () => {
            // Arrange
            const project = 'test-project';
            
            // Override the default successful mock for this test
            mockCommandRunner.runNxTest.mockResolvedValueOnce({
                success: false,
                exitCode: 1,
                output: 'test failed',
                error: 'Test failure message',
                duration: 5000
            });

            // Act
            const result = await aiDebugCommand.run(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(mockFileManager.saveOutput).toHaveBeenCalled(); // Should still create context file
        });

        it('should handle errors during execution', async () => {
            // Arrange
            const project = 'test-project';
            
            mockFileManager.initializeOutputFiles.mockRejectedValue(new Error('this.fileManager.initializeOutputFiles is not a function'));

            // Act
            const result = await aiDebugCommand.run(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.error).toBe('this.fileManager.initializeOutputFiles is not a function');
        });

        it('should generate PR description when tests pass', async () => {
            // Arrange
            const project = 'test-project';
            
            // Using default successful mocks

            // Act
            await aiDebugCommand.run(project);

            // Assert
            const saveOutputCalls = mockFileManager.saveOutput.mock.calls;
            const prDescriptionCall = saveOutputCalls.find(call => 
                call[0] === 'pr-description-prompt'
            );
            expect(prDescriptionCall).toBeDefined();
        });

        it('should include focus-specific guidance in context', async () => {
            // Arrange
            const project = 'test-project';
            const options: CommandOptions = { focus: 'types' };
            
            // Using default successful mocks

            // Act
            await aiDebugCommand.run(project, options);

            // Assert
            const saveOutputCalls = mockFileManager.saveOutput.mock.calls;
            const contextCall = saveOutputCalls.find(call => 
                call[0] === 'ai-debug-context'
            );
            expect(contextCall).toBeDefined();
            expect(contextCall![1]).toContain('FOCUS AREA: TypeScript type issues');
        });
    });

    describe('createAiDebugContext', () => {
        it('should create context for passing tests', async () => {
            // Arrange
            const contextFile = '/test/context.txt';
            const project = 'test-project';
            
            mockFileManager.getFileContent.mockResolvedValue('test results');

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
            expect(mockFileManager.saveOutput).toHaveBeenCalledWith(
                'ai-debug-context',
                expect.stringContaining('STATUS: ✅ TESTS PASSING')
            );
            expect(mockFileManager.saveOutput).toHaveBeenCalledWith(
                'ai-debug-context',
                expect.stringContaining('MOCK DATA VALIDATION (CRITICAL)')
            );
        });

        it('should create context for failing tests', async () => {
            // Arrange
            const contextFile = '/test/context.txt';
            const project = 'test-project';
            
            mockFileManager.getFileContent.mockResolvedValue('test failures');

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
            expect(mockFileManager.saveOutput).toHaveBeenCalledWith(
                'ai-debug-context',
                expect.stringContaining('STATUS: ❌ TESTS FAILING')
            );
            expect(mockFileManager.saveOutput).toHaveBeenCalledWith(
                'ai-debug-context',
                expect.stringContaining('ROOT CAUSE ANALYSIS')
            );
        });

        it('should handle missing test file', async () => {
            // Arrange
            const contextFile = '/test/context.txt';
            const project = 'test-project';
            
            mockFileManager.getFileContent.mockRejectedValue(new Error('File not found'));

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
            expect(mockFileManager.saveOutput).toHaveBeenCalledWith(
                'ai-debug-context',
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
            expect(mockFileManager.saveOutput).toHaveBeenCalledWith(
                'pr-description-prompt',
                expect.stringContaining('GITHUB PR DESCRIPTION GENERATION PROMPTS')
            );
            expect(mockFileManager.saveOutput).toHaveBeenCalledWith(
                'pr-description-prompt',
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
            expect(mockFileManager.saveOutput).toHaveBeenCalledWith(
                'pr-description-prompt',
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
