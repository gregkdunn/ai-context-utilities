"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandStore = void 0;
const core_1 = require("@angular/core");
const signals_1 = require("@ngrx/signals");
const initialCommandState = {
    activeCommands: {},
    commandHistory: [],
    executionQueue: []
};
exports.CommandStore = (0, signals_1.signalStore)({ providedIn: 'root' }, (0, signals_1.withState)(initialCommandState), (0, signals_1.withComputed)(({ activeCommands, commandHistory, executionQueue }) => ({
    // Command execution statistics
    activeCommandCount: (0, core_1.computed)(() => Object.keys(activeCommands()).length),
    isExecuting: (0, core_1.computed)(() => Object.keys(activeCommands()).length > 0),
    queueLength: (0, core_1.computed)(() => executionQueue().length),
    // Performance metrics
    successRate: (0, core_1.computed)(() => {
        const history = commandHistory();
        if (history.length === 0)
            return 0;
        const successful = history.filter(cmd => cmd.status === 'success').length;
        return (successful / history.length) * 100;
    }),
    // Command organization
    commandsByProject: (0, core_1.computed)(() => {
        const history = commandHistory();
        return history.reduce((acc, cmd) => {
            if (!acc[cmd.project])
                acc[cmd.project] = [];
            acc[cmd.project].push(cmd);
            return acc;
        }, {});
    }),
    // Dashboard data
    recentActivity: (0, core_1.computed)(() => commandHistory()
        .slice(-20)
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())),
    // Performance analysis
    averageExecutionTime: (0, core_1.computed)(() => {
        const completedCommands = commandHistory().filter(cmd => cmd.endTime && (cmd.status === 'success' || cmd.status === 'error'));
        if (completedCommands.length === 0)
            return 0;
        const totalTime = completedCommands.reduce((sum, cmd) => {
            return sum + (cmd.endTime.getTime() - cmd.startTime.getTime());
        }, 0);
        return totalTime / completedCommands.length;
    }),
    // Command analytics by action type
    commandsByAction: (0, core_1.computed)(() => {
        const history = commandHistory();
        return history.reduce((acc, cmd) => {
            if (!acc[cmd.action])
                acc[cmd.action] = [];
            acc[cmd.action].push(cmd);
            return acc;
        }, {});
    }),
    // Queue management
    queueByPriority: (0, core_1.computed)(() => {
        const queue = executionQueue();
        return {
            high: queue.filter(cmd => cmd.priority === 'high'),
            normal: queue.filter(cmd => cmd.priority === 'normal'),
            low: queue.filter(cmd => cmd.priority === 'low')
        };
    }),
    // Current execution status
    currentStatus: (0, core_1.computed)(() => {
        const active = activeCommands();
        const activeCount = Object.keys(active).length;
        const queueCount = executionQueue().length;
        if (activeCount === 0 && queueCount === 0)
            return 'idle';
        if (activeCount > 0)
            return 'running';
        if (queueCount > 0)
            return 'queued';
        return 'idle';
    })
})), (0, signals_1.withMethods)((store) => ({
    // Queue management
    queueCommand(command) {
        store.update(state => ({
            executionQueue: [...state.executionQueue, command]
                .sort((a, b) => {
                // Sort by priority (high > normal > low), then by timestamp
                const priorityOrder = { high: 3, normal: 2, low: 1 };
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                return priorityDiff || a.timestamp.getTime() - b.timestamp.getTime();
            })
        }));
    },
    // Command execution lifecycle
    startCommand(execution) {
        store.update(state => {
            const { executionQueue, ...rest } = state;
            const remainingQueue = executionQueue.filter(q => q.id !== execution.id);
            return {
                ...rest,
                executionQueue: remainingQueue,
                activeCommands: {
                    ...state.activeCommands,
                    [execution.id]: execution
                }
            };
        });
    },
    // Progress tracking
    updateProgress(commandId, progress, output) {
        store.update(state => {
            const command = state.activeCommands[commandId];
            if (!command)
                return state;
            const updatedCommand = {
                ...command,
                progress: Math.max(0, Math.min(100, progress)),
                output: output ? [...command.output, output] : command.output
            };
            return {
                ...state,
                activeCommands: {
                    ...state.activeCommands,
                    [commandId]: updatedCommand
                }
            };
        });
    },
    // Command completion
    completeCommand(commandId, result) {
        store.update(state => {
            const { [commandId]: completed, ...remainingCommands } = state.activeCommands;
            return {
                ...state,
                activeCommands: remainingCommands,
                commandHistory: [
                    ...state.commandHistory.slice(-49), // Keep last 50 commands
                    result
                ]
            };
        });
    },
    // Command cancellation
    cancelCommand(commandId) {
        store.update(state => {
            const command = state.activeCommands[commandId];
            if (!command)
                return state;
            const cancelledResult = {
                ...command,
                status: 'cancelled',
                endTime: new Date(),
                duration: Date.now() - command.startTime.getTime(),
                success: false
            };
            const { [commandId]: cancelled, ...remainingCommands } = state.activeCommands;
            return {
                ...state,
                activeCommands: remainingCommands,
                commandHistory: [...state.commandHistory, cancelledResult]
            };
        });
    },
    // Queue management
    removeFromQueue(commandId) {
        store.update(state => ({
            ...state,
            executionQueue: state.executionQueue.filter(cmd => cmd.id !== commandId)
        }));
    },
    // Batch operations
    cancelAllCommands() {
        store.update(state => {
            const cancelledCommands = Object.values(state.activeCommands).map(cmd => ({
                ...cmd,
                status: 'cancelled',
                endTime: new Date(),
                duration: Date.now() - cmd.startTime.getTime(),
                success: false
            }));
            return {
                ...state,
                activeCommands: {},
                executionQueue: [],
                commandHistory: [
                    ...state.commandHistory,
                    ...cancelledCommands
                ]
            };
        });
    },
    // History management
    clearHistory() {
        store.update(state => ({
            ...state,
            commandHistory: []
        }));
    },
    // Command retry
    retryCommand(commandId) {
        store.update(state => {
            const failedCommand = state.commandHistory.find(cmd => cmd.id === commandId);
            if (!failedCommand || failedCommand.status === 'success')
                return state;
            const retryCommand = {
                id: `${commandId}-retry-${Date.now()}`,
                action: failedCommand.action,
                project: failedCommand.project,
                priority: 'normal',
                options: {},
                timestamp: new Date()
            };
            return {
                ...state,
                executionQueue: [...state.executionQueue, retryCommand]
                    .sort((a, b) => {
                    const priorityOrder = { high: 3, normal: 2, low: 1 };
                    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                    return priorityDiff || a.timestamp.getTime() - b.timestamp.getTime();
                })
            };
        });
    },
    // Utility methods
    getCommandById(commandId) {
        return store.activeCommands()[commandId];
    },
    getCommandFromHistory(commandId) {
        return store.commandHistory().find(cmd => cmd.id === commandId);
    },
    // Analytics methods
    getSuccessRateByAction(action) {
        const actionCommands = store.commandsByAction()[action] || [];
        if (actionCommands.length === 0)
            return 0;
        const successful = actionCommands.filter(cmd => cmd.status === 'success').length;
        return (successful / actionCommands.length) * 100;
    },
    getAverageExecutionTimeByAction(action) {
        const actionCommands = store.commandsByAction()[action] || [];
        const completedCommands = actionCommands.filter(cmd => cmd.endTime && (cmd.status === 'success' || cmd.status === 'error'));
        if (completedCommands.length === 0)
            return 0;
        const totalTime = completedCommands.reduce((sum, cmd) => sum + cmd.duration, 0);
        return totalTime / completedCommands.length;
    }
})));
//# sourceMappingURL=command.store.js.map