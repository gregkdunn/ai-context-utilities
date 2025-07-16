import { NxTestCommand } from '../nxTest';
import { CommandOptions } from '../../types';
import { FileManager } from '../../utils/fileManager';
import { StreamingCommandRunner } from '../../utils/streamingRunner';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

// Mock StreamingCommandRunner
jest.mock('../../utils/streamingRunner');
const MockedStreamingCommandRunner = StreamingCommandRunner as jest.MockedClass<typeof StreamingCommandRunner>;

// Mock fs module
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
    createWriteStream: jest.fn()
}));

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

// Mock os module
jest.mock('os', () => ({
    tmpdir: jest.fn(() => '/tmp')
}));

// Mock path module
jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/')),
    dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/'))
}));

describe('NxTestCommand', () => {
    let nxTestCommand: NxTestCommand;
    let mockFileManager: jest.Mocked<FileManager>;
    let mockFs: jest.Mocked<typeof fs>;
    let mockSpawn: jest.MockedFunction<any>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup FileManager mock
        mockFileManager = {
            getOutputFilePath: jest.fn().mockResolvedValue('/test/jest-output.txt'),
            ensureDirectoryExists: jest.fn(),
            getFileStats: jest.fn().mockResolvedValue({
                size: '10KB',
                lines: 100
            })
        } as any;

        mockFs = fs as jest.Mocked<typeof fs>;
        mockSpawn = require('child_process').spawn;

        MockedFileManager.mockImplementation(() => mockFileManager);
        
        nxTestCommand = new NxTestCommand();
    });

    describe('run', () => {
        beforeEach(() => {
            // Setup default file system mocks
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ size: 1000 } as any);
            mockFs.readFileSync.mockReturnValue('test output\nline 2\nline 3');
            mockFs.promises.readFile.mockResolvedValue('test output content');
            mockFs.promises.writeFile.mockResolvedValue(undefined);
            mockFs.createWriteStream.mockReturnValue({
                write: jest.fn(),
                end: jest.fn()
            } as any);
        });

        it('should run tests and generate AI-optimized output', async () => {
            // Arrange
            const project = 'test-project';
            const options: CommandOptions = {};

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

            // Act
            const result = await nxTestCommand.run(project, options);

            // Assert
            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(mockSpawn).toHaveBeenCalledWith(
                'yarn',
                ['nx', 'test', project, '--verbose'],
                expect.objectContaining({
                    cwd: '/test/workspace',
                    shell: true
                })
            );
        });

        it('should use expected output when useExpected option is true', async () => {
            // Arrange
            const project = 'test-project';
            const options: CommandOptions = { useExpected: true };

            mockFileManager.getOutputFilePath.mockImplementation((fileName) => {
                if (fileName === 'jest-output.txt') return Promise.resolve('/test/jest-output.txt');
                if (fileName === 'jest-output-expected.txt') return Promise.resolve('/test/jest-output-expected.txt');
                return Promise.resolve('/test/' + fileName);
            });

            // Act
            const result = await nxTestCommand.run(project, options);

            // Assert
            expect(result.success).toBe(true);
            expect(mockFs.promises.copyFile).toHaveBeenCalledWith(
                '/test/jest-output-expected.txt',
                '/test/jest-output.txt'
            );
            expect(mockSpawn).not.toHaveBeenCalled(); // Should not run tests
        });

        it('should handle test execution failure', async () => {
            // Arrange
            const project = 'test-project';
            
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        setTimeout(() => callback(1), 10); // Failure
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Act
            const result = await nxTestCommand.run(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
        });

        it('should generate full output when fullOutput option is true', async () => {
            // Arrange
            const project = 'test-project';
            const options: CommandOptions = { fullOutput: true };

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

            // Act
            await nxTestCommand.run(project, options);

            // Assert
            // Verify that full output is used instead of AI-optimized
            expect(mockFs.promises.copyFile).toHaveBeenCalled();
        });

        it('should handle missing raw output file', async () => {
            // Arrange
            const project = 'test-project';
            
            mockFs.existsSync.mockReturnValue(false);
            
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
            const result = await nxTestCommand.run(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('No test output captured');
        });
    });

    describe('cleanAnsiCodes', () => {
        it('should remove ANSI escape sequences', async () => {
            // Arrange
            const inputFile = '/tmp/input.txt';
            const outputFile = '/tmp/output.txt';
            const content = '\x1b[32mGreen text\x1b[0m\r\nNormal text';
            
            mockFs.promises.readFile.mockResolvedValue(content);
            mockFs.promises.writeFile.mockResolvedValue(undefined);

            // Act
            const result = await (nxTestCommand as any).cleanAnsiCodes(inputFile, outputFile);

            // Assert
            expect(result).toBe(true);
            expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
                outputFile,
                'Green textNormal text'
            );
        });

        it('should handle file read error', async () => {
            // Arrange
            const inputFile = '/tmp/input.txt';
            const outputFile = '/tmp/output.txt';
            
            mockFs.promises.readFile.mockRejectedValue(new Error('File not found'));

            // Act
            const result = await (nxTestCommand as any).cleanAnsiCodes(inputFile, outputFile);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('createAiOptimizedOutput', () => {
        it('should create optimized output for passing tests', async () => {
            // Arrange
            const inputFile = '/tmp/input.txt';
            const outputFile = '/tmp/output.txt';
            const testArgs = 'test-project';
            const exitCode = 0;

            const testOutput = `
PASS src/app/test.spec.ts (5.123 s)
PASS src/lib/other.spec.ts (2.456 s)
Test Suites: 2 passed, 2 total
Tests: 10 passed, 10 total
Time: 7.579 s
            `.trim();

            mockFs.promises.readFile.mockResolvedValue(testOutput);
            mockFs.promises.writeFile.mockResolvedValue(undefined);

            // Act
            await (nxTestCommand as any).createAiOptimizedOutput(inputFile, outputFile, testArgs, exitCode);

            // Assert
            expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
                outputFile,
                expect.stringContaining('STATUS: ✅ PASSED')
            );
            expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
                outputFile,
                expect.stringContaining('EXECUTIVE SUMMARY')
            );
        });

        it('should create optimized output for failing tests', async () => {
            // Arrange
            const inputFile = '/tmp/input.txt';
            const outputFile = '/tmp/output.txt';
            const testArgs = 'test-project';
            const exitCode = 1;

            const testOutput = `
FAIL src/app/test.spec.ts
● Component › should create
  expect(received).toBeTruthy()
Test suite failed to run
error TS2345: Argument of type 'string' is not assignable to parameter
Test Suites: 1 failed, 1 total
Tests: 0 passed, 1 failed, 1 total
Time: 3.123 s
            `.trim();

            mockFs.promises.readFile.mockResolvedValue(testOutput);
            mockFs.promises.writeFile.mockResolvedValue(undefined);

            // Act
            await (nxTestCommand as any).createAiOptimizedOutput(inputFile, outputFile, testArgs, exitCode);

            // Assert
            expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
                outputFile,
                expect.stringContaining('STATUS: ❌ FAILED')
            );
            expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
                outputFile,
                expect.stringContaining('FAILURE ANALYSIS')
            );
            expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
                outputFile,
                expect.stringContaining('COMPILATION/RUNTIME ERRORS')
            );
        });
    });

    describe('extractPattern', () => {
        it('should extract matching pattern from lines', () => {
            // Arrange
            const lines = [
                'Some text',
                'Test Suites: 2 passed, 0 failed, 2 total',
                'More text'
            ];
            const pattern = /Test Suites:.*total/;

            // Act
            const result = (nxTestCommand as any).extractPattern(lines, pattern);

            // Assert
            expect(result).toBe('Test Suites: 2 passed, 0 failed, 2 total');
        });

        it('should return empty string when pattern not found', () => {
            // Arrange
            const lines = ['Some text', 'More text'];
            const pattern = /Test Suites:.*total/;

            // Act
            const result = (nxTestCommand as any).extractPattern(lines, pattern);

            // Assert
            expect(result).toBe('');
        });
    });

    describe('countMatches', () => {
        it('should count matching lines', () => {
            // Arrange
            const lines = [
                'PASS src/app/test.spec.ts',
                'FAIL src/app/other.spec.ts',
                'PASS src/lib/service.spec.ts',
                'Some other text'
            ];
            const pattern = /PASS.*\.spec\.ts/;

            // Act
            const result = (nxTestCommand as any).countMatches(lines, pattern);

            // Assert
            expect(result).toBe(2);
        });

        it('should return 0 when no matches found', () => {
            // Arrange
            const lines = ['Some text', 'More text'];
            const pattern = /PASS.*\.spec\.ts/;

            // Act
            const result = (nxTestCommand as any).countMatches(lines, pattern);

            // Assert
            expect(result).toBe(0);
        });
    });
});
