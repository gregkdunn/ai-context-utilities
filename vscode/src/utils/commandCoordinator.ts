import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { StatusTracker, CommandStatus } from './statusTracker';
import { StreamingCommandRunner } from './streamingRunner';
import { CommandResult, CommandOptions, StreamingMessage } from '../types';

/**
 * Coordinates command execution with real-time status tracking and streaming
 */
export class CommandCoordinator extends EventEmitter {
    private activeCommands = new Map<string, StreamingCommandRunner>();
    private commandQueue: Array<{
        id: string;
        command: string;
        args: string[];
        options: any;
        resolve: (result: CommandResult) => void;
        reject: (error: Error) => void;
    }> = [];
    private maxConcurrentCommands = 3;

    constructor(
        private statusTracker: StatusTracker,
        private context: vscode.ExtensionContext
    ) {
        super();
        
        // Listen to status tracker events
        this.statusTracker.on('status_change', (event) => {
            this.emit('status_update', event);
        });
    }

    /**
     * Execute a command with full status tracking and streaming
     */
    async executeCommand(
        command: 'aiDebug' | 'nxTest' | 'gitDiff' | 'prepareToPush',
        args: string[],
        options: {
            project?: string;
            cwd?: string;
            commandOptions?: CommandOptions;
            priority?: 'low' | 'normal' | 'high';
        } = {}
    ): Promise<CommandResult> {
        // Check if we're at the concurrent limit
        if (this.activeCommands.size >= this.maxConcurrentCommands) {
            if (options.priority === 'high') {
                // Cancel lowest priority command for high priority
                this.cancelLowestPriorityCommand();
            } else {
                // Queue the command
                return this.queueCommand(command, args, options);
            }
        }

        const commandId = this.statusTracker.startCommand(
            command, 
            options.project, 
            options.commandOptions
        );

        try {
            return await this.executeCommandInternal(commandId, command, args, options);
        } catch (error) {
            this.statusTracker.updateStatus(commandId, 'error', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }

    /**
     * Cancel a specific command
     */
    cancelCommand(commandId: string): boolean {
        const runner = this.activeCommands.get(commandId);
        if (runner && runner.isRunning()) {
            runner.cancel();
            this.statusTracker.cancelCommand(commandId);
            this.activeCommands.delete(commandId);
            this.processQueue(); // Process next queued command
            return true;
        }
        return false;
    }

    /**
     * Cancel all running commands
     */
    cancelAllCommands(): void {
        for (const [commandId, runner] of this.activeCommands) {
            if (runner.isRunning()) {
                runner.cancel();
                this.statusTracker.cancelCommand(commandId);
            }
        }
        this.activeCommands.clear();
        this.commandQueue = [];
    }

    /**
     * Get current execution status
     */
    getExecutionStatus(): {
        active: number;
        queued: number;
        maxConcurrent: number;
        commands: CommandStatus[];
    } {
        return {
            active: this.activeCommands.size,
            queued: this.commandQueue.length,
            maxConcurrent: this.maxConcurrentCommands,
            commands: this.statusTracker.getAllStatuses()
        };
    }

    /**
     * Set maximum concurrent commands
     */
    setMaxConcurrentCommands(max: number): void {
        this.maxConcurrentCommands = Math.max(1, Math.min(10, max));
        
        // If we're over the limit, queue doesn't need immediate action
        // as commands will naturally complete and be processed
    }

    /**
     * Get streaming output for a command
     */
    getCommandOutput(commandId: string): string {
        const runner = this.activeCommands.get(commandId);
        return runner?.getCurrentOutput() || '';
    }

    /**
     * Clear output for a command
     */
    clearCommandOutput(commandId: string): void {
        const runner = this.activeCommands.get(commandId);
        if (runner) {
            runner.clearOutput();
        }
    }

    /**
     * Get detailed execution metrics
     */
    getExecutionMetrics(): {
        totalCommands: number;
        successRate: number;
        averageExecutionTime: number;
        concurrentPeak: number;
        queueTimeAverage: number;
    } {
        const history = this.statusTracker.getHistory();
        const stats = this.statusTracker.getCommandStats();
        
        return {
            totalCommands: stats.total,
            successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
            averageExecutionTime: stats.averageDuration,
            concurrentPeak: this.maxConcurrentCommands, // Could track actual peak
            queueTimeAverage: 0 // Would need to track queue times
        };
    }

    /**
     * Create execution health report
     */
    createHealthReport(): string {
        const status = this.getExecutionStatus();
        const metrics = this.getExecutionMetrics();
        const now = new Date();
        
        return `
=================================================================
🏥 COMMAND EXECUTION HEALTH REPORT
=================================================================

📊 Generated: ${now.toISOString()}
🔧 System Status: ${status.active > 0 ? 'ACTIVE' : 'IDLE'}

=================================================================
📈 CURRENT STATUS
=================================================================

🔄 Active Commands: ${status.active}/${status.maxConcurrent}
⏳ Queued Commands: ${status.queued}
📊 Total Executed: ${metrics.totalCommands}
✅ Success Rate: ${metrics.successRate.toFixed(1)}%
⏱️  Avg Execution: ${(metrics.averageExecutionTime / 1000).toFixed(1)}s

=================================================================
🚀 ACTIVE COMMANDS
=================================================================

${this.formatActiveCommands(status.commands)}

=================================================================
⚡ PERFORMANCE METRICS
=================================================================

• Concurrent Limit: ${status.maxConcurrent} commands
• Queue Processing: ${status.queued > 0 ? 'PROCESSING' : 'IDLE'}
• Memory Usage: ${this.getMemoryUsage()}
• Uptime: ${this.getUptime()}

=================================================================
💡 RECOMMENDATIONS
=================================================================

${this.generateRecommendations(status, metrics)}

=================================================================
`;
    }

    // Private methods
    private async executeCommandInternal(
        commandId: string,
        command: string,
        args: string[],
        options: any
    ): Promise<CommandResult> {
        const runner = new StreamingCommandRunner();
        this.activeCommands.set(commandId, runner);

        // Set up streaming event handlers
        runner.on('output', (output: string) => {
            this.statusTracker.appendOutput(commandId, output);
            this.emitStreamingMessage(commandId, 'output', { text: output });
        });

        runner.on('error', (error: string) => {
            this.statusTracker.appendError(commandId, error);
            this.emitStreamingMessage(commandId, 'error', { text: error });
        });

        runner.on('progress', (progress: number) => {
            this.statusTracker.updateProgress(commandId, progress);
            this.emitStreamingMessage(commandId, 'progress', { progress });
        });

        runner.on('status', (status: string) => {
            this.statusTracker.updateStatus(commandId, 'running', status);
            this.emitStreamingMessage(commandId, 'status', { status });
        });

        try {
            // Execute based on command type with appropriate streaming
            let result: CommandResult;
            
            switch (command) {
                case 'nxTest':
                    result = await runner.executeTestCommand(
                        'npx',
                        ['nx', 'test', ...args],
                        options.cwd || process.cwd()
                    );
                    break;
                    
                case 'gitDiff':
                    result = await runner.executeGitCommand(
                        ['diff', ...args],
                        options.cwd || process.cwd()
                    );
                    break;
                    
                case 'prepareToPush':
                    result = await runner.executeLintCommand(
                        'npx',
                        ['nx', 'lint', ...args],
                        options.cwd || process.cwd()
                    );
                    break;
                    
                default:
                    // Generic command execution
                    result = await runner.executeWithStreaming(
                        command,
                        args,
                        {
                            cwd: options.cwd,
                            progressSteps: this.getProgressSteps(command)
                        }
                    );
            }

            // Complete the command
            this.statusTracker.completeCommand(commandId, result);
            this.emitStreamingMessage(commandId, 'complete', { result });
            
            return result;

        } finally {
            // Clean up
            this.activeCommands.delete(commandId);
            runner.removeAllListeners();
            
            // Process next queued command
            this.processQueue();
        }
    }

    private async queueCommand(
        command: string,
        args: string[],
        options: any
    ): Promise<CommandResult> {
        return new Promise((resolve, reject) => {
            const commandId = `queued-${Date.now()}`;
            
            this.commandQueue.push({
                id: commandId,
                command,
                args,
                options,
                resolve,
                reject
            });

            // Emit queue status update
            this.emit('queue_update', {
                queued: this.commandQueue.length,
                position: this.commandQueue.length
            });
        });
    }

    private processQueue(): void {
        if (this.commandQueue.length === 0 || this.activeCommands.size >= this.maxConcurrentCommands) {
            return;
        }

        const next = this.commandQueue.shift();
        if (!next) return;

        // Execute the queued command
        this.executeCommand(
            next.command as any,
            next.args,
            next.options
        ).then(next.resolve).catch(next.reject);

        // Update queue status
        this.emit('queue_update', {
            queued: this.commandQueue.length,
            processed: true
        });
    }

    private cancelLowestPriorityCommand(): void {
        // Find running command with lowest priority (most recent for now)
        const commandIds = Array.from(this.activeCommands.keys());
        if (commandIds.length > 0) {
            const commandToCancel = commandIds[commandIds.length - 1]; // Most recent
            this.cancelCommand(commandToCancel);
        }
    }

    private emitStreamingMessage(commandId: string, type: StreamingMessage['type'], data: any): void {
        const message: StreamingMessage = {
            type,
            data: {
                ...data,
                actionId: commandId
            },
            timestamp: new Date()
        };
        
        this.emit('streaming_message', message);
    }

    private getProgressSteps(command: string): string[] {
        const steps: Record<string, string[]> = {
            aiDebug: [
                'initializing workspace analysis',
                'analyzing test files',
                'running test suite',
                'collecting coverage data',
                'generating git diff',
                'creating ai context',
                'finalizing output'
            ],
            nxTest: [
                'loading nx configuration',
                'identifying test files',
                'starting jest runner',
                'executing tests',
                'collecting results',
                'generating coverage'
            ],
            gitDiff: [
                'analyzing git repository',
                'identifying changed files',
                'computing differences',
                'generating summary'
            ],
            prepareToPush: [
                'checking workspace status',
                'running eslint',
                'running prettier',
                'checking typescript',
                'validating build',
                'preparing summary'
            ]
        };
        
        return steps[command] || ['starting', 'processing', 'completing'];
    }

    private formatActiveCommands(commands: CommandStatus[]): string {
        const active = commands.filter(c => c.status === 'running');
        
        if (active.length === 0) {
            return '✅ No commands currently active';
        }
        
        return active.map(cmd => {
            const elapsed = cmd.startTime ? Date.now() - cmd.startTime.getTime() : 0;
            const elapsedSeconds = Math.round(elapsed / 1000);
            
            return `🔄 ${cmd.command}${cmd.project ? ` (${cmd.project})` : ''}
   Progress: ${cmd.progress}% | Elapsed: ${elapsedSeconds}s
   Status: ${cmd.message}
   ID: ${cmd.id.substring(0, 8)}...`;
        }).join('\n\n');
    }

    private getMemoryUsage(): string {
        const usage = process.memoryUsage();
        return `${Math.round(usage.heapUsed / 1024 / 1024)}MB`;
    }

    private getUptime(): string {
        const uptimeMs = process.uptime() * 1000;
        const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    private generateRecommendations(status: any, metrics: any): string {
        const recommendations: string[] = [];
        
        if (status.queued > 5) {
            recommendations.push('⚠️  High queue backlog - consider increasing concurrent limit');
        }
        
        if (metrics.successRate < 80) {
            recommendations.push('🔧 Low success rate - check command configurations');
        }
        
        if (metrics.averageExecutionTime > 60000) {
            recommendations.push('⏰ Long execution times - consider optimizing commands');
        }
        
        if (status.active === status.maxConcurrent) {
            recommendations.push('📈 At concurrent limit - monitor for bottlenecks');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('✅ System running optimally');
        }
        
        return recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n');
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.cancelAllCommands();
        this.removeAllListeners();
    }
}
