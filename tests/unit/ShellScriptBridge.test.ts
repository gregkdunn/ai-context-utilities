/**
 * Unit tests for ShellScriptBridge
 * 
 * Tests the VSCode extension's shell script bridge functionality
 * with 95% branch coverage requirement.
 */

import { ShellScriptBridge, ScriptResult, ScriptOptions } from '../../src/ShellScriptBridge';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PathLike } from 'fs';

// Mock VSCode API
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        })),
        showInformationMessage: jest.fn(() => Promise.resolve()),
        showErrorMessage: jest.fn(() => ({
            then: jest.fn((callback) => callback && callback('Show Details'))
        })),
        setStatusBarMessage: jest.fn()
    },
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' }
        }]
    }
}));

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    accessSync: jest.fn(),
    constants: {
        X_OK: 1,
        R_OK: 4,
        W_OK: 2,
        F_OK: 0
    }
}));

// Mock MacOSCompatibility
jest.mock('../../src/platform/MacOSCompatibility', () => ({
    MacOSCompatibility: jest.fn().mockImplementation(() => ({
        validateEnvironment: jest.fn().mockResolvedValue(true),
        detectEnvironment: jest.fn().mockResolvedValue({
            platform: 'darwin',
            version: '14.0.0',
            architecture: 'arm64',
            isValid: true
        }),
        getSystemInfo: jest.fn().mockResolvedValue({
            platform: 'darwin',
            version: '14.0.0',
            architecture: 'arm64'
        })
    }))
}));

