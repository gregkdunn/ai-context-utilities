import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { NxProject, CommandResult, ActionButton } from '../types';

export interface StatusInfo {
    isRunning: boolean;
    currentAction?: string;
    progress?: number;
    message?: string;
    lastUpdated: Date;
}

export interface CommandStatus {
    id: string;
    action: string;
    command?: string;
    project?: string;
    status: 'running' | 'success' | 'error' | 'cancelled';
    startTime: Date;
    endTime?: Date;
    progress: number;
    output: string;
    error?: string;
    duration?: number;
    message?: string;
}

export interface CommandStats {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
    recentCommands: CommandStatus[];
}

export class StatusTracker extends EventEmitter {
    private _statusBarItem: vscode.StatusBarItem;
    private _projects: NxProject[] = [];
    private _currentStatus: StatusInfo = {
        isRunning: false,
        lastUpdated: new Date()
    };
    private _commandStatuses: Map<string, CommandStatus> = new Map();
    private _commandHistory: CommandStatus[] = [];

    constructor() {
        super();
        this._statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this._statusBarItem.show();
        this._updateStatusBar();
    }

    // Start a new command
    public startCommand(action: string, project?: string, options?: any): string {
        const commandId = `${action}-${Date.now()}`;
        
        const commandStatus: CommandStatus = {
            id: commandId,
            action,
            project,
            status: 'running',
            startTime: new Date(),
            progress: 0,
            output: ''
        };

        this._commandStatuses.set(commandId, commandStatus);
        this.updateStatus({
            isRunning: true,
            currentAction: action,
            progress: 0
        });

        this.emit('status_change', { commandId, status: commandStatus });
        
        return commandId;
    }

    // Complete a command
    public completeCommand(commandId: string, result: CommandResult): void {
        const commandStatus = this._commandStatuses.get(commandId);
        if (!commandStatus) {
            return;
        }

        commandStatus.status = result.success ? 'success' : 'error';
        commandStatus.endTime = new Date();
        commandStatus.duration = result.duration;
        commandStatus.output = result.output;
        commandStatus.error = result.error;
        commandStatus.progress = 100;

        this._commandHistory.push(commandStatus);
        this._commandStatuses.delete(commandId);

        // Update status if this was the current command
        if (this._commandStatuses.size === 0) {
            this.updateStatus({
                isRunning: false,
                currentAction: undefined,
                progress: 100,
                message: result.success ? 'Command completed' : 'Command failed'
            });
        }

        this.emit('status_change', { commandId, status: commandStatus });
        this.emit('history_updated', this._commandHistory);
    }

    // Cancel a command
    public cancelCommand(commandId: string): void {
        const commandStatus = this._commandStatuses.get(commandId);
        if (!commandStatus) {
            return;
        }

        commandStatus.status = 'cancelled';
        commandStatus.endTime = new Date();
        commandStatus.progress = 0;

        this._commandHistory.push(commandStatus);
        this._commandStatuses.delete(commandId);

        if (this._commandStatuses.size === 0) {
            this.updateStatus({
                isRunning: false,
                currentAction: undefined,
                progress: undefined,
                message: 'Command cancelled'
            });
        }

        this.emit('status_change', { commandId, status: commandStatus });
    }

    // Update command progress
    public updateProgress(commandId: string, progress: number): void {
        const commandStatus = this._commandStatuses.get(commandId);
        if (!commandStatus) {
            return;
        }

        commandStatus.progress = Math.max(0, Math.min(100, progress));
        
        this.updateStatus({
            progress: commandStatus.progress
        });

        this.emit('status_change', { commandId, status: commandStatus });
    }

    // Append output to command
    public appendOutput(commandId: string, output: string): void {
        const commandStatus = this._commandStatuses.get(commandId);
        if (!commandStatus) {
            return;
        }

        commandStatus.output += output;
        this.emit('status_change', { commandId, status: commandStatus });
    }

    // Append error to command
    public appendError(commandId: string, error: string): void {
        const commandStatus = this._commandStatuses.get(commandId);
        if (!commandStatus) {
            return;
        }

        commandStatus.error = (commandStatus.error || '') + error;
        this.emit('status_change', { commandId, status: commandStatus });
    }

    // Get all current statuses
    public getAllStatuses(): CommandStatus[] {
        return Array.from(this._commandStatuses.values());
    }

    // Get running commands
    public getRunningCommands(): CommandStatus[] {
        return Array.from(this._commandStatuses.values()).filter(
            status => status.status === 'running'
        );
    }

    // Get command history
    public getHistory(): CommandStatus[] {
        return [...this._commandHistory];
    }

    // Clear command history
    public clearHistory(): void {
        this._commandHistory = [];
        this.emit('history_updated', this._commandHistory);
    }

    // Get command statistics
    public getCommandStats(action?: string): CommandStats {
        let commands = this._commandHistory;
        
        if (action) {
            commands = commands.filter(cmd => cmd.action === action);
        }

        const successful = commands.filter(cmd => cmd.status === 'success').length;
        const failed = commands.filter(cmd => cmd.status === 'error').length;
        const totalDuration = commands.reduce((sum, cmd) => sum + (cmd.duration || 0), 0);

        return {
            total: commands.length,
            successful,
            failed,
            averageDuration: commands.length > 0 ? totalDuration / commands.length : 0,
            recentCommands: commands.slice(-10)
        };
    }

    // Generate status report
    public generateStatusReport(): string {
        const stats = this.getCommandStats();
        const runningCommands = this.getRunningCommands();
        
        return `
AI Debug Status Report
=====================

Current Status: ${this._currentStatus.isRunning ? 'Running' : 'Idle'}
Running Commands: ${runningCommands.length}
Total Commands: ${stats.total}
Success Rate: ${stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : 0}%
Average Duration: ${stats.averageDuration.toFixed(0)}ms

Recent Commands:
${stats.recentCommands.slice(-5).map(cmd => 
    `- ${cmd.action} (${cmd.project || 'N/A'}): ${cmd.status} - ${cmd.duration || 0}ms`
).join('\n')}
        `.trim();
    }

    // Convert to action buttons
    public toActionButtons(): Record<string, ActionButton> {
        const buttons: Record<string, ActionButton> = {};
        
        // Default actions
        const actions = ['aiDebug', 'nxTest', 'gitDiff', 'prepareToPush'] as const;
        
        for (const action of actions) {
            const runningCommand = this.getRunningCommands().find(cmd => cmd.action === action);
            const recentCommand = this._commandHistory
                .filter(cmd => cmd.action === action)
                .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];

            buttons[action] = {
                id: action,
                label: action.charAt(0).toUpperCase() + action.slice(1),
                icon: this._getActionIcon(action),
                status: runningCommand ? 'running' : 
                       recentCommand?.status === 'success' ? 'success' :
                       recentCommand?.status === 'error' ? 'error' : 'idle',
                lastRun: recentCommand?.endTime,
                enabled: !runningCommand,
                progress: runningCommand?.progress
            };
        }

        return buttons;
    }

    private _getActionIcon(action: string): string {
        switch (action) {
            case 'aiDebug': return '$(debug-alt)';
            case 'nxTest': return '$(beaker)';
            case 'gitDiff': return '$(git-compare)';
            case 'prepareToPush': return '$(cloud-upload)';
            default: return '$(play)';
        }
    }

    public updateStatus(status: Partial<StatusInfo>): void {
        this._currentStatus = {
            ...this._currentStatus,
            ...status,
            lastUpdated: new Date()
        };
        this._updateStatusBar();
    }

    public setRunning(action: string, message?: string): void {
        this.updateStatus({
            isRunning: true,
            currentAction: action,
            message,
            progress: 0
        });
    }

    public setProgress(progress: number, message?: string): void {
        this.updateStatus({
            progress,
            message
        });
    }

    public setComplete(message?: string): void {
        this.updateStatus({
            isRunning: false,
            currentAction: undefined,
            progress: 100,
            message
        });

        // Clear the message after 3 seconds
        setTimeout(() => {
            if (!this._currentStatus.isRunning) {
                this.updateStatus({
                    message: undefined,
                    progress: undefined
                });
            }
        }, 3000);
    }

    public setError(error: string): void {
        this.updateStatus({
            isRunning: false,
            currentAction: undefined,
            message: `Error: ${error}`,
            progress: undefined
        });

        // Clear the error after 5 seconds
        setTimeout(() => {
            if (!this._currentStatus.isRunning) {
                this.updateStatus({
                    message: undefined
                });
            }
        }, 5000);
    }

    public setProjects(projects: NxProject[]): void {
        this._projects = projects;
        this._updateStatusBar();
    }

    public getProjects(): NxProject[] {
        return this._projects;
    }

    public getCurrentStatus(): StatusInfo {
        return { ...this._currentStatus };
    }

    private _updateStatusBar(): void {
        let text = '$(debug-alt) AI Debug';
        let tooltip = 'AI Debug Utilities';

        if (this._currentStatus.isRunning) {
            text = `$(loading~spin) ${this._currentStatus.currentAction || 'Running'}`;
            tooltip = this._currentStatus.message || 'Command running...';
            
            if (this._currentStatus.progress !== undefined) {
                text += ` (${this._currentStatus.progress}%)`;
            }
        } else if (this._currentStatus.message) {
            text = `$(info) ${this._currentStatus.message}`;
            tooltip = this._currentStatus.message;
        }

        if (this._projects.length > 0) {
            text += ` (${this._projects.length} projects)`;
        }

        this._statusBarItem.text = text;
        this._statusBarItem.tooltip = tooltip;
        this._statusBarItem.command = 'aiDebugUtilities.openPanel';
    }

    public dispose(): void {
        this._statusBarItem.dispose();
        this.removeAllListeners();
    }
}