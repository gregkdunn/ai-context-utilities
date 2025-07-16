import { StreamingCommandRunner } from '../../utils/streamingRunner';
import { CommandResult } from '../../types';
import { EventEmitter } from 'events';

// Mock child_process
const mockStdout = new EventEmitter();
const mockStderr = new EventEmitter();
const mockProcess = new EventEmitter();

Object.assign(mockProcess, {
    stdout: mockStdout,
    stderr: mockStderr,
    kill: jest.fn()
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
        streamingRunner = new StreamingCommandRunner();
        mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
        mockSpawn.mockReturnValue(mockProcess);
    });

    afterEach(() => {
        streamingRunner.removeAllListeners();
    });

    describe('executeWithStreaming', () => {
        it('should execute command and emit output events', async () => {
            // Arrange
            const outputSpy = jest.fn();
            const statusSpy = jest.fn();
            const completeSpy = jest.fn();

            streamingRunner.on('output', outputSpy);
            streamingRunner.on('status', statusSpy);
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
            expect(statusSpy).toHaveBeenCalledWith('Starting command execution...');
            expect(completeSpy).toHaveBeenCalledWith(result);
        });

        it('should track progress based on output patterns', async () => {
            // Arrange
            const progressSpy = jest.fn();
            const statusSpy = jest.fn();

            streamingRunner.on('progress', progressSpy);
            streamingRunner.on('status', statusSpy);

            const progressSteps = ['starting', 'processing', 'finishing'];

            // Act
            const promise = streamingRunner.executeWithStreaming('test', [], {
                progressSteps
            });

            // Simulate progress
            mockStdout.emit('data', Buffer.from('Starting the process...\n'));
            mockStdout.emit('data', Buffer.from('Processing files...\n'));
            mockStdout.emit('data', Buffer.from('Finishing up...\n'));
            mockProcess.emit('close', 0);

            await promise;

            // Assert
            expect(progressSpy).toHaveBeenCalledWith(33); // 1/3 * 100
            expect(progressSpy).toHaveBeenCalledWith(67); // 2/3 * 100
            expect(progressSpy).toHaveBeenCalledWith(100); // 3/3 * 100
            expect(statusSpy).toHaveBeenCalledWith('Step 1/3: starting');
            expect(statusSpy).toHaveBeenCalledWith('Step 2/3: processing');
            expect(statusSpy).toHaveBeenCalledWith('Step 3/3: finishing');
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
            expect(completeSpy).toHaveBeenCalledWith(result);
        });

        it('should pass correct spawn options', async () => {
            // Arrange
            const options = {
                cwd: '/test/dir',
                shell: false
            };

            // Act
            const promise = streamingRunner.executeWithStreaming('test', ['arg1', 'arg2'], options);
            mockProcess.emit('close', 0);
            await promise;

            // Assert
            expect(mockSpawn).toHaveBeenCalledWith('test', ['arg1', 'arg2'], {
                cwd: '/test/dir',
                shell: false,
                stdio: ['pipe', 'pipe', 'pipe']
            });
        });
    });

    describe('cancel', () => {
        it('should cancel running command', () => {
            // Arrange
            const statusSpy = jest.fn();
            streamingRunner.on('status', statusSpy);

            // Start a command
            streamingRunner.executeWithStreaming('test', []);
            expect(streamingRunner.isRunning()).toBe(true);

            // Act
            streamingRunner.cancel();

            // Assert
            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
            expect(statusSpy).toHaveBeenCalledWith('Cancelling command...');
            expect(streamingRunner.isRunning()).toBe(false);
        });

        it('should force kill after timeout', (done) => {
            // Arrange
            jest.useFakeTimers();
            
            // Start a command
            streamingRunner.executeWithStreaming('test', []);
            
            // Act
            streamingRunner.cancel();
            
            // Fast-forward time
            jest.advanceTimersByTime(6000);

            // Assert
            setTimeout(() => {
                expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
                expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
                jest.useRealTimers();
                done();
            }, 0);
        });

        it('should do nothing if no command running', () => {
            // Arrange
            expect(streamingRunner.isRunning()).toBe(false);

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
            expect(streamingRunner.isRunning()).toBe(true);
        });

        it('should return false when no command is running', () => {
            // Assert
            expect(streamingRunner.isRunning()).toBe(false);
        });

        it('should return false after command completes', async () => {
            // Arrange
            const promise = streamingRunner.executeWithStreaming('test', []);

            expect(streamingRunner.isRunning()).toBe(true);

            // Act
            mockProcess.emit('close', 0);
            await promise;

            // Assert
            expect(streamingRunner.isRunning()).toBe(false);
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
            const promise = streamingRunner.executeWithStreaming('test', []);
            mockStdout.emit('data', Buffer.from('some output\n'));
            mockStderr.emit('data', Buffer.from('some error\n'));

            expect(streamingRunner.getCurrentOutput()).toBe('some output\n');

            // Act
            streamingRunner.clearOutput();

            // Assert
            expect(streamingRunner.getCurrentOutput()).toBe('');

            mockProcess.emit('close', 0);
            await promise;
        });
    });

    describe('simulateProgress', () => {
        it('should emit progress events over time', (done) => {
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

            // Assert
            setTimeout(() => {
                expect(progressSpy).toHaveBeenCalledWith(9);
                expect(progressSpy).toHaveBeenCalledWith(54);
                expect(progressSpy).toHaveBeenCalledWith(90);
                jest.useRealTimers();
                done();
            }, 0);
        });

        it('should stop when command is no longer running', (done) => {
            // Arrange
            jest.useFakeTimers();
            const progressSpy = jest.fn();
            streamingRunner.on('progress', progressSpy);

            // Start and immediately complete command
            const promise = streamingRunner.executeWithStreaming('test', []);
            mockProcess.emit('close', 0);

            // Act
            streamingRunner.simulateProgress(10000);
            jest.advanceTimersByTime(5000);

            // Assert
            setTimeout(() => {
                expect(progressSpy).not.toHaveBeenCalled();
                jest.useRealTimers();
                done();
            }, 0);
        });
    });

    describe('executeTestCommand', () => {
        it('should execute test command with predefined progress steps', async () => {
            // Arrange
            const statusSpy = jest.fn();
            const progressSpy = jest.fn();
            streamingRunner.on('status', statusSpy);
            streamingRunner.on('progress', progressSpy);

            // Act
            const promise = streamingRunner.executeTestCommand('yarn', ['nx', 'test', 'project'], '/test/cwd');

            // Simulate test output with progress keywords
            mockStdout.emit('data', Buffer.from('Determining test suites to run...\n'));
            mockStdout.emit('data', Buffer.from('Found test suites in project\n'));
            mockStdout.emit('data', Buffer.from('Running tests now...\n'));
            mockProcess.emit('close', 0);

            await promise;

            // Assert
            expect(statusSpy).toHaveBeenCalledWith('Initializing test runner...');
            expect(progressSpy).toHaveBeenCalled();
            expect(mockSpawn).toHaveBeenCalledWith('yarn', ['nx', 'test', 'project'], expect.objectContaining({
                cwd: '/test/cwd'
            }));
        });
    });

    describe('executeGitCommand', () => {
        it('should execute git command with git-specific progress steps', async () => {
            // Arrange
            const statusSpy = jest.fn();
            streamingRunner.on('status', statusSpy);

            // Act
            const promise = streamingRunner.executeGitCommand(['diff', '--name-only'], '/test/cwd');

            mockStdout.emit('data', Buffer.from('Analyzing repository state...\n'));
            mockProcess.emit('close', 0);

            await promise;

            // Assert
            expect(statusSpy).toHaveBeenCalledWith('Analyzing git repository...');
            expect(mockSpawn).toHaveBeenCalledWith('git', ['diff', '--name-only'], expect.objectContaining({
                cwd: '/test/cwd'
            }));
        });
    });

    describe('executeLintCommand', () => {
        it('should execute lint command with lint-specific progress steps', async () => {
            // Arrange
            const statusSpy = jest.fn();
            streamingRunner.on('status', statusSpy);

            // Act
            const promise = streamingRunner.executeLintCommand('yarn', ['nx', 'lint', 'project'], '/test/cwd');

            mockStdout.emit('data', Buffer.from('Loading configuration files...\n'));
            mockProcess.emit('close', 0);

            await promise;

            // Assert
            expect(statusSpy).toHaveBeenCalledWith('Starting code analysis...');
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
            const startTime = Date.now();
            const promise = streamingRunner.executeWithStreaming('test', []);

            // Simulate some delay
            setTimeout(() => {
                mockProcess.emit('close', 0);
            }, 100);

            // Act
            const result = await promise;

            // Assert
            expect(result.duration).toBeGreaterThan(90); // At least 90ms
            expect(result.duration).toBeLessThan(200); // But not too much more
        });
    });
});