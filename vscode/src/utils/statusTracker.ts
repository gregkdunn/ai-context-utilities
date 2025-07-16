import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { CommandResult, ActionButton } from '../types';

/**
 * Enhanced status tracking for command execution
 */
export interface CommandStatus {
    id: string;
    command: 'aiDebug' | 'nxTest' | 'gitDiff' | 'prepareToPush';
    project?: string;
    status: 'idle' | 'running' | 'success' | 'error' | 'cancelled';
    progress: number; // 0-100
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    message: string;
    output: string;
    error?: string;
    outputFiles: string[];
    metadata: {
        options?: any;
        pid?: number;
        memoryUsage?: number;
        cancelled?: boolean;
    };
}

export interface StatusEvent {
    type: 'status_change' | 'progress_update' | 'output_append' | 'error_append' | 'command_complete';
    commandId: string;
    timestamp: Date;
    data: any;
}

export interface StatusHistory {
    commandId: string;
    command: string;
    project?: string;
    success: boolean;
    duration: number;
    timestamp: Date;
    errorSummary?: string;
    filesGenerated: number;
}

/**
 * Comprehensive status tracking system for AI Debug commands
 */
export class StatusTracker extends EventEmitter {
    private statusMap = new Map<string, CommandStatus>();
    private history: StatusHistory[] = [];
    private statusBarItem: vscode.StatusBarItem;
    private maxHistorySize = 50;
    private persistenceKey = 'aiDebugUtilities.statusHistory';

    constructor(private context: vscode.ExtensionContext) {
        super();
        
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left, 
            100
        );
        this.statusBarItem.command = 'aiDebugUtilities.showStatus';
        context.subscriptions.push(this.statusBarItem);
        
        // Load persisted history
        this.loadHistory();
        
