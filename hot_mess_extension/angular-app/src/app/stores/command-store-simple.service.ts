import { Injectable, signal, computed } from '@angular/core';
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

@Injectable({
  providedIn: 'root'
})
export class CommandStoreService {
  // Private state signals
  private readonly _activeCommands = signal<Record<string, CommandExecution>>({});
  private readonly _commandHistory = signal<CommandResult[]>([]);
  private readonly _executionQueue = signal<QueuedCommand[]>([]);

  // Public readonly signals
  readonly activeCommands = this._activeCommands.asReadonly();
  readonly commandHistory = this._commandHistory.asReadonly();
  readonly executionQueue = this._executionQueue.asReadonly();

  // Computed signals
  readonly activeCommandCount = computed(() => Object.keys(this.activeCommands()).length);
  readonly isExecuting = computed(() => Object.keys(this.activeCommands()).length > 0);
  readonly queueLength = computed(() => this.executionQueue().length);
  
  // Performance metrics
  readonly successRate = computed(() => {
    const history = this.commandHistory();
    if (history.length === 0) return 0;
    const successful = history.filter(cmd => cmd.status === 'success').length;
    return (successful / history.length) * 100;
  });
  
  // Command organization
  readonly commandsByProject = computed(() => {
    const history = this.commandHistory();
    return history.reduce((acc, cmd) => {
      if (!acc[cmd.project]) acc[cmd.project] = [];
      acc[cmd.project].push(cmd);
      return acc;
    }, {} as Record<string, CommandResult[]>);
  });
  
  // Dashboard data
  readonly recentActivity = computed(() => 
    this.commandHistory()
      .slice(-20)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  );
  
  // Performance analysis
  readonly averageExecutionTime = computed(() => {
    const completedCommands = this.commandHistory().filter(cmd => 
      cmd.endTime && (cmd.status === 'success' || cmd.status === 'error')
    );
    
    if (completedCommands.length === 0) return 0;
    
    const totalTime = completedCommands.reduce((sum, cmd) => {
      return sum + (cmd.endTime!.getTime() - cmd.startTime.getTime());
    }, 0);
    
    return totalTime / completedCommands.length;
  });
  
  // Command analytics by action type
  readonly commandsByAction = computed(() => {
    const history = this.commandHistory();
    return history.reduce((acc, cmd) => {
      if (!acc[cmd.action]) acc[cmd.action] = [];
      acc[cmd.action].push(cmd);
      return acc;
    }, {} as Record<CommandAction, CommandResult[]>);
  });
  
  // Queue management
  readonly queueByPriority = computed(() => {
    const queue = this.executionQueue();
    return {
      high: queue.filter(cmd => cmd.priority === 'high'),
      normal: queue.filter(cmd => cmd.priority === 'normal'),
      low: queue.filter(cmd => cmd.priority === 'low')
    };
  });
  
  // Current execution status
  readonly currentStatus = computed(() => {
    const active = this.activeCommands();
    const activeCount = Object.keys(active).length;
    const queueCount = this.executionQueue().length;
    
    if (activeCount === 0 && queueCount === 0) return 'idle';
    if (activeCount > 0) return 'running';
    if (queueCount > 0) return 'queued';
    return 'idle';
  });

  // Queue management methods
  queueCommand(command: QueuedCommand): void {
    this._executionQueue.update(queue => 
      [...queue, command]
        .sort((a, b) => {
          // Sort by priority (high > normal > low), then by timestamp
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          return priorityDiff || a.timestamp.getTime() - b.timestamp.getTime();
        })
    );
  }
  
  // Command execution lifecycle
  startCommand(execution: CommandExecution): void {
    // Remove from queue
    this._executionQueue.update(queue => 
      queue.filter(q => q.id !== execution.id)
    );
    
    // Add to active commands
    this._activeCommands.update(commands => ({
      ...commands,
      [execution.id]: execution
    }));
  }
  
