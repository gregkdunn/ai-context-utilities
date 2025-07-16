import { computed } from '@angular/core';
import { signalStore, withState, withMethods, withComputed } from '@ngrx/signals';
import { 
  CommandState, 
  CommandExecution, 
  CommandResult, 
  QueuedCommand, 
  CommandAction, 
  CommandOptions 
} from '../models';

const initialCommandState: CommandState = {
  activeCommands: {},
  commandHistory: [],
  executionQueue: []
};

export const CommandStore = signalStore(
  { providedIn: 'root' },
  withState(initialCommandState),
  withComputed(({ activeCommands, commandHistory, executionQueue }) => ({
    // Command execution statistics
    activeCommandCount: computed(() => Object.keys(activeCommands()).length),
    isExecuting: computed(() => Object.keys(activeCommands()).length > 0),
    queueLength: computed(() => executionQueue().length),
    
    // Performance metrics
    successRate: computed(() => {
      const history = commandHistory();
      if (history.length === 0) return 0;
      const successful = history.filter(cmd => cmd.status === 'success').length;
      return (successful / history.length) * 100;
    }),
    
    // Command organization
    commandsByProject: computed(() => {
      const history = commandHistory();
      return history.reduce((acc, cmd) => {
        if (!acc[cmd.project]) acc[cmd.project] = [];
        acc[cmd.project].push(cmd);
        return acc;
      }, {} as Record<string, CommandResult[]>);
    }),
    
    // Dashboard data
    recentActivity: computed(() => 
      commandHistory()
        .slice(-20)
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    ),
    
    // Performance analysis
    averageExecutionTime: computed(() => {
      const completedCommands = commandHistory().filter(cmd => 
        cmd.endTime && (cmd.status === 'success' || cmd.status === 'error')
      );
      
      if (completedCommands.length === 0) return 0;
      
      const totalTime = completedCommands.reduce((sum, cmd) => {
        return sum + (cmd.endTime!.getTime() - cmd.startTime.getTime());
      }, 0);
      
      return totalTime / completedCommands.length;
    }),
    
    // Command analytics by action type
    commandsByAction: computed(() => {
      const history = commandHistory();
      return history.reduce((acc, cmd) => {
        if (!acc[cmd.action]) acc[cmd.action] = [];
        acc[cmd.action].push(cmd);
        return acc;
      }, {} as Record<CommandAction, CommandResult[]>);
    }),
    
    // Queue management
    queueByPriority: computed(() => {
      const queue = executionQueue();
      return {
        high: queue.filter(cmd => cmd.priority === 'high'),
        normal: queue.filter(cmd => cmd.priority === 'normal'),
        low: queue.filter(cmd => cmd.priority === 'low')
      };
    }),
    
    // Current execution status
    currentStatus: computed(() => {
      const active = activeCommands();
      const activeCount = Object.keys(active).length;
      const queueCount = executionQueue().length;
      
      if (activeCount === 0 && queueCount === 0) return 'idle';
      if (activeCount > 0) return 'running';
      if (queueCount > 0) return 'queued';
      return 'idle';
    })
  })),
  withMethods((store) => ({
    // Queue management
    queueCommand(command: QueuedCommand) {
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
    startCommand(execution: CommandExecution) {
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
    updateProgress(commandId: string, progress: number, output?: string) {
      store.update(state => {
        const command = state.activeCommands[commandId];
        if (!command) return state;
        
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
    completeCommand(commandId: string, result: CommandResult) {
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
    cancelCommand(commandId: string) {
      store.update(state => {
        const command = state.activeCommands[commandId];
        if (!command) return state;
        
        const cancelledResult: CommandResult = {
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
    removeFromQueue(commandId: string) {
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
          status: 'cancelled' as const,
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
    retryCommand(commandId: string) {
      store.update(state => {
        const failedCommand = state.commandHistory.find(cmd => cmd.id === commandId);
        if (!failedCommand || failedCommand.status === 'success') return state;
        
        const retryCommand: QueuedCommand = {
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
    getCommandById(commandId: string): CommandExecution | undefined {
      return store.activeCommands()[commandId];
    },
    
    getCommandFromHistory(commandId: string): CommandResult | undefined {
      return store.commandHistory().find(cmd => cmd.id === commandId);
    },
    
    // Analytics methods
    getSuccessRateByAction(action: CommandAction): number {
      const actionCommands = store.commandsByAction()[action] || [];
      if (actionCommands.length === 0) return 0;
      
      const successful = actionCommands.filter(cmd => cmd.status === 'success').length;
      return (successful / actionCommands.length) * 100;
    },
    
    getAverageExecutionTimeByAction(action: CommandAction): number {
      const actionCommands = store.commandsByAction()[action] || [];
      const completedCommands = actionCommands.filter(cmd => 
        cmd.endTime && (cmd.status === 'success' || cmd.status === 'error')
      );
      
      if (completedCommands.length === 0) return 0;
      
      const totalTime = completedCommands.reduce((sum, cmd) => sum + cmd.duration, 0);
      return totalTime / completedCommands.length;
    }
  }))
);