        // Update status bar
        this.updateStatusBar();
    }

    /**
     * Start tracking a new command
     */
    startCommand(
        command: 'aiDebug' | 'nxTest' | 'gitDiff' | 'prepareToPush',
        project?: string,
        options?: any
    ): string {
        const id = this.generateCommandId(command, project);
        
        const status: CommandStatus = {
            id,
            command,
            project,
            status: 'running',
            progress: 0,
            startTime: new Date(),
            message: 'Initializing...',
            output: '',
            outputFiles: [],
            metadata: {
                options,
                pid: process.pid
            }
        };

        this.statusMap.set(id, status);
        this.emitStatusChange(id, 'status_change', { status: 'running' });
        this.updateStatusBar();
        
        return id;
    }

    /**
     * Update command progress
     */
    updateProgress(commandId: string, progress: number, message?: string): void {
        const status = this.statusMap.get(commandId);
        if (!status) return;

        status.progress = Math.max(0, Math.min(100, progress));
        if (message) {
            status.message = message;
        }

        this.emitStatusChange(commandId, 'progress_update', { progress, message });
        this.updateStatusBar();
    }

    /**
     * Update command status
     */
    updateStatus(
        commandId: string, 
        newStatus: CommandStatus['status'], 
        message?: string
    ): void {
        const status = this.statusMap.get(commandId);
        if (!status) return;

        const previousStatus = status.status;
        status.status = newStatus;
        
        if (message) {
            status.message = message;
        }

        // Set end time for terminal states
        if (['success', 'error', 'cancelled'].includes(newStatus)) {
            status.endTime = new Date();
            if (status.startTime) {
                status.duration = status.endTime.getTime() - status.startTime.getTime();
            }
            
            // Add to history
            this.addToHistory(status);
            
            // Clean up completed commands after a delay
            setTimeout(() => this.cleanupCommand(commandId), 30000); // 30 seconds
        }

        this.emitStatusChange(commandId, 'status_change', { 
            previousStatus, 
            newStatus, 
            message 
        });
        this.updateStatusBar();
    }

    /**
     * Append output to command
     */
    appendOutput(commandId: string, output: string): void {
        const status = this.statusMap.get(commandId);
        if (!status) return;

        status.output += output;
        this.emitStatusChange(commandId, 'output_append', { output });
    }

    /**
     * Append error to command
     */
    appendError(commandId: string, error: string): void {
        const status = this.statusMap.get(commandId);
        if (!status) return;

        status.error = (status.error || '') + error;
        this.emitStatusChange(commandId, 'error_append', { error });
    }

    /**
     * Complete a command with final result
     */
    completeCommand(commandId: string, result: CommandResult): void {
        const status = this.statusMap.get(commandId);
        if (!status) return;

        status.status = result.success ? 'success' : 'error';
        status.progress = 100;
        status.endTime = new Date();
        status.duration = result.duration;
        status.output = result.output || status.output;
        status.error = result.error;
        status.outputFiles = result.outputFiles || [];
        
        if (status.startTime) {
            status.duration = status.endTime.getTime() - status.startTime.getTime();
        }

        // Add memory usage if available
        const memUsage = process.memoryUsage();
        status.metadata.memoryUsage = memUsage.heapUsed;

        this.addToHistory(status);
        this.emitStatusChange(commandId, 'command_complete', { result });
        this.updateStatusBar();

        // Show completion notification
        this.showCompletionNotification(status);
    }

    /**
     * Cancel a running command
     */
    cancelCommand(commandId: string): void {
        const status = this.statusMap.get(commandId);
        if (!status || status.status !== 'running') return;

        status.status = 'cancelled';
        status.metadata.cancelled = true;
        status.message = 'Cancelled by user';
        
        this.updateStatus(commandId, 'cancelled', 'Cancelled by user');
    }

    /**
     * Get current status of a command
     */
    getStatus(commandId: string): CommandStatus | undefined {
        return this.statusMap.get(commandId);
    }

    /**
     * Get all current statuses
     */
    getAllStatuses(): CommandStatus[] {
        return Array.from(this.statusMap.values());
    }

    /**
     * Get running commands
     */
    getRunningCommands(): CommandStatus[] {
        return this.getAllStatuses().filter(s => s.status === 'running');
    }

    /**
     * Get command history
     */
    getHistory(): StatusHistory[] {
        return [...this.history];
    }

    /**
     * Get statistics for a specific command type
     */
    getCommandStats(command?: string): {
        total: number;
        successful: number;
        failed: number;
        averageDuration: number;
        lastRun?: Date;
    } {
        const filtered = command 
            ? this.history.filter(h => h.command === command)
            : this.history;

        const total = filtered.length;
        const successful = filtered.filter(h => h.success).length;
        const failed = total - successful;
        const averageDuration = total > 0 
            ? filtered.reduce((sum, h) => sum + h.duration, 0) / total
            : 0;
        const lastRun = total > 0 
            ? filtered[filtered.length - 1].timestamp
            : undefined;

        return {
            total,
            successful,
            failed,
            averageDuration,
            lastRun
        };
    }

    /**
     * Clear all history
     */
    clearHistory(): void {
        this.history = [];
        this.saveHistory();
        this.emit('history_cleared');
    }

    /**
     * Export status report
     */
    generateStatusReport(): string {
        const running = this.getRunningCommands();
        const stats = this.getCommandStats();
        
        let report = `
=================================================================
🔍 AI DEBUG UTILITIES - STATUS REPORT
=================================================================

📊 Generated: ${new Date().toISOString()}
🔄 Running Commands: ${running.length}
📈 Total Commands Run: ${stats.total}

=================================================================
🚀 CURRENTLY RUNNING
=================================================================

`;

        if (running.length === 0) {
            report += '✅ No commands currently running\n\n';
        } else {
            for (const cmd of running) {
                const elapsed = cmd.startTime 
                    ? Date.now() - cmd.startTime.getTime()
                    : 0;
                
                report += `🔄 ${cmd.command}${cmd.project ? ` (${cmd.project})` : ''}
   Status: ${cmd.message}
   Progress: ${cmd.progress}%
   Elapsed: ${Math.round(elapsed / 1000)}s
   ID: ${cmd.id}

`;
            }
        }

        report += `
=================================================================
📊 STATISTICS
=================================================================

Total Runs: ${stats.total}
✅ Successful: ${stats.successful} (${stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%)
❌ Failed: ${stats.failed} (${stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}%)
⏱️  Average Duration: ${Math.round(stats.averageDuration / 1000)}s
🕐 Last Run: ${stats.lastRun ? stats.lastRun.toLocaleString() : 'Never'}

=================================================================
📈 COMMAND BREAKDOWN
=================================================================

`;

        const commands = ['aiDebug', 'nxTest', 'gitDiff', 'prepareToPush'] as const;
        for (const cmd of commands) {
            const cmdStats = this.getCommandStats(cmd);
            report += `${this.getCommandIcon(cmd)} ${cmd}:
   Runs: ${cmdStats.total}
   Success Rate: ${cmdStats.total > 0 ? Math.round((cmdStats.successful / cmdStats.total) * 100) : 0}%
   Avg Duration: ${Math.round(cmdStats.averageDuration / 1000)}s

`;
        }

        if (this.history.length > 0) {
            report += `
=================================================================
📋 RECENT HISTORY (Last 10)
=================================================================

`;

            const recent = this.history.slice(-10).reverse();
            for (const entry of recent) {
                const icon = entry.success ? '✅' : '❌';
                report += `${icon} ${entry.command}${entry.project ? ` (${entry.project})` : ''}
   ${entry.timestamp.toLocaleString()}
   Duration: ${Math.round(entry.duration / 1000)}s
   Files: ${entry.filesGenerated}
   ${entry.errorSummary ? `Error: ${entry.errorSummary}` : ''}

`;
            }
        }

        return report;
    }

    /**
     * Convert to action button format for webview
     */
    toActionButtons(): Record<string, ActionButton> {
        const buttons: Record<string, ActionButton> = {};
        const commands = ['aiDebug', 'nxTest', 'gitDiff', 'prepareToPush'] as const;
        
        for (const cmd of commands) {
            const running = this.getAllStatuses().find(s => s.command === cmd && s.status === 'running');
            const lastCompleted = this.history
                .filter(h => h.command === cmd)
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

            buttons[cmd] = {
                id: cmd,
                label: this.getCommandLabel(cmd),
                icon: this.getCommandIcon(cmd),
                status: running ? 'running' : (lastCompleted ? (lastCompleted.success ? 'success' : 'error') : 'idle'),
                lastRun: lastCompleted?.timestamp || running?.startTime,
                enabled: !running,
                progress: running?.progress
            };
        }

        return buttons;
    }

    // Private methods
    private generateCommandId(command: string, project?: string): string {
        const timestamp = Date.now();
        const suffix = project ? `-${project}` : '';
        return `${command}${suffix}-${timestamp}`;
    }

    private emitStatusChange(commandId: string, type: StatusEvent['type'], data: any): void {
        const event: StatusEvent = {
            type,
            commandId,
            timestamp: new Date(),
            data
        };
        
        this.emit('status_change', event);
        this.emit(type, event); // Also emit specific event type
    }

    private addToHistory(status: CommandStatus): void {
        const historyEntry: StatusHistory = {
            commandId: status.id,
            command: status.command,
            project: status.project,
            success: status.status === 'success',
            duration: status.duration || 0,
            timestamp: status.endTime || new Date(),
            errorSummary: status.error ? status.error.substring(0, 100) + '...' : undefined,
            filesGenerated: status.outputFiles.length
        };

        this.history.push(historyEntry);
        
        // Trim history if it gets too large
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
        
        this.saveHistory();
        this.emit('history_updated', historyEntry);
    }

    private cleanupCommand(commandId: string): void {
        const status = this.statusMap.get(commandId);
        if (status && ['success', 'error', 'cancelled'].includes(status.status)) {
            this.statusMap.delete(commandId);
            this.updateStatusBar();
        }
    }

    private updateStatusBar(): void {
        const running = this.getRunningCommands();
        
        if (running.length === 0) {
            this.statusBarItem.text = '$(debug-alt) AI Debug';
            this.statusBarItem.tooltip = 'AI Debug Utilities - Ready';
        } else if (running.length === 1) {
            const cmd = running[0];
            this.statusBarItem.text = `$(loading~spin) ${cmd.command} ${cmd.progress}%`;
            this.statusBarItem.tooltip = `Running: ${cmd.message}`;
        } else {
            this.statusBarItem.text = `$(loading~spin) ${running.length} commands`;
            this.statusBarItem.tooltip = `Running ${running.length} commands`;
        }
        
        this.statusBarItem.show();
    }

    private showCompletionNotification(status: CommandStatus): void {
        const config = vscode.workspace.getConfiguration('aiDebugUtilities');
        if (!config.get('showNotifications', true)) {
            return;
        }

        const duration = status.duration ? Math.round(status.duration / 1000) : 0;
        const message = `${status.command} ${status.status} in ${duration}s`;
        
        if (status.status === 'success') {
            vscode.window.showInformationMessage(message, 'View Output', 'Open Files')
                .then(selection => {
                    if (selection === 'View Output') {
                        this.emit('show_output', status.id);
                    } else if (selection === 'Open Files') {
                        this.emit('open_files', status.outputFiles);
                    }
                });
        } else {
            vscode.window.showErrorMessage(message, 'View Details')
                .then(selection => {
                    if (selection === 'View Details') {
                        this.emit('show_error', status.id);
                    }
                });
        }
    }

    private loadHistory(): void {
        const saved = this.context.globalState.get<StatusHistory[]>(this.persistenceKey);
        if (saved) {
            this.history = saved.map(entry => ({
                ...entry,
                timestamp: new Date(entry.timestamp)
            }));
        }
    }

    private saveHistory(): void {
        this.context.globalState.update(this.persistenceKey, this.history);
    }

    private getCommandLabel(command: string): string {
        const labels = {
            aiDebug: 'AI Debug Analysis',
            nxTest: 'Run Tests',
            gitDiff: 'Analyze Changes',
            prepareToPush: 'Prepare to Push'
        };
        return labels[command as keyof typeof labels] || command;
    }

    private getCommandIcon(command: string): string {
        const icons = {
            aiDebug: '🤖',
            nxTest: '🧪',
            gitDiff: '📋',
            prepareToPush: '🚀'
        };
        return icons[command as keyof typeof icons] || '⚙️';
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.statusBarItem.dispose();
        this.removeAllListeners();
    }
}