describe('ShellScriptBridge', () => {
    let bridge: ShellScriptBridge;
    const mockSpawn = require('child_process').spawn;
    const mockFs = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
    const mockAccessSync = fs.accessSync as jest.MockedFunction<typeof fs.accessSync>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock file system to show scripts exist
        mockFs.mockImplementation((path: PathLike) => {
            const pathStr = path.toString();
            return pathStr.includes('scripts') || pathStr.includes('ai-debug-');
        });
        
        // Mock accessSync to not throw permissions errors
        mockAccessSync.mockImplementation(() => {
            // Don't throw - access is allowed
        });
        
        try {
            bridge = new ShellScriptBridge('/test/extension');
        } catch (error) {
            // If bridge creation fails, create a minimal mock
            bridge = {
                dispose: jest.fn()
            } as any;
        }
    });

    afterEach(() => {
        if (bridge && typeof bridge.dispose === 'function') {
            bridge.dispose();
        }
    });

    describe('constructor', () => {
        it('should initialize with extension path', () => {
            expect(bridge).toBeInstanceOf(ShellScriptBridge);
        });

        it('should use workspace root when no extension path provided', () => {
            const bridgeNoPath = new ShellScriptBridge();
            expect(bridgeNoPath).toBeInstanceOf(ShellScriptBridge);
            bridgeNoPath.dispose();
        });

        it('should throw error if script directory does not exist', () => {
            mockFs.mockReturnValue(false);
            expect(() => new ShellScriptBridge('/invalid/path')).toThrow();
        });

        it('should throw error if required scripts are missing', () => {
            mockFs.mockImplementation((path: PathLike) => {
                const pathStr = path.toString();
                // Script directory exists but individual scripts don't
                if (pathStr.includes('scripts') && !pathStr.includes('ai-debug-')) return true;
                return false; // Individual scripts don't exist
            });
            expect(() => new ShellScriptBridge('/test/extension')).toThrow('Required script not found');
        });
    });

    describe('runAffectedTests', () => {
        it('should execute affected tests script successfully', async () => {
            const mockProcess = createMockProcess(0, 'Tests passed', '');
            mockSpawn.mockReturnValue(mockProcess);

            const result = await bridge.runAffectedTests({ verbose: true });

            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(mockSpawn).toHaveBeenCalledWith(
                expect.stringContaining('ai-debug-affected-tests'),
                expect.arrayContaining(['--verbose']),
                expect.any(Object)
            );
        });

        it('should handle script execution failure', async () => {
            const mockProcess = createMockProcess(1, '', 'Test failed');
            mockSpawn.mockReturnValue(mockProcess);

            await expect(bridge.runAffectedTests()).rejects.toThrow('Test failed');
        });

        it('should handle script execution error', async () => {
            const mockProcess = createMockProcessWithError(new Error('Script not found'));
            mockSpawn.mockReturnValue(mockProcess);

            await expect(bridge.runAffectedTests()).rejects.toThrow();
        });

        it('should include default base branch argument', async () => {
            const mockProcess = createMockProcess(0, '', '');
            mockSpawn.mockReturnValue(mockProcess);

            await bridge.runAffectedTests();

            expect(mockSpawn).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['--base', 'main']),
                expect.any(Object)
            );
        });
    });

    describe('runParallelTests', () => {
        it('should execute parallel tests with test files', async () => {
            const mockProcess = createMockProcess(0, 'All tests passed', '');
            mockSpawn.mockReturnValue(mockProcess);

            const testFiles = ['test1.spec.ts', 'test2.spec.ts'];
            const result = await bridge.runParallelTests(testFiles);

            expect(result.success).toBe(true);
            expect(mockSpawn).toHaveBeenCalledWith(
                expect.stringContaining('ai-debug-parallel-tests'),
                expect.arrayContaining(['--concurrency']),
                expect.objectContaining({
                    stdio: ['pipe', 'pipe', 'pipe']
                })
            );
        });

        it('should handle empty test files array', async () => {
            const result = await bridge.runParallelTests([]);

            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toBe('No test files provided');
            expect(mockSpawn).not.toHaveBeenCalled();
        });

        it('should pass test files as input to script', async () => {
            const mockProcess = createMockProcess(0, '', '');
            mockSpawn.mockReturnValue(mockProcess);

            const testFiles = ['test1.spec.ts', 'test2.spec.ts'];
            await bridge.runParallelTests(testFiles);

            // Verify stdin.write was called with test files
            expect(mockProcess.stdin.write).toHaveBeenCalledWith('test1.spec.ts\ntest2.spec.ts');
        });

        it('should handle parallel test execution failure', async () => {
            const mockProcess = createMockProcess(1, '', 'Some tests failed');
            mockSpawn.mockReturnValue(mockProcess);

            await expect(bridge.runParallelTests(['test1.spec.ts'])).rejects.toThrow('Some tests failed');
        });
    });

    describe('startFileWatcher', () => {
        it('should start file watcher with default directory', async () => {
            const mockProcess = createMockAsyncProcess();
            mockSpawn.mockReturnValue(mockProcess);

            await bridge.startFileWatcher();

            expect(mockSpawn).toHaveBeenCalledWith(
                expect.stringContaining('ai-debug-watch'),
                expect.arrayContaining(['/test/workspace']),
                expect.any(Object)
            );
        });

        it('should start file watcher with custom directory', async () => {
            const mockProcess = createMockAsyncProcess();
            mockSpawn.mockReturnValue(mockProcess);

            await bridge.startFileWatcher('/custom/path');

            expect(mockSpawn).toHaveBeenCalledWith(
                expect.stringContaining('ai-debug-watch'),
                expect.arrayContaining(['/custom/path']),
                expect.any(Object)
            );
        });

        it('should include debounce argument', async () => {
            const mockProcess = createMockAsyncProcess();
            mockSpawn.mockReturnValue(mockProcess);

            await bridge.startFileWatcher();

            expect(mockSpawn).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['--debounce', '2']),
                expect.any(Object)
            );
        });

        it('should handle file watcher start error', async () => {
            mockSpawn.mockImplementation(() => {
                throw new Error('Failed to start watcher');
            });

            await expect(bridge.startFileWatcher()).rejects.toThrow('Failed to start file watcher');
        });
    });

    describe('stopCurrentExecution', () => {
        it('should stop running process', () => {
            const mockProcess = createMockAsyncProcess();
            mockSpawn.mockReturnValue(mockProcess);
            
            // Start a process
            bridge.startFileWatcher();
            
            // Stop it
            bridge.stopCurrentExecution();
            
            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
        });

        it('should handle stop when no process is running', () => {
            // Should not throw when no process is running
            expect(() => bridge.stopCurrentExecution()).not.toThrow();
        });
    });

    describe('isExecuting', () => {
        it('should return false when no process is running', () => {
            expect(bridge.isExecuting()).toBe(false);
        });

        it('should return true when process is running', () => {
            const mockProcess = createMockAsyncProcess();
            mockSpawn.mockReturnValue(mockProcess);
            
            bridge.startFileWatcher();
            
            expect(bridge.isExecuting()).toBe(true);
        });
    });

    describe('dispose', () => {
        it('should stop current execution and dispose resources', () => {
            const mockProcess = createMockAsyncProcess();
            mockSpawn.mockReturnValue(mockProcess);
            
            bridge.startFileWatcher();
            bridge.dispose();
            
            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
        });
    });


    // Helper functions to create mock processes
    function createMockProcess(exitCode: number, stdout: string, stderr: string, delay: number = 100) {
        const mockProcess = {
            stdin: {
                write: jest.fn(),
                end: jest.fn()
            },
            stdout: {
                on: jest.fn((event, callback) => {
                    if (event === 'data' && stdout) {
                        setTimeout(() => callback(Buffer.from(stdout)), 10);
                    }
                })
            },
            stderr: {
                on: jest.fn((event, callback) => {
                    if (event === 'data' && stderr) {
                        setTimeout(() => callback(Buffer.from(stderr)), 10);
                    }
                })
            },
            on: jest.fn((event, callback) => {
                if (event === 'close' && delay !== undefined && delay < 1500) {
                    // Only call callback if delay is reasonable (not simulating infinite)
                    setTimeout(() => callback(exitCode), delay);
                }
                // If delay is undefined, never call the callback (simulates hanging process)
            }),
            kill: jest.fn()
        };
        return mockProcess;
    }

    function createMockProcessWithError(error: Error) {
        const mockProcess = {
            stdin: { write: jest.fn(), end: jest.fn() },
            stdout: { on: jest.fn() },
            stderr: { on: jest.fn() },
            on: jest.fn((event, callback) => {
                if (event === 'error') {
                    setTimeout(() => callback(error), 10);
                }
            }),
            kill: jest.fn()
        };
        return mockProcess;
    }

    function createMockAsyncProcess() {
        const mockProcess = {
            stdin: { write: jest.fn(), end: jest.fn() },
            stdout: { on: jest.fn() },
            stderr: { on: jest.fn() },
            on: jest.fn(),
            kill: jest.fn()
        };
        return mockProcess;
    }
});

describe('ScriptResult interface', () => {
    it('should have correct structure', () => {
        const result: ScriptResult = {
            exitCode: 0,
            stdout: 'output',
            stderr: 'error',
            duration: 5,
            success: true
        };

        expect(result).toHaveProperty('exitCode');
        expect(result).toHaveProperty('stdout');
        expect(result).toHaveProperty('stderr');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('success');
    });
});

describe('ScriptOptions interface', () => {
    it('should have correct optional properties', () => {
        const options: ScriptOptions = {
            timeout: 30,
            verbose: true,
            args: ['--test'],
            input: 'input data',
            cwd: '/working/dir'
        };

        expect(options.timeout).toBe(30);
        expect(options.verbose).toBe(true);
        expect(options.args).toEqual(['--test']);
        expect(options.input).toBe('input data');
        expect(options.cwd).toBe('/working/dir');
    });

    it('should work with empty options', () => {
        const options: ScriptOptions = {};
        expect(options).toEqual({});
    });
});