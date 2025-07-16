import { PrepareToPushCommand } from '../prepareToPush';
import { CommandOptions } from '../../types';

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

describe('PrepareToPushCommand', () => {
    let prepareToPushCommand: PrepareToPushCommand;
    let mockSpawn: jest.MockedFunction<any>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSpawn = require('child_process').spawn;
        
        prepareToPushCommand = new PrepareToPushCommand();
    });

    describe('run', () => {
        it('should run lint and prettier successfully', async () => {
            // Arrange
            const project = 'test-project';
            const options: CommandOptions = {};

            let callCount = 0;
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callCount++;
                        setTimeout(() => callback(0), 10); // Success for both lint and prettier
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Act
            const result = await prepareToPushCommand.run(project, options);

            // Assert
            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(mockSpawn).toHaveBeenCalledTimes(2);
            expect(mockSpawn).toHaveBeenNthCalledWith(1, 'yarn', ['nx', 'lint', project], expect.any(Object));
            expect(mockSpawn).toHaveBeenNthCalledWith(2, 'yarn', ['nx', 'prettier', project, '--write'], expect.any(Object));
        });

        it('should fail when lint fails', async () => {
            // Arrange
            const project = 'test-project';
            
            let callCount = 0;
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callCount++;
                        if (callCount === 1) {
                            // Lint fails
                            setTimeout(() => callback(1), 10);
                        }
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Act
            const result = await prepareToPushCommand.run(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(mockSpawn).toHaveBeenCalledTimes(1); // Only lint should be called
            expect(mockSpawn).toHaveBeenCalledWith('yarn', ['nx', 'lint', project], expect.any(Object));
        });

        it('should fail when prettier fails after lint succeeds', async () => {
            // Arrange
            const project = 'test-project';
            
            let callCount = 0;
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callCount++;
                        if (callCount === 1) {
                            // Lint succeeds
                            setTimeout(() => callback(0), 10);
                        } else if (callCount === 2) {
                            // Prettier fails
                            setTimeout(() => callback(1), 10);
                        }
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Act
            const result = await prepareToPushCommand.run(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(mockSpawn).toHaveBeenCalledTimes(2);
            expect(mockSpawn).toHaveBeenNthCalledWith(1, 'yarn', ['nx', 'lint', project], expect.any(Object));
            expect(mockSpawn).toHaveBeenNthCalledWith(2, 'yarn', ['nx', 'prettier', project, '--write'], expect.any(Object));
        });

        it('should throw error when project name is not provided', async () => {
            // Arrange
            const project = '';

            // Act
            const result = await prepareToPushCommand.run(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.error).toBe('Project name is required');
            expect(mockSpawn).not.toHaveBeenCalled();
        });

        it('should handle process errors during lint', async () => {
            // Arrange
            const project = 'test-project';
            
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'error') {
                        setTimeout(() => callback(new Error('Command not found')), 10);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Act
            const result = await prepareToPushCommand.run(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.error).toBe('Command not found');
        });

        it('should capture stdout and stderr output during lint', async () => {
            // Arrange
            const project = 'test-project';
            
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

            // Simulate stdout and stderr data
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback('Lint output'), 5);
                }
            });

            mockProcess.stderr.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback('Lint warnings'), 5);
                }
            });

            // Act
            const result = await prepareToPushCommand.run(project);

            // Assert
            expect(result.success).toBe(true);
            expect(result.output).toContain('Lint output');
        });

        it('should capture prettier output after successful lint', async () => {
            // Arrange
            const project = 'test-project';
            
            let callCount = 0;
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callCount++;
                        setTimeout(() => callback(0), 10);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockProcess);

            // Simulate different output for each call
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    const output = callCount === 0 ? 'Lint output' : 'Prettier output';
                    setTimeout(() => callback(output), 5);
                }
            });

            // Act
            const result = await prepareToPushCommand.run(project);

            // Assert
            expect(result.success).toBe(true);
            expect(mockSpawn).toHaveBeenCalledTimes(2);
        });
    });

    describe('executeLint', () => {
        it('should execute lint command with correct arguments', async () => {
            // Arrange
            const project = 'test-project';
            
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
            const result = await (prepareToPushCommand as any).executeLint(project);

            // Assert
            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(mockSpawn).toHaveBeenCalledWith(
                'yarn',
                ['nx', 'lint', project],
                expect.objectContaining({
                    cwd: '/test/workspace',
                    shell: true
                })
            );
        });

        it('should return error when lint command fails', async () => {
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

            // Simulate error output
            mockProcess.stderr.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback('Linting errors found'), 5);
                }
            });

            // Act
            const result = await (prepareToPushCommand as any).executeLint(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.error).toBe('Linting errors found');
        });
    });

    describe('executePrettier', () => {
        it('should execute prettier command with correct arguments', async () => {
            // Arrange
            const project = 'test-project';
            
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
            const result = await (prepareToPushCommand as any).executePrettier(project);

            // Assert
            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(mockSpawn).toHaveBeenCalledWith(
                'yarn',
                ['nx', 'prettier', project, '--write'],
                expect.objectContaining({
                    cwd: '/test/workspace',
                    shell: true
                })
            );
        });

        it('should return error when prettier command fails', async () => {
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

            // Simulate error output
            mockProcess.stderr.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback('Prettier formatting errors'), 5);
                }
            });

            // Act
            const result = await (prepareToPushCommand as any).executePrettier(project);

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.error).toBe('Prettier formatting errors');
        });
    });

    describe('getWorkspaceRoot', () => {
        it('should return workspace root path', () => {
            // Act
            const result = (prepareToPushCommand as any).getWorkspaceRoot();

            // Assert
            expect(result).toBe('/test/workspace');
        });
    });
});
