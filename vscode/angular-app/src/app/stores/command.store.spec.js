"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@angular/core/testing");
const command_store_1 = require("./command.store");
describe('CommandStore', () => {
    let store;
    beforeEach(() => {
        testing_1.TestBed.configureTestingModule({});
        store = testing_1.TestBed.inject(command_store_1.CommandStore);
    });
    describe('initialization', () => {
        it('should initialize with empty state', () => {
            expect(store.activeCommandCount()).toBe(0);
            expect(store.isExecuting()).toBe(false);
            expect(store.queueLength()).toBe(0);
            expect(store.successRate()).toBe(0);
            expect(store.commandHistory()).toEqual([]);
            expect(store.currentStatus()).toBe('idle');
        });
    });
    describe('command queueing', () => {
        it('should queue commands with priority ordering', () => {
            const highPriorityCmd = {
                id: 'high-1',
                action: 'aiDebug',
                project: 'test-project',
                priority: 'high',
                options: {},
                timestamp: new Date()
            };
            const normalPriorityCmd = {
                id: 'normal-1',
                action: 'nxTest',
                project: 'test-project',
                priority: 'normal',
                options: {},
                timestamp: new Date()
            };
            const lowPriorityCmd = {
                id: 'low-1',
                action: 'gitDiff',
                project: 'test-project',
                priority: 'low',
                options: {},
                timestamp: new Date()
            };
            // Add in reverse priority order
            store.queueCommand(lowPriorityCmd);
            store.queueCommand(normalPriorityCmd);
            store.queueCommand(highPriorityCmd);
            const queue = store.executionQueue();
            expect(queue).toHaveLength(3);
            expect(queue[0].id).toBe('high-1');
            expect(queue[1].id).toBe('normal-1');
            expect(queue[2].id).toBe('low-1');
        });
        it('should update queue length correctly', () => {
            const cmd = {
                id: 'test-1',
                action: 'aiDebug',
                project: 'test-project',
                priority: 'normal',
                options: {},
                timestamp: new Date()
            };
            expect(store.queueLength()).toBe(0);
            store.queueCommand(cmd);
            expect(store.queueLength()).toBe(1);
        });
        it('should organize queue by priority', () => {
            const highCmd = {
                id: 'high-1',
                action: 'aiDebug',
                project: 'test-project',
                priority: 'high',
                options: {},
                timestamp: new Date()
            };
            const normalCmd = {
                id: 'normal-1',
                action: 'nxTest',
                project: 'test-project',
                priority: 'normal',
                options: {},
                timestamp: new Date()
            };
            store.queueCommand(highCmd);
            store.queueCommand(normalCmd);
            const queueByPriority = store.queueByPriority();
            expect(queueByPriority.high).toHaveLength(1);
            expect(queueByPriority.normal).toHaveLength(1);
            expect(queueByPriority.low).toHaveLength(0);
        });
    });
    describe('command execution', () => {
        it('should start command execution', () => {
            const execution = {
                id: 'test-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'running',
                startTime: new Date(),
                progress: 0,
                output: [],
                priority: 'normal'
            };
            store.startCommand(execution);
            expect(store.activeCommandCount()).toBe(1);
            expect(store.isExecuting()).toBe(true);
            expect(store.currentStatus()).toBe('running');
            expect(store.activeCommands()['test-1']).toEqual(execution);
        });
        it('should update command progress', () => {
            const execution = {
                id: 'test-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'running',
                startTime: new Date(),
                progress: 0,
                output: [],
                priority: 'normal'
            };
            store.startCommand(execution);
            store.updateProgress('test-1', 50, 'Processing...');
            const activeCommands = store.activeCommands();
            expect(activeCommands['test-1'].progress).toBe(50);
            expect(activeCommands['test-1'].output).toContain('Processing...');
        });
        it('should clamp progress values', () => {
            const execution = {
                id: 'test-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'running',
                startTime: new Date(),
                progress: 0,
                output: [],
                priority: 'normal'
            };
            store.startCommand(execution);
            // Test values outside 0-100 range
            store.updateProgress('test-1', -10);
            expect(store.activeCommands()['test-1'].progress).toBe(0);
            store.updateProgress('test-1', 150);
            expect(store.activeCommands()['test-1'].progress).toBe(100);
        });
        it('should complete command execution', () => {
            const execution = {
                id: 'test-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'running',
                startTime: new Date(),
                progress: 0,
                output: [],
                priority: 'normal'
            };
            const result = {
                ...execution,
                status: 'success',
                endTime: new Date(),
                duration: 5000,
                success: true
            };
            store.startCommand(execution);
            store.completeCommand('test-1', result);
            expect(store.activeCommandCount()).toBe(0);
            expect(store.isExecuting()).toBe(false);
            expect(store.commandHistory()).toHaveLength(1);
            expect(store.commandHistory()[0]).toEqual(result);
        });
        it('should cancel command execution', () => {
            const execution = {
                id: 'test-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'running',
                startTime: new Date(),
                progress: 50,
                output: ['Starting...'],
                priority: 'normal'
            };
            store.startCommand(execution);
            store.cancelCommand('test-1');
            expect(store.activeCommandCount()).toBe(0);
            expect(store.commandHistory()).toHaveLength(1);
            const cancelledCommand = store.commandHistory()[0];
            expect(cancelledCommand.status).toBe('cancelled');
            expect(cancelledCommand.success).toBe(false);
            expect(cancelledCommand.endTime).toBeDefined();
        });
        it('should handle non-existent command updates gracefully', () => {
            store.updateProgress('non-existent', 50);
            expect(store.activeCommandCount()).toBe(0);
        });
    });
    describe('command analytics', () => {
        it('should calculate success rate correctly', () => {
            const successResult = {
                id: 'success-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 5000,
                success: true,
                output: []
            };
            const errorResult = {
                id: 'error-1',
                action: 'nxTest',
                project: 'test-project',
                status: 'error',
                startTime: new Date(),
                endTime: new Date(),
                duration: 3000,
                success: false,
                error: 'Test failed',
                output: []
            };
            store.completeCommand('success-1', successResult);
            store.completeCommand('error-1', errorResult);
            expect(store.successRate()).toBe(50); // 1 success out of 2 total
        });
        it('should calculate average execution time', () => {
            const result1 = {
                id: 'cmd-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 4000,
                success: true,
                output: []
            };
            const result2 = {
                id: 'cmd-2',
                action: 'nxTest',
                project: 'test-project',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 6000,
                success: true,
                output: []
            };
            store.completeCommand('cmd-1', result1);
            store.completeCommand('cmd-2', result2);
            expect(store.averageExecutionTime()).toBe(5000); // (4000 + 6000) / 2
        });
        it('should organize commands by project', () => {
            const project1Result = {
                id: 'cmd-1',
                action: 'aiDebug',
                project: 'project-1',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 4000,
                success: true,
                output: []
            };
            const project2Result = {
                id: 'cmd-2',
                action: 'nxTest',
                project: 'project-2',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 6000,
                success: true,
                output: []
            };
            store.completeCommand('cmd-1', project1Result);
            store.completeCommand('cmd-2', project2Result);
            const commandsByProject = store.commandsByProject();
            expect(commandsByProject['project-1']).toHaveLength(1);
            expect(commandsByProject['project-2']).toHaveLength(1);
            expect(commandsByProject['project-1'][0]).toEqual(project1Result);
            expect(commandsByProject['project-2'][0]).toEqual(project2Result);
        });
        it('should organize commands by action', () => {
            const aiDebugResult = {
                id: 'cmd-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 4000,
                success: true,
                output: []
            };
            const nxTestResult = {
                id: 'cmd-2',
                action: 'nxTest',
                project: 'test-project',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 6000,
                success: true,
                output: []
            };
            store.completeCommand('cmd-1', aiDebugResult);
            store.completeCommand('cmd-2', nxTestResult);
            const commandsByAction = store.commandsByAction();
            expect(commandsByAction['aiDebug']).toHaveLength(1);
            expect(commandsByAction['nxTest']).toHaveLength(1);
            expect(commandsByAction['aiDebug'][0]).toEqual(aiDebugResult);
            expect(commandsByAction['nxTest'][0]).toEqual(nxTestResult);
        });
    });
    describe('batch operations', () => {
        it('should cancel all commands', () => {
            const execution1 = {
                id: 'test-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'running',
                startTime: new Date(),
                progress: 25,
                output: ['Starting...'],
                priority: 'normal'
            };
            const execution2 = {
                id: 'test-2',
                action: 'nxTest',
                project: 'test-project',
                status: 'running',
                startTime: new Date(),
                progress: 75,
                output: ['Running tests...'],
                priority: 'high'
            };
            const queuedCmd = {
                id: 'queued-1',
                action: 'gitDiff',
                project: 'test-project',
                priority: 'low',
                options: {},
                timestamp: new Date()
            };
            store.startCommand(execution1);
            store.startCommand(execution2);
            store.queueCommand(queuedCmd);
            store.cancelAllCommands();
            expect(store.activeCommandCount()).toBe(0);
            expect(store.queueLength()).toBe(0);
            expect(store.commandHistory()).toHaveLength(2);
            const history = store.commandHistory();
            expect(history.every(cmd => cmd.status === 'cancelled')).toBe(true);
        });
        it('should clear command history', () => {
            const result = {
                id: 'cmd-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 4000,
                success: true,
                output: []
            };
            store.completeCommand('cmd-1', result);
            expect(store.commandHistory()).toHaveLength(1);
            store.clearHistory();
            expect(store.commandHistory()).toHaveLength(0);
        });
    });
    describe('utility methods', () => {
        it('should get command by ID', () => {
            const execution = {
                id: 'test-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'running',
                startTime: new Date(),
                progress: 0,
                output: [],
                priority: 'normal'
            };
            store.startCommand(execution);
            expect(store.getCommandById('test-1')).toEqual(execution);
            expect(store.getCommandById('non-existent')).toBeUndefined();
        });
        it('should get command from history', () => {
            const result = {
                id: 'cmd-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 4000,
                success: true,
                output: []
            };
            store.completeCommand('cmd-1', result);
            expect(store.getCommandFromHistory('cmd-1')).toEqual(result);
            expect(store.getCommandFromHistory('non-existent')).toBeUndefined();
        });
        it('should get success rate by action', () => {
            const successResult = {
                id: 'success-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 4000,
                success: true,
                output: []
            };
            const errorResult = {
                id: 'error-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'error',
                startTime: new Date(),
                endTime: new Date(),
                duration: 3000,
                success: false,
                error: 'Failed',
                output: []
            };
            store.completeCommand('success-1', successResult);
            store.completeCommand('error-1', errorResult);
            expect(store.getSuccessRateByAction('aiDebug')).toBe(50);
            expect(store.getSuccessRateByAction('nxTest')).toBe(0);
        });
        it('should get average execution time by action', () => {
            const result1 = {
                id: 'cmd-1',
                action: 'aiDebug',
                project: 'test-project',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 4000,
                success: true,
                output: []
            };
            const result2 = {
                id: 'cmd-2',
                action: 'aiDebug',
                project: 'test-project',
                status: 'success',
                startTime: new Date(),
                endTime: new Date(),
                duration: 6000,
                success: true,
                output: []
            };
            store.completeCommand('cmd-1', result1);
            store.completeCommand('cmd-2', result2);
            expect(store.getAverageExecutionTimeByAction('aiDebug')).toBe(5000);
            expect(store.getAverageExecutionTimeByAction('nxTest')).toBe(0);
        });
    });
    describe('history management', () => {
        it('should limit history to 50 entries', () => {
            // Add 55 commands to test history limit
            for (let i = 0; i < 55; i++) {
                const result = {
                    id: `cmd-${i}`,
                    action: 'aiDebug',
                    project: 'test-project',
                    status: 'success',
                    startTime: new Date(),
                    endTime: new Date(),
                    duration: 1000,
                    success: true,
                    output: []
                };
                store.completeCommand(`cmd-${i}`, result);
            }
            expect(store.commandHistory()).toHaveLength(50);
            // Check that older entries were removed
            const history = store.commandHistory();
            expect(history[0].id).toBe('cmd-5'); // First 5 should be removed
            expect(history[49].id).toBe('cmd-54'); // Last entry should be cmd-54
        });
    });
});
//# sourceMappingURL=command.store.spec.js.map