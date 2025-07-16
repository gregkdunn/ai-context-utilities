import { CommandCoordinator } from '../commandCoordinator';
import { StatusTracker } from '../statusTracker';
import { StreamingCommandRunner } from '../streamingRunner';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('../statusTracker');
jest.mock('../streamingRunner');
jest.mock('vscode');

describe('CommandCoordinator', () => {
    let coordinator: CommandCoordinator;
    let mockStatusTracker: jest.Mocked<StatusTracker>;
    let mockContext: vscode.ExtensionContext;
    let mockStreamingRunner: jest.Mocked<StreamingCommandRunner>;

    beforeEach(() => {
        mockContext = {
            subscriptions: [],
            globalState: {
                get: jest.fn(),
                update: jest.fn()
            }
        } as any;

        mockStatusTracker = new StatusTracker(mockContext) as jest.Mocked<StatusTracker>;
        mockStatusTracker.startCommand = jest.fn().mockReturnValue('test-command-id');
        mockStatusTracker.completeCommand = jest.fn();
        mockStatusTracker.updateStatus = jest.fn();
        mockStatusTracker.appendOutput = jest.fn();
        mockStatusTracker.appendError = jest.fn();
        mockStatusTracker.updateProgress = jest.fn();
        mockStatusTracker.cancelCommand = jest.fn();
        mockStatusTracker.getAllStatuses = jest.fn().mockReturnValue([]);
        mockStatusTracker.getRunningCommands = jest.fn().mockReturnValue([]);

        coordinator = new CommandCoordinator(mockStatusTracker, mockContext);

        // Mock StreamingCommandRunner
        mockStreamingRunner = {
            executeWithStreaming: jest.fn(),
            executeTestCommand: jest.fn(),
            executeGitCommand: jest.fn(),
            executeLintCommand: jest.fn(),
            isRunning: jest.fn().mockReturnValue(false),
            cancel: jest.fn(),
            getCurrentOutput: jest.fn().mockReturnValue(''),
            clearOutput: jest.fn(),
            on: jest.fn(),
            removeAllListeners: jest.fn(),
            emit: jest.fn()
        } as any;

        // Mock the StreamingCommandRunner constructor
        (StreamingCommandRunner as jest.MockedClass<typeof StreamingCommandRunner>).mockImplementation(() => mockStreamingRunner);
    });

    afterEach(() => {
        coordinator.dispose();
        jest.clearAllMocks();
    });

    describe('Command Execution', () => {
        test('should execute aiDebug command', async () => {
            const mockResult = {
                success: true,
                exitCode: 0,
                output: 'Test output',
                duration: 5000,
                outputFiles: ['output.txt']
            };

            mockStreamingRunner.executeWithStreaming.mockResolvedValue(mockResult);

            const result = await coordinator.executeCommand('aiDebug', ['test-project'], {
                project: 'test-project',
                cwd: '/test/path'
            });

            expect(mockStatusTracker.startCommand).toHaveBeenCalledWith('aiDebug', 'test-project', undefined);
            expect(mockStreamingRunner.executeWithStreaming).toHaveBeenCalled();
            expect(mockStatusTracker.completeCommand).toHaveBeenCalledWith('test-command-id', mockResult);
            expect(result).toEqual(mockResult);
        });

        test('should execute nxTest command with streaming', async () => {
            const mockResult = {
                success: true,
                exitCode: 0,
                output: 'Tests passed',
                duration: 3000,
                outputFiles: []
            };

            mockStreamingRunner.executeTestCommand.mockResolvedValue(mockResult);

            const result = await coordinator.executeCommand('nxTest', ['test-project'], {
                project: 'test-project',
                cwd: '/test/path'
            });

            expect(mockStreamingRunner.executeTestCommand).toHaveBeenCalledWith(
                'npx',
                ['nx', 'test', 'test-project'],
                '/test/path'
            );
            expect(result).toEqual(mockResult);
        });

        test('should execute gitDiff command', async () => {
            const mockResult = {
                success: true,
                exitCode: 0,
                output: 'Git diff output',
                duration: 2000,
                outputFiles: ['diff.txt']
            };

            mockStreamingRunner.executeGitCommand.mockResolvedValue(mockResult);

            const result = await coordinator.executeCommand('gitDiff', ['--staged'], {
                cwd: '/test/path'
            });

            expect(mockStreamingRunner.executeGitCommand).toHaveBeenCalledWith(
                ['diff', '--staged'],
                '/test/path'
            );
            expect(result).toEqual(mockResult);
        });

        test('should execute prepareToPush command', async () => {
            const mockResult = {
                success: true,
                exitCode: 0,
                output: 'Lint passed',
                duration: 4000,
                outputFiles: []
            };

            mockStreamingRunner.executeLintCommand.mockResolvedValue(mockResult);

            const result = await coordinator.executeCommand('prepareToPush', ['test-project'], {
                project: 'test-project',
                cwd: '/test/path'
            });

            expect(mockStreamingRunner.executeLintCommand).toHaveBeenCalledWith(
                'npx',
                ['nx', 'lint', 'test-project'],
                '/test/path'
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('Streaming Event Handling', () => {
        test('should handle streaming output events', async () => {
            const mockResult = { success: true, exitCode: 0, output: 'test', duration: 1000, outputFiles: [] };
            mockStreamingRunner.executeWithStreaming.mockResolvedValue(mockResult);

            // Mock the event handler setup
            const eventHandlers: Record<string, Function> = {};
            mockStreamingRunner.on.mockImplementation((event: string, handler: Function) => {
                eventHandlers[event] = handler;
            });

            // Start command execution (don't await yet)
            const promise = coordinator.executeCommand('aiDebug', ['test-project'], {
                project: 'test-project'
            });

            // Simulate streaming events
            eventHandlers['output']('Test output line\\n');
            eventHandlers['error']('Test error line\\n');
            eventHandlers['progress'](50);
            eventHandlers['status']('Processing...');

            await promise;

            expect(mockStatusTracker.appendOutput).toHaveBeenCalledWith('test-command-id', 'Test output line\\n');
            expect(mockStatusTracker.appendError).toHaveBeenCalledWith('test-command-id', 'Test error line\\n');
            expect(mockStatusTracker.updateProgress).toHaveBeenCalledWith('test-command-id', 50);
            expect(mockStatusTracker.updateStatus).toHaveBeenCalledWith('test-command-id', 'running', 'Processing...');
        });

        test('should emit streaming messages', async () => {
            const mockResult = { success: true, exitCode: 0, output: 'test', duration: 1000, outputFiles: [] };
            mockStreamingRunner.executeWithStreaming.mockResolvedValue(mockResult);

            const streamingMessages: any[] = [];
            coordinator.on('streaming_message', (message) => {
                streamingMessages.push(message);
            });

            const eventHandlers: Record<string, Function> = {};
            mockStreamingRunner.on.mockImplementation((event: string, handler: Function) => {
                eventHandlers[event] = handler;
            });

            const promise = coordinator.executeCommand('aiDebug', ['test-project'], {
                project: 'test-project'
            });

            // Simulate events
            eventHandlers['output']('Test output');
            eventHandlers['progress'](25);

            await promise;

            expect(streamingMessages).toHaveLength(2);
            expect(streamingMessages[0].type).toBe('output');
            expect(streamingMessages[0].data.text).toBe('Test output');
            expect(streamingMessages[1].type).toBe('progress');
            expect(streamingMessages[1].data.progress).toBe(25);
        });
    });

    describe('Concurrency Control', () => {
        test('should respect maximum concurrent commands', async () => {
            coordinator.setMaxConcurrentCommands(2);

            const mockResult = { success: true, exitCode: 0, output: 'test', duration: 1000, outputFiles: [] };
            
            // Make the first two commands hang
            let resolveFirst: Function;
            let resolveSecond: Function;
            
            mockStreamingRunner.executeWithStreaming
                .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = () => resolve(mockResult); }))
                .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = () => resolve(mockResult); }))
                .mockResolvedValue(mockResult);

            // Start first two commands
            const promise1 = coordinator.executeCommand('aiDebug', ['project1'], { project: 'project1' });
            const promise2 = coordinator.executeCommand('nxTest', ['project2'], { project: 'project2' });

            // Third command should be queued
            const promise3 = coordinator.executeCommand('gitDiff', [], {});

            const status = coordinator.getExecutionStatus();
            expect(status.active).toBe(2);
            expect(status.queued).toBe(1);

            // Complete first command
            resolveFirst();
            await promise1;

            // Third command should now be processing
            expect(coordinator.getExecutionStatus().active).toBe(2);

            // Complete remaining commands
            resolveSecond();
            await Promise.all([promise2, promise3]);
        });

        test('should handle high priority commands', async () => {
            coordinator.setMaxConcurrentCommands(1);

            const mockResult = { success: true, exitCode: 0, output: 'test', duration: 1000, outputFiles: [] };
            
            // Make first command hang
            let resolveFirst: Function;
            mockStreamingRunner.executeWithStreaming
                .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = () => resolve(mockResult); }))
                .mockResolvedValue(mockResult);

            mockStreamingRunner.isRunning.mockReturnValue(true);

            // Start first command
            const promise1 = coordinator.executeCommand('aiDebug', ['project1'], { project: 'project1' });

            // High priority command should cancel the first one
            const promise2 = coordinator.executeCommand('nxTest', ['project2'], { 
                project: 'project2',
                priority: 'high'
            });

            expect(mockStreamingRunner.cancel).toHaveBeenCalled();
            expect(mockStatusTracker.cancelCommand).toHaveBeenCalled();

            resolveFirst();
            await Promise.all([promise1, promise2]);
        });
    });

    describe('Command Cancellation', () => {
        test('should cancel running command', () => {
            const commandId = 'test-command-id';
            mockStreamingRunner.isRunning.mockReturnValue(true);
            
            // Simulate active command
            (coordinator as any).activeCommands.set(commandId, mockStreamingRunner);

            const result = coordinator.cancelCommand(commandId);

            expect(result).toBe(true);
            expect(mockStreamingRunner.cancel).toHaveBeenCalled();
            expect(mockStatusTracker.cancelCommand).toHaveBeenCalledWith(commandId);
        });

        test('should not cancel non-running command', () => {
            const commandId = 'test-command-id';
            mockStreamingRunner.isRunning.mockReturnValue(false);
            
            const result = coordinator.cancelCommand(commandId);

            expect(result).toBe(false);
            expect(mockStreamingRunner.cancel).not.toHaveBeenCalled();
        });

        test('should cancel all running commands', () => {
            const commands = ['cmd1', 'cmd2', 'cmd3'];
            commands.forEach(cmdId => {
                const runner = { ...mockStreamingRunner, isRunning: jest.fn().mockReturnValue(true) };
                (coordinator as any).activeCommands.set(cmdId, runner);
            });

            coordinator.cancelAllCommands();

            commands.forEach(cmdId => {
                expect(mockStatusTracker.cancelCommand).toHaveBeenCalledWith(cmdId);
            });
        });
    });

    describe('Output Management', () => {
        test('should get command output', () => {
            const commandId = 'test-command-id';
            const expectedOutput = 'Command output here';
            
            mockStreamingRunner.getCurrentOutput.mockReturnValue(expectedOutput);
            (coordinator as any).activeCommands.set(commandId, mockStreamingRunner);

            const output = coordinator.getCommandOutput(commandId);

            expect(output).toBe(expectedOutput);
            expect(mockStreamingRunner.getCurrentOutput).toHaveBeenCalled();
        });

        test('should clear command output', () => {
            const commandId = 'test-command-id';
            (coordinator as any).activeCommands.set(commandId, mockStreamingRunner);

            coordinator.clearCommandOutput(commandId);

            expect(mockStreamingRunner.clearOutput).toHaveBeenCalled();
        });

        test('should return empty string for non-existent command output', () => {
            const output = coordinator.getCommandOutput('non-existent');
            expect(output).toBe('');
        });
    });

    describe('Metrics and Reporting', () => {
        test('should get execution metrics', () => {
            const mockStats = {
                total: 10,
                successful: 8,
                failed: 2,
                averageDuration: 5000,
                lastRun: new Date()
            };
            
            mockStatusTracker.getCommandStats.mockReturnValue(mockStats);

            const metrics = coordinator.getExecutionMetrics();

            expect(metrics.totalCommands).toBe(10);
            expect(metrics.successRate).toBe(80);
            expect(metrics.averageExecutionTime).toBe(5000);
        });

        test('should create health report', () => {
            const mockStatuses = [
                {
                    id: 'cmd1',
                    command: 'aiDebug' as const,
                    status: 'running' as const,
                    progress: 75,
                    message: 'Processing...',
                    startTime: new Date(),
                    project: 'test-project',
                    output: '',
                    outputFiles: [],
                    metadata: {}
                }
            ];

            mockStatusTracker.getAllStatuses.mockReturnValue(mockStatuses);
            mockStatusTracker.getCommandStats.mockReturnValue({
                total: 5,
                successful: 4,
                failed: 1,
                averageDuration: 3000,
                lastRun: new Date()
            });

            const report = coordinator.createHealthReport();

            expect(report).toContain('COMMAND EXECUTION HEALTH REPORT');
            expect(report).toContain('ACTIVE COMMANDS');
            expect(report).toContain('PERFORMANCE METRICS');
            expect(report).toContain('RECOMMENDATIONS');
            expect(report).toContain('Processing...');
            expect(report).toContain('75%');
        });
    });

    describe('Queue Management', () => {
        test('should emit queue update events', async () => {
            coordinator.setMaxConcurrentCommands(1);

            const queueUpdates: any[] = [];
            coordinator.on('queue_update', (data) => {
                queueUpdates.push(data);
            });

            const mockResult = { success: true, exitCode: 0, output: 'test', duration: 1000, outputFiles: [] };
            
            let resolveFirst: Function;
            mockStreamingRunner.executeWithStreaming
                .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = () => resolve(mockResult); }))
                .mockResolvedValue(mockResult);

            // Start first command (will run immediately)
            const promise1 = coordinator.executeCommand('aiDebug', ['project1'], { project: 'project1' });

            // Start second command (will be queued)
            const promise2 = coordinator.executeCommand('nxTest', ['project2'], { project: 'project2' });

            // Should have emitted a queue update
            expect(queueUpdates.length).toBeGreaterThan(0);
            expect(queueUpdates[0]).toHaveProperty('queued');

            resolveFirst();
            await Promise.all([promise1, promise2]);
        });
    });

    describe('Error Handling', () => {
        test('should handle command execution errors', async () => {
            const error = new Error('Command failed');
            mockStreamingRunner.executeWithStreaming.mockRejectedValue(error);

            await expect(coordinator.executeCommand('aiDebug', ['test-project'], {
                project: 'test-project'
            })).rejects.toThrow('Command failed');

            expect(mockStatusTracker.updateStatus).toHaveBeenCalledWith(
                'test-command-id',
                'error',
                'Command failed'
            );
        });

        test('should handle cleanup after errors', async () => {
            const error = new Error('Test error');
            mockStreamingRunner.executeWithStreaming.mockRejectedValue(error);

            try {
                await coordinator.executeCommand('aiDebug', ['test-project'], {
                    project: 'test-project'
                });
            } catch (e) {
                // Expected error
            }

            // Should clean up the runner
            expect(mockStreamingRunner.removeAllListeners).toHaveBeenCalled();
        });
    });

    describe('Configuration', () => {
        test('should set maximum concurrent commands within bounds', () => {
            coordinator.setMaxConcurrentCommands(0); // Below minimum
            expect(coordinator.getExecutionStatus().maxConcurrent).toBe(1);

            coordinator.setMaxConcurrentCommands(15); // Above maximum
            expect(coordinator.getExecutionStatus().maxConcurrent).toBe(10);

            coordinator.setMaxConcurrentCommands(5); // Valid value
            expect(coordinator.getExecutionStatus().maxConcurrent).toBe(5);
        });
    });

    describe('Disposal', () => {
        test('should dispose properly', () => {
            // Add some mock active commands
            (coordinator as any).activeCommands.set('cmd1', mockStreamingRunner);
            (coordinator as any).activeCommands.set('cmd2', mockStreamingRunner);

            coordinator.dispose();

            expect(mockStreamingRunner.cancel).toHaveBeenCalledTimes(2);
            expect((coordinator as any).activeCommands.size).toBe(0);
            expect((coordinator as any).commandQueue.length).toBe(0);
        });
    });
});
