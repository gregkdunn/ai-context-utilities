import { Injectable, inject } from '@angular/core';
import { Observable, Subject, BehaviorSubject, combineLatest, merge, timer } from 'rxjs';
import { map, filter, takeUntil, debounceTime, switchMap } from 'rxjs/operators';
import { WebviewService } from './webview.service';
import { CommandStore } from '../stores/command.store';
import { ProjectStore } from '../stores/project.store';
import { 
  CommandAction, 
  CommandOptions, 
  CommandExecution, 
  CommandResult,
  QueuedCommand,
  StreamingMessage
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class CommandService {
  private readonly webviewService = inject(WebviewService);
  private readonly commandStore = inject(CommandStore);
  private readonly projectStore = inject(ProjectStore);

  private readonly destroy$ = new Subject<void>();
  private readonly maxConcurrentCommands = 3;
  private readonly commandTimeout = 300000; // 5 minutes

  constructor() {
    this.setupStreamingHandlers();
    this.setupCommandQueue();
    this.setupErrorHandling();
  }

  // Command execution
  async executeCommand(
    action: CommandAction,
    project: string,
    options: CommandOptions = {}
  ): Promise<void> {
    try {
      // Validate project
      if (!this.projectStore.getProjectByName(project)) {
        throw new Error(`Project '${project}' not found`);
      }

      // Create command execution
      const commandId = this.generateCommandId();
      const queuedCommand: QueuedCommand = {
        id: commandId,
        action,
        project,
        priority: options.priority || 'normal',
        options,
        timestamp: new Date()
      };

      // Check if we can execute immediately or need to queue
      if (this.commandStore.activeCommandCount() < this.maxConcurrentCommands) {
        await this.startCommandExecution(queuedCommand);
      } else {
        this.commandStore.queueCommand(queuedCommand);
        this.notifyCommandQueued(queuedCommand);
      }
    } catch (error) {
      console.error('Error executing command:', error);
      this.webviewService.reportError(error);
      throw error;
    }
  }

  // Command cancellation
  cancelCommand(commandId: string): void {
    // Check if command is active
    const activeCommand = this.commandStore.getCommandById(commandId);
    if (activeCommand) {
      this.commandStore.cancelCommand(commandId);
      this.webviewService.cancelCommand(activeCommand.action);
      return;
    }

    // Check if command is queued
    this.commandStore.removeFromQueue(commandId);
  }

  // Cancel all commands
  cancelAllCommands(): void {
    this.commandStore.cancelAllCommands();
    this.webviewService.cancelCommand();
  }

  // Retry failed command
  retryCommand(commandId: string): void {
    const failedCommand = this.commandStore.getCommandFromHistory(commandId);
    if (!failedCommand || failedCommand.status === 'success') {
      return;
    }

    this.executeCommand(
      failedCommand.action,
      failedCommand.project,
      { priority: 'normal' }
    );
  }

  // Command queue management
  private setupCommandQueue(): void {
    // Process queue when commands complete - using effect for signals
    // This will be handled by periodic checks instead of reactive streams
    timer(0, 1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(async () => {
      const activeCount = this.commandStore.activeCommandCount();
      const queueLength = this.commandStore.queueLength();
      
      if (activeCount < this.maxConcurrentCommands && queueLength > 0) {
        await this.processCommandQueue();
      }
    });
  }

  private async processCommandQueue(): Promise<void> {
    const queueByPriority = this.commandStore.queueByPriority();
    const availableSlots = this.maxConcurrentCommands - this.commandStore.activeCommandCount();

    if (availableSlots <= 0) return;

    // Process high priority commands first
    const commandsToExecute = [
      ...queueByPriority.high,
      ...queueByPriority.normal,
      ...queueByPriority.low
    ].slice(0, availableSlots);

    for (const queuedCommand of commandsToExecute) {
      await this.startCommandExecution(queuedCommand);
    }
  }

  // Command execution lifecycle
  private async startCommandExecution(queuedCommand: QueuedCommand): Promise<void> {
    const execution: CommandExecution = {
      id: queuedCommand.id,
      action: queuedCommand.action,
      project: queuedCommand.project,
      status: 'running',
      startTime: new Date(),
      progress: 0,
      output: [],
      priority: queuedCommand.priority
    };

    // Add to active commands
    this.commandStore.startCommand(execution);

    // Set up timeout
    const timeoutTimer = timer(this.commandTimeout).subscribe(() => {
      this.handleCommandTimeout(execution.id);
    });

    try {
      // Execute command via webview
      this.webviewService.runCommand(
        execution.action,
        execution.project,
        queuedCommand.options
      );

      // Track execution performance
      this.webviewService.trackEvent('command_started', {
        action: execution.action,
        project: execution.project,
        priority: execution.priority
      });

    } catch (error) {
      timeoutTimer.unsubscribe();
      this.handleCommandError(execution.id, error);
    }
  }

  // Streaming message handling
  private setupStreamingHandlers(): void {
    this.webviewService.onStreamingMessage().pipe(
      takeUntil(this.destroy$)
    ).subscribe((message: StreamingMessage) => {
      this.handleStreamingMessage(message);
    });
  }

  private handleStreamingMessage(message: StreamingMessage): void {
    const { type, data } = message;

    switch (type) {
      case 'output':
        if (data.actionId) {
          this.commandStore.updateProgress(
            data.actionId,
            this.commandStore.getCommandById(data.actionId)?.progress || 0,
            data.text
          );
        }
        break;

      case 'progress':
        if (data.actionId && typeof data.progress === 'number') {
          this.commandStore.updateProgress(data.actionId, data.progress);
        }
        break;

      case 'error':
        if (data.actionId) {
          this.handleCommandError(data.actionId, new Error(data.text));
        }
        break;

      case 'complete':
        if (data.actionId && data.result) {
          this.handleCommandComplete(data.actionId, data.result);
        }
        break;

      case 'status':
        // Handle status updates
        break;
    }
  }

  // Command completion handling
  private handleCommandComplete(commandId: string, result: CommandResult): void {
    this.commandStore.completeCommand(commandId, result);

    // Track completion
    this.webviewService.trackEvent('command_completed', {
      action: result.action,
      project: result.project,
      success: result.success,
      duration: result.duration
    });

    // Show notification if enabled
    this.showCommandNotification(result);
  }

  // Error handling
  private setupErrorHandling(): void {
    // Handle webview errors
    this.webviewService.onMessage().pipe(
      filter(msg => msg.command === 'error'),
      takeUntil(this.destroy$)
    ).subscribe((errorMsg) => {
      this.handleGlobalError(errorMsg.error);
    });
  }

  private handleCommandError(commandId: string, error: any): void {
    const command = this.commandStore.getCommandById(commandId);
    if (!command) return;

    const result: CommandResult = {
      ...command,
      status: 'error',
      endTime: new Date(),
      duration: Date.now() - command.startTime.getTime(),
      success: false,
      error: error.message || error.toString()
    };

    this.commandStore.completeCommand(commandId, result);

    // Track error
    this.webviewService.trackEvent('command_error', {
      action: command.action,
      project: command.project,
      error: result.error,
      duration: result.duration
    });

    this.webviewService.reportError(error);
  }

  private handleCommandTimeout(commandId: string): void {
    const command = this.commandStore.getCommandById(commandId);
    if (!command) return;

    const result: CommandResult = {
      ...command,
      status: 'error',
      endTime: new Date(),
      duration: this.commandTimeout,
      success: false,
      error: 'Command timed out'
    };

    this.commandStore.completeCommand(commandId, result);

    // Track timeout
    this.webviewService.trackEvent('command_timeout', {
      action: command.action,
      project: command.project,
      duration: this.commandTimeout
    });

    this.webviewService.showNotification(
      `Command "${command.action}" timed out after ${this.commandTimeout / 1000}s`,
      'warning'
    );
  }

  private handleGlobalError(error: any): void {
    console.error('Global error:', error);
    this.webviewService.reportError(error);
  }

  // Notifications
  private showCommandNotification(result: CommandResult): void {
    const { action, project, success, duration } = result;
    const durationStr = `${Math.round(duration / 1000)}s`;

    if (success) {
      this.webviewService.showNotification(
        `✅ ${action} completed successfully for ${project} (${durationStr})`,
        'info'
      );
    } else {
      this.webviewService.showNotification(
        `❌ ${action} failed for ${project} (${durationStr})`,
        'error'
      );
    }
  }

  private notifyCommandQueued(command: QueuedCommand): void {
    this.webviewService.showNotification(
      `⏳ Command "${command.action}" queued for ${command.project}`,
      'info'
    );
  }

  // Utility methods
  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public query methods
  getCommandHistory(): Observable<CommandResult[]> {
    // Convert signal to observable
    return new Observable(observer => {
      const subscription = timer(0, 100).subscribe(() => {
        observer.next(this.commandStore.commandHistory());
      });
      return () => subscription.unsubscribe();
    });
  }

  getActiveCommands(): Observable<Record<string, CommandExecution>> {
    // Convert signal to observable
    return new Observable(observer => {
      const subscription = timer(0, 100).subscribe(() => {
        observer.next(this.commandStore.activeCommands());
      });
      return () => subscription.unsubscribe();
    });
  }

  getExecutionQueue(): Observable<QueuedCommand[]> {
    // Convert signal to observable
    return new Observable(observer => {
      const subscription = timer(0, 100).subscribe(() => {
        observer.next(this.commandStore.executionQueue());
      });
      return () => subscription.unsubscribe();
    });
  }

  getCommandStats(): Observable<{
    successRate: number;
    averageTime: number;
    totalExecuted: number;
    activeCount: number;
    queueLength: number;
  }> {
    return new Observable(observer => {
      const subscription = timer(0, 1000).subscribe(() => {
        const successRate = this.commandStore.successRate();
        const averageTime = this.commandStore.averageExecutionTime();
        const history = this.commandStore.commandHistory();
        const activeCount = this.commandStore.activeCommandCount();
        const queueLength = this.commandStore.queueLength();
        
        observer.next({
          successRate,
          averageTime,
          totalExecuted: history.length,
          activeCount,
          queueLength
        });
      });
      return () => subscription.unsubscribe();
    });
  }

  // Project-specific command methods
  getProjectCommands(projectName: string): Observable<CommandResult[]> {
    return new Observable(observer => {
      const subscription = timer(0, 1000).subscribe(() => {
        const byProject = this.commandStore.commandsByProject();
        observer.next(byProject[projectName] || []);
      });
      return () => subscription.unsubscribe();
    });
  }

  getProjectSuccessRate(projectName: string): Observable<number> {
    return this.getProjectCommands(projectName).pipe(
      map(commands => {
        if (commands.length === 0) return 0;
        const successful = commands.filter(cmd => cmd.status === 'success').length;
        return (successful / commands.length) * 100;
      })
    );
  }

  // Action-specific methods
  getActionStats(action: CommandAction): Observable<{
    successRate: number;
    averageTime: number;
    totalRuns: number;
  }> {
    return new Observable(observer => {
      const subscription = timer(0, 1000).subscribe(() => {
        const byAction = this.commandStore.commandsByAction();
        const actionCommands = byAction[action] || [];
        const totalRuns = actionCommands.length;
        
        if (totalRuns === 0) {
          observer.next({ successRate: 0, averageTime: 0, totalRuns: 0 });
          return;
        }

        const successful = actionCommands.filter(cmd => cmd.status === 'success').length;
        const successRate = (successful / totalRuns) * 100;
        
        const completedCommands = actionCommands.filter(cmd => cmd.endTime);
        const averageTime = completedCommands.length > 0
          ? completedCommands.reduce((sum, cmd) => sum + cmd.duration, 0) / completedCommands.length
          : 0;

        observer.next({ successRate, averageTime, totalRuns });
      });
      return () => subscription.unsubscribe();
    });
  }

  // Cleanup
  dispose(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
