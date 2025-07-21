import { StreamingCommandRunner } from '../../utils/streamingRunner';
import { CommandResult } from '../../types';
import { EventEmitter } from 'events';

// Mock child_process
class MockChildProcess extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    kill = jest.fn().mockReturnValue(true);
    pid = 12345;
}

const mockStdout = new EventEmitter();
const mockStderr = new EventEmitter();
const mockProcess = new MockChildProcess();

Object.assign(mockProcess, {
    stdout: mockStdout,
    stderr: mockStderr
});

jest.mock('child_process', () => ({
    spawn: jest.fn(() => mockProcess)
}));

const { spawn } = require('child_process');

describe('StreamingCommandRunner', () => {
    let streamingRunner: StreamingCommandRunner;
    let mockSpawn: jest.MockedFunction<typeof spawn>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create mock output channel
        const mockOutputChannel = {
            appendLine: jest.fn(),
            append: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            name: 'Test Output Channel'
        } as any;
        
        streamingRunner = new StreamingCommandRunner(mockOutputChannel);
        mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
        mockSpawn.mockReturnValue(mockProcess);
    });

    afterEach(() => {
        streamingRunner.removeAllListeners();
        // Clean up any remaining listeners on mock process
        mockProcess.removeAllListeners();
        mockStdout.removeAllListeners();
        mockStderr.removeAllListeners();
    });

    describe('executeWithStreaming', () => {
        it('should execute command and emit output events', async () => {
            // Arrange
            const outputSpy = jest.fn();
            const completeSpy = jest.fn();

            streamingRunner.on('output', outputSpy);
            streamingRunner.on('complete', completeSpy);

            // Act
            const promise = streamingRunner.executeWithStreaming('echo', ['hello']);

            // Simulate command execution
            mockStdout.emit('data', Buffer.from('hello\n'));
            mockProcess.emit('close', 0);

            const result = await promise;

            // Assert
            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.output).toBe('hello\n');
            expect(outputSpy).toHaveBeenCalledWith('hello\n');
            expect(completeSpy).toHaveBeenCalledWith(result);
        });

        it('should track progress based on output patterns', async () => {
            // Arrange
            const outputSpy = jest.fn();

            streamingRunner.on('output', outputSpy);

            // Act
            const promise = streamingRunner.executeWithStreaming('test', []);

            // Simulate progress
            mockStdout.emit('data', Buffer.from('Starting the process...\n'));
            mockStdout.emit('data', Buffer.from('Processing files...\n'));
            mockStdout.emit('data', Buffer.from('Finishing up...\n'));
            mockProcess.emit('close', 0);

            await promise;

            // Assert
            expect(outputSpy).toHaveBeenCalledWith('Starting the process...\n');
            expect(outputSpy).toHaveBeenCalledWith('Processing files...\n');
            expect(outputSpy).toHaveBeenCalledWith('Finishing up...\n');
        });

        it('should handle stderr output', async () => {
            // Arrange
            const errorSpy = jest.fn();
            streamingRunner.on('error', errorSpy);

            // Act
            const promise = streamingRunner.executeWithStreaming('test', []);

            // Simulate stderr output
            mockStderr.emit('data', Buffer.from('warning: something happened\n'));
            mockProcess.emit('close', 0);

            const result = await promise;

            // Assert
            expect(result.success).toBe(true);
            expect(result.error).toBe('warning: something happened\n');
            expect(errorSpy).toHaveBeenCalledWith('warning: something happened\n');
        });

        it('should handle command failure', async () => {
            // Arrange
            const completeSpy = jest.fn();
            streamingRunner.on('complete', completeSpy);

            // Act
            const promise = streamingRunner.executeWithStreaming('test', []);

            // Simulate command failure
            mockStdout.emit('data', Buffer.from('some output\n'));
            mockProcess.emit('close', 1);

            const result = await promise;

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.output).toBe('some output\n');
            expect(completeSpy).toHaveBeenCalledWith(result);
        });

        it('should handle process error', async () => {
            // Arrange
            const completeSpy = jest.fn();
            const errorSpy = jest.fn();
            
            // FIX: Add error event listener to handle unhandled errors
            streamingRunner.on('error', errorSpy);
            streamingRunner.on('complete', completeSpy);

            // Act
            const promise = streamingRunner.executeWithStreaming('test', []);

            // Simulate process error
            const error = new Error('Command not found');
            mockProcess.emit('error', error);

            const result = await promise;

            // Assert
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.error).toBe('Command not found');
            expect(errorSpy).toHaveBeenCalledWith('Command not found');
            expect(completeSpy).toHaveBeenCalledWith(result);
        });

        it('should pass correct spawn options', async () => {
            // Arrange
            const options = {
                cwd: '/test/dir'
            };

            // Act
            const promise = streamingRunner.executeWithStreaming('test', ['arg1', 'arg2'], options);
            mockProcess.emit('close', 0);
            await promise;

            // Assert
            expect(mockSpawn).toHaveBeenCalledWith('test', ['arg1', 'arg2'], expect.objectContaining({
                cwd: '/test/dir',
                env: expect.any(Object),
                stdio: ['pipe', 'pipe', 'pipe']
            }));
        });
    });

    describe('cancel', () => {
        it('should cancel running command', () => {
            // Start a command
            streamingRunner.executeWithStreaming('test', []);
            expect(streamingRunner.isRunning).toBe(true);

            // Act
            streamingRunner.cancel();

            // Assert
            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
            // Note: isRunning might still be true until the process actually terminates
        });

        it('should force kill after timeout', async () => {
            // Arrange
            jest.useFakeTimers();
            
            // Start a command
            streamingRunner.executeWithStreaming('test', []);
            
            // Act
            streamingRunner.cancel();
            
            // Fast-forward time
            jest.advanceTimersByTime(6000);

            // Allow any pending promises to resolve
            await Promise.resolve();

            // Assert
            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
            expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
            
            jest.useRealTimers();
        });

        it('should do nothing if no command running', () => {
            // Arrange
            expect(streamingRunner.isRunning).toBe(false);

            // Act
            streamingRunner.cancel();

            // Assert
            expect(mockProcess.kill).not.toHaveBeenCalled();
        });
    });

    describe('isRunning', () => {
        it('should return true when command is running', () => {
            // Act
            streamingRunner.executeWithStreaming('test', []);

            // Assert
            expect(streamingRunner.isRunning).toBe(true);
        });

        it('should return false when no command is running', () => {
            // Assert
            expect(streamingRunner.isRunning).toBe(false);
        });

        it('should return false after command completes', async () => {
            // Arrange
            const promise = streamingRunner.executeWithStreaming('test', []);

            expect(streamingRunner.isRunning).toBe(true);

            // Act
            mockProcess.emit('close', 0);
            await promise;

            // Assert
            expect(streamingRunner.isRunning).toBe(false);
        });
    });

    describe('getCurrentOutput', () => {
        it('should return accumulated output', async () => {
            // Act
            const promise = streamingRunner.executeWithStreaming('test', []);

            mockStdout.emit('data', Buffer.from('line 1\n'));
            mockStdout.emit('data', Buffer.from('line 2\n'));

            // Assert
            expect(streamingRunner.getCurrentOutput()).toBe('line 1\nline 2\n');

            mockProcess.emit('close', 0);
            await promise;
        });
    });

    describe('clearOutput', () => {
        it('should clear output buffers', async () => {
            // Arrange
            const errorSpy = jest.fn();
            streamingRunner.on('error', errorSpy);

            const promise = streamingRunner.executeWithStreaming('test', []);
            mockStdout.emit('data', Buffer.from('some output\n'));
            mockStderr.emit('data', Buffer.from('some error\n'));

            expect(streamingRunner.getCurrentOutput()).toBe('some output\nsome error\n');

            // Act
            streamingRunner.clearOutput();

            // Assert
            expect(streamingRunner.getCurrentOutput()).toBe('');
            
            // FIX: Verify that the error event was handled
            expect(errorSpy).toHaveBeenCalledWith('some error\n');

            mockProcess.emit('close', 0);
            await promise;
        });
    });

    describe('simulateProgress', () => {
        it('should emit progress events over time', async () => {
            // Arrange
            jest.useFakeTimers();
            const progressSpy = jest.fn();
            streamingRunner.on('progress', progressSpy);

            // Start a command
            streamingRunner.executeWithStreaming('test', []);

            // Act
            streamingRunner.simulateProgress(10000); // 10 seconds

            // Fast-forward time
            jest.advanceTimersByTime(1000); // 1 second = 9% progress
            jest.advanceTimersByTime(5000); // 6 seconds = 54% progress
            jest.advanceTimersByTime(4000); // 10 seconds = 90% progress

            // Allow any pending promises to resolve
            await Promise.resolve();

            // Assert
            expect(progressSpy).toHaveBeenCalledWith(9);
            expect(progressSpy).toHaveBeenCalledWith(54);
            expect(progressSpy).toHaveBeenCalledWith(90);
            
            jest.useRealTimers();
        });

        it('should stop when command is no longer running', async () => {
            // Arrange
            jest.useFakeTimers();
            const progressSpy = jest.fn();
            streamingRunner.on('progress', progressSpy);

            // Start and immediately complete command
            const promise = streamingRunner.executeWithStreaming('test', []);
            mockProcess.emit('close', 0);
            await promise; // Wait for command to complete

            // Act
            streamingRunner.simulateProgress(10000);
            jest.advanceTimersByTime(5000);

            // Allow any pending promises to resolve
            await Promise.resolve();

            // Assert
            expect(progressSpy).not.toHaveBeenCalled();
            
            jest.useRealTimers();
        });
    });

    describe('executeTestCommand', () => {
        it('should execute test command with predefined progress steps', async () => {
            // Arrange
            const outputSpy = jest.fn();
            streamingRunner.on('output', outputSpy);

            // Act
            const promise = streamingRunner.executeTestCommand('yarn', ['nx', 'test', 'project'], '/test/cwd');

            // Simulate test output with progress keywords
            mockStdout.emit('data', Buffer.from('Determining test suites to run...\n'));
            mockStdout.emit('data', Buffer.from('Found test suites in project\n'));
            mockStdout.emit('data', Buffer.from('Running tests now...\n'));
            mockProcess.emit('close', 0);

            await promise;

            // Assert
            expect(outputSpy).toHaveBeenCalled();
            expect(mockSpawn).toHaveBeenCalledWith('yarn', ['nx', 'test', 'project'], expect.objectContaining({
                cwd: '/test/cwd'
            }));
        });
    });

    describe('executeGitCommand', () => {
        it('should execute git command with git-specific progress steps', async () => {
            // Arrange
            const outputSpy = jest.fn();
            streamingRunner.on('output', outputSpy);

            // Act
            const promise = streamingRunner.executeGitCommand(['diff', '--name-only'], '/test/cwd');

            mockStdout.emit('data', Buffer.from('Analyzing repository state...\n'));
            mockProcess.emit('close', 0);

            await promise;

            // Assert
            expect(outputSpy).toHaveBeenCalled();
            expect(mockSpawn).toHaveBeenCalledWith('git', ['diff', '--name-only'], expect.objectContaining({
                cwd: '/test/cwd'
            }));
        });
    });

    describe('executeLintCommand', () => {
        it('should execute lint command with lint-specific progress steps', async () => {
            // Arrange
            const outputSpy = jest.fn();
            streamingRunner.on('output', outputSpy);

            // Act
            const promise = streamingRunner.executeLintCommand('yarn', ['nx', 'lint', 'project'], '/test/cwd');

            mockStdout.emit('data', Buffer.from('Loading configuration files...\n'));
            mockProcess.emit('close', 0);

            await promise;

            // Assert
            expect(outputSpy).toHaveBeenCalled();
            expect(mockSpawn).toHaveBeenCalledWith('yarn', ['nx', 'lint', 'project'], expect.objectContaining({
                cwd: '/test/cwd'
            }));
        });
    });

    describe('event handling', () => {
        it('should implement StreamingEventEmitter interface', () => {
            // Assert
            expect(streamingRunner.on).toBeDefined();
            expect(streamingRunner.emit).toBeDefined();
            expect(streamingRunner.removeAllListeners).toBeDefined();
        });

        it('should allow multiple listeners for same event', () => {
            // Arrange
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            streamingRunner.on('output', listener1);
            streamingRunner.on('output', listener2);

            // Act
            streamingRunner.emit('output', 'test data');

            // Assert
            expect(listener1).toHaveBeenCalledWith('test data');
            expect(listener2).toHaveBeenCalledWith('test data');
        });

        it('should clean up listeners', () => {
            // Arrange
            const listener = jest.fn();
            streamingRunner.on('output', listener);

            // Act
            streamingRunner.removeAllListeners();
            streamingRunner.emit('output', 'test data');

            // Assert
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('error scenarios', () => {
        it('should handle stdout stream errors gracefully', async () => {
            // Arrange
            const promise = streamingRunner.executeWithStreaming('test', []);

            // Act - simulate stream error (this shouldn't crash)
            mockStdout.emit('error', new Error('Stream error'));
            mockProcess.emit('close', 0);

            const result = await promise;

            // Assert
            expect(result.success).toBe(true); // Should still complete
        });

        it('should handle stderr stream errors gracefully', async () => {
            // Arrange
            const promise = streamingRunner.executeWithStreaming('test', []);

            // Act - simulate stream error
            mockStderr.emit('error', new Error('Stream error'));
            mockProcess.emit('close', 0);

            const result = await promise;

            // Assert
            expect(result.success).toBe(true); // Should still complete
        });

        it('should measure command duration correctly', async () => {
            // Arrange
            const promise = streamingRunner.executeWithStreaming('test', []);

            // Act - immediately complete the process
            mockProcess.emit('close', 0);
            const result = await promise;

            // Assert
            expect(result.duration).toBeGreaterThanOrEqual(0);
            expect(result.duration).toBeLessThan(1000); // Should be very fast
        });
    });
});