  // Progress tracking
  updateProgress(commandId: string, progress: number, output?: string): void {
    this._activeCommands.update(commands => {
      const command = commands[commandId];
      if (!command) return commands;
      
      const updatedCommand = {
        ...command,
        progress: Math.max(0, Math.min(100, progress)),
        output: output ? [...command.output, output] : command.output
      };
      
      return {
        ...commands,
        [commandId]: updatedCommand
      };
    });
  }
  
  // Command completion
  completeCommand(commandId: string, result: CommandResult): void {
    // Remove from active commands
    this._activeCommands.update(commands => {
      const { [commandId]: completed, ...remaining } = commands;
      return remaining;
    });
    
    // Add to history
    this._commandHistory.update(history => [
      ...history.slice(-49), // Keep last 50 commands
      result
    ]);
  }
  
  // Command cancellation
  cancelCommand(commandId: string): void {
    const command = this.activeCommands()[commandId];
    if (!command) return;
    
    const cancelledResult: CommandResult = {
      ...command,
      status: 'cancelled',
      endTime: new Date(),
      duration: Date.now() - command.startTime.getTime(),
      success: false
    };
    
    // Remove from active commands
    this._activeCommands.update(commands => {
      const { [commandId]: cancelled, ...remaining } = commands;
      return remaining;
    });
    
    // Add to history
    this._commandHistory.update(history => [...history, cancelledResult]);
  }
  
  // Queue management
  removeFromQueue(commandId: string): void {
    this._executionQueue.update(queue => 
      queue.filter(cmd => cmd.id !== commandId)
    );
  }
  
  // Batch operations
  cancelAllCommands(): void {
    const cancelledCommands = Object.values(this.activeCommands()).map(cmd => ({
      ...cmd,
      status: 'cancelled' as const,
      endTime: new Date(),
      duration: Date.now() - cmd.startTime.getTime(),
      success: false
    }));
    
    // Clear active commands and queue
    this._activeCommands.set({});
    this._executionQueue.set([]);
    
    // Add cancelled commands to history
    this._commandHistory.update(history => [
      ...history,
      ...cancelledCommands
    ]);
  }
  
  // History management
  clearHistory(): void {
    this._commandHistory.set([]);
  }
  
  // Command retry
  retryCommand(commandId: string): void {
    const failedCommand = this.commandHistory().find(cmd => cmd.id === commandId);
    if (!failedCommand || failedCommand.status === 'success') return;
    
    const retryCommand: QueuedCommand = {
      id: `${commandId}-retry-${Date.now()}`,
      action: failedCommand.action,
      project: failedCommand.project,
      priority: 'normal',
      options: {},
      timestamp: new Date()
    };
    
    this.queueCommand(retryCommand);
  }
  
  // Utility methods
  getCommandById(commandId: string): CommandExecution | undefined {
    return this.activeCommands()[commandId];
  }
  
  getCommandFromHistory(commandId: string): CommandResult | undefined {
    return this.commandHistory().find(cmd => cmd.id === commandId);
  }
  
  // Analytics methods
  getSuccessRateByAction(action: CommandAction): number {
    const actionCommands = this.commandsByAction()[action] || [];
    if (actionCommands.length === 0) return 0;
    
    const successful = actionCommands.filter(cmd => cmd.status === 'success').length;
    return (successful / actionCommands.length) * 100;
  }
  
  getAverageExecutionTimeByAction(action: CommandAction): number {
    const actionCommands = this.commandsByAction()[action] || [];
    const completedCommands = actionCommands.filter(cmd => 
      cmd.endTime && (cmd.status === 'success' || cmd.status === 'error')
    );
    
    if (completedCommands.length === 0) return 0;
    
    const totalTime = completedCommands.reduce((sum, cmd) => sum + cmd.duration, 0);
    return totalTime / completedCommands.length;
  }
}

// Alias for backward compatibility
export const CommandStore = CommandStoreService;
