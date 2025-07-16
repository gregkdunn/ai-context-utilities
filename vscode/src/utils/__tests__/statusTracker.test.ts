import { StatusTracker, CommandStatus, StatusHistory } from '../statusTracker';
import * as vscode from 'vscode';

// Mock VSCode API
jest.mock('vscode', () => ({
    window: {
        createStatusBarItem: jest.fn(() => ({
            text: '',
            tooltip: '',
            command: '',
            show: jest.fn(),
            dispose: jest.fn()
        })),
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn()
    },
    StatusBarAlignment: {
        Left: 1
    },
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn((key: string, defaultValue?: any) => {
                if (key === 'showNotifications') {return true;}
                return defaultValue;
            })
        }))
    }
}));

describe('StatusTracker', () => {
    let statusTracker: StatusTracker;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        mockContext = {
            subscriptions: [],
            globalState: {
                get: jest.fn().mockReturnValue([]),
                update: jest.fn()
            }
        } as any;

        statusTracker = new StatusTracker(mockContext);
    });

    afterEach(() => {
        statusTracker.dispose();
    });

    describe('Command Lifecycle', () => {
        test('should start tracking a command', () => {
            const commandId = statusTracker.startCommand('aiDebug', 'test-project', { quick: true });
            
            expect(commandId).toBeDefined();
            expect(commandId).toContain('aiDebug');
            expect(commandId).toContain('test-project');
            
            const status = statusTracker.getStatus(commandId);
            expect(status).toBeDefined();
            expect(status!.command).toBe('aiDebug');
            expect(status!.project).toBe('test-project');
            expect(status!.status).toBe('running');
            expect(status!.progress).toBe(0);
        });

        test('should update command progress', () => {
            const commandId = statusTracker.startCommand('nxTest', 'test-project');
            
            statusTracker.updateProgress(commandId, 50, 'Running tests...');
            
            const status = statusTracker.getStatus(commandId);
            expect(status!.progress).toBe(50);
            expect(status!.message).toBe('Running tests...');
        });

        test('should clamp progress values', () => {
            const commandId = statusTracker.startCommand('gitDiff');
            
            statusTracker.updateProgress(commandId, -10);
            expect(statusTracker.getStatus(commandId)!.progress).toBe(0);
            
            statusTracker.updateProgress(commandId, 150);
            expect(statusTracker.getStatus(commandId)!.progress).toBe(100);
        });

        test('should update command status', () => {
            const commandId = statusTracker.startCommand('prepareToPush', 'test-project');
            
            statusTracker.updateStatus(commandId, 'success', 'Completed successfully');
            
            const status = statusTracker.getStatus(commandId);
            expect(status!.status).toBe('success');
            expect(status!.message).toBe('Completed successfully');
            expect(status!.endTime).toBeDefined();
            expect(status!.duration).toBeDefined();
        });

        test('should complete a command with result', () => {
            const commandId = statusTracker.startCommand('aiDebug', 'test-project');
            
            const result = {
                success: true,
                exitCode: 0,
                output: 'Test output',
                duration: 5000,
                outputFiles: ['file1.txt', 'file2.txt']
            };
            
            statusTracker.completeCommand(commandId, result);
            
            const status = statusTracker.getStatus(commandId);
            expect(status!.status).toBe('success');
            expect(status!.progress).toBe(100);
            expect(status!.output).toBe('Test output');
            expect(status!.outputFiles).toEqual(['file1.txt', 'file2.txt']);
            expect(status!.duration).toBe(5000);
        });

        test('should cancel a running command', () => {
            const commandId = statusTracker.startCommand('nxTest', 'test-project');
            
            statusTracker.cancelCommand(commandId);
            
            const status = statusTracker.getStatus(commandId);
            expect(status!.status).toBe('cancelled');
            expect(status!.metadata.cancelled).toBe(true);
            expect(status!.message).toBe('Cancelled by user');
        });
    });

    describe('Output Management', () => {
        test('should append output to command', () => {
            const commandId = statusTracker.startCommand('aiDebug', 'test-project');
            
            statusTracker.appendOutput(commandId, 'Line 1\n');
            statusTracker.appendOutput(commandId, 'Line 2\n');
            
            const status = statusTracker.getStatus(commandId);
            expect(status!.output).toBe('Line 1\nLine 2\n');
        });

        test('should append error to command', () => {
            const commandId = statusTracker.startCommand('nxTest', 'test-project');
            
            statusTracker.appendError(commandId, 'Error 1\n');
            statusTracker.appendError(commandId, 'Error 2\n');
            
            const status = statusTracker.getStatus(commandId);
            expect(status!.error).toBe('Error 1\nError 2\n');
        });
    });

    describe('Status Queries', () => {
        test('should get all statuses', () => {
            const cmd1 = statusTracker.startCommand('aiDebug', 'project1');
            const cmd2 = statusTracker.startCommand('nxTest', 'project2');
            
            const statuses = statusTracker.getAllStatuses();
            expect(statuses).toHaveLength(2);
            expect(statuses.map(s => s.id)).toContain(cmd1);
            expect(statuses.map(s => s.id)).toContain(cmd2);
        });

        test('should get running commands only', () => {
            const cmd1 = statusTracker.startCommand('aiDebug', 'project1');
            const cmd2 = statusTracker.startCommand('nxTest', 'project2');
            
            statusTracker.updateStatus(cmd1, 'success');
            
            const running = statusTracker.getRunningCommands();
            expect(running).toHaveLength(1);
            expect(running[0].id).toBe(cmd2);
        });
    });

    describe('History Management', () => {
        test('should add completed commands to history', () => {
            const commandId = statusTracker.startCommand('aiDebug', 'test-project');
            
            const result = {
                success: true,
                exitCode: 0,
                output: 'Success',
                duration: 3000,
                outputFiles: ['output.txt']
            };
            
            statusTracker.completeCommand(commandId, result);
            
            const history = statusTracker.getHistory();
            expect(history).toHaveLength(1);
            expect(history[0].command).toBe('aiDebug');
            expect(history[0].success).toBe(true);
            expect(history[0].duration).toBe(3000);
            expect(history[0].filesGenerated).toBe(1);
        });

        test('should limit history size', () => {
            // Create more commands than the max history size (50)
            for (let i = 0; i < 60; i++) {
                const commandId = statusTracker.startCommand('aiDebug', `project-${i}`);
                const result = {
                    success: true,
                    exitCode: 0,
                    output: `Output ${i}`,
                    duration: 1000,
                    outputFiles: []
                };
                statusTracker.completeCommand(commandId, result);
            }
            
            const history = statusTracker.getHistory();
            expect(history.length).toBeLessThanOrEqual(50);
        });

        test('should clear history', () => {
            const commandId = statusTracker.startCommand('aiDebug', 'test-project');
            statusTracker.completeCommand(commandId, {
                success: true,
                exitCode: 0,
                output: 'test',
                duration: 1000,
                outputFiles: []
            });
            
            expect(statusTracker.getHistory()).toHaveLength(1);
            
            statusTracker.clearHistory();
            expect(statusTracker.getHistory()).toHaveLength(0);
        });
    });

    describe('Statistics', () => {
        beforeEach(() => {
            // Add some test data
            const commands = [
                { command: 'aiDebug', success: true, duration: 1000 },
                { command: 'aiDebug', success: false, duration: 2000 },
                { command: 'nxTest', success: true, duration: 3000 },
                { command: 'nxTest', success: true, duration: 4000 }
            ];
            
            commands.forEach((cmd, i) => {
                const commandId = statusTracker.startCommand(cmd.command as any, `project-${i}`);
                statusTracker.completeCommand(commandId, {
                    success: cmd.success,
                    exitCode: cmd.success ? 0 : 1,
                    output: 'test',
                    duration: cmd.duration,
                    outputFiles: []
                });
            });
        });

        test('should calculate overall statistics', () => {
            const stats = statusTracker.getCommandStats();
            
            expect(stats.total).toBe(4);
            expect(stats.successful).toBe(3);
            expect(stats.failed).toBe(1);
            expect(stats.averageDuration).toBe(2500); // (1000+2000+3000+4000)/4
            expect(stats.lastRun).toBeDefined();
        });

        test('should calculate command-specific statistics', () => {
            const aiDebugStats = statusTracker.getCommandStats('aiDebug');
            
            expect(aiDebugStats.total).toBe(2);
            expect(aiDebugStats.successful).toBe(1);
            expect(aiDebugStats.failed).toBe(1);
            expect(aiDebugStats.averageDuration).toBe(1500); // (1000+2000)/2
        });
    });

    describe('Status Report', () => {
        test('should generate comprehensive status report', () => {
            // Start a running command
            const runningId = statusTracker.startCommand('aiDebug', 'test-project');
            statusTracker.updateProgress(runningId, 50, 'Processing...');
            
            // Complete some commands
            const completedId = statusTracker.startCommand('nxTest', 'test-project');
            statusTracker.completeCommand(completedId, {
                success: true,
                exitCode: 0,
                output: 'Tests passed',
                duration: 5000,
                outputFiles: ['test-output.txt']
            });
            
            const report = statusTracker.generateStatusReport();
            
            expect(report).toContain('STATUS REPORT');
            expect(report).toContain('CURRENTLY RUNNING');
            expect(report).toContain('STATISTICS');
            expect(report).toContain('COMMAND BREAKDOWN');
            expect(report).toContain('Processing...');
            expect(report).toContain('50%');
        });
    });

    describe('Action Button Conversion', () => {
        test('should convert to action button format', () => {
            // Start and complete some commands
            const aiDebugId = statusTracker.startCommand('aiDebug', 'project1');
            statusTracker.completeCommand(aiDebugId, {
                success: true,
                exitCode: 0,
                output: 'Success',
                duration: 2000,
                outputFiles: []
            });
            
            const nxTestId = statusTracker.startCommand('nxTest', 'project2');
            statusTracker.updateProgress(nxTestId, 75);
            
            const buttons = statusTracker.toActionButtons();
            
            expect(buttons).toHaveProperty('aiDebug');
            expect(buttons).toHaveProperty('nxTest');
            expect(buttons).toHaveProperty('gitDiff');
            expect(buttons).toHaveProperty('prepareToPush');
            
            expect(buttons.aiDebug.status).toBe('success');
            expect(buttons.aiDebug.enabled).toBe(true);
            expect(buttons.aiDebug.lastRun).toBeDefined();
            
            expect(buttons.nxTest.status).toBe('running');
            expect(buttons.nxTest.enabled).toBe(false);
            expect(buttons.nxTest.progress).toBe(75);
        });
    });

    describe('Event Emission', () => {
        test('should emit status change events', (done) => {
            const commandId = statusTracker.startCommand('aiDebug', 'test-project');
            
            statusTracker.on('status_change', (event) => {
                expect(event.type).toBe('progress_update');
                expect(event.commandId).toBe(commandId);
                expect(event.data.progress).toBe(25);
                done();
            });
            
            statusTracker.updateProgress(commandId, 25, 'Testing...');
        });

        test('should emit history updated events', (done) => {
            const commandId = statusTracker.startCommand('nxTest', 'test-project');
            
            statusTracker.on('history_updated', (entry) => {
                expect(entry.command).toBe('nxTest');
                expect(entry.success).toBe(true);
                done();
            });
            
            statusTracker.completeCommand(commandId, {
                success: true,
                exitCode: 0,
                output: 'Success',
                duration: 1000,
                outputFiles: []
            });
        });
    });

    describe('Edge Cases', () => {
        test('should handle operations on non-existent commands gracefully', () => {
            expect(() => {
                statusTracker.updateProgress('non-existent', 50);
                statusTracker.updateStatus('non-existent', 'success');
                statusTracker.appendOutput('non-existent', 'output');
                statusTracker.appendError('non-existent', 'error');
                statusTracker.cancelCommand('non-existent');
            }).not.toThrow();
        });

        test('should generate unique command IDs', () => {
            const id1 = statusTracker.startCommand('aiDebug', 'project1');
            const id2 = statusTracker.startCommand('aiDebug', 'project1');
            const id3 = statusTracker.startCommand('aiDebug', 'project2');
            
            expect(id1).not.toBe(id2);
            expect(id1).not.toBe(id3);
            expect(id2).not.toBe(id3);
        });

        test('should handle commands without projects', () => {
            const commandId = statusTracker.startCommand('gitDiff');
            const status = statusTracker.getStatus(commandId);
            
            expect(status!.project).toBeUndefined();
            expect(status!.command).toBe('gitDiff');
        });
    });
});
