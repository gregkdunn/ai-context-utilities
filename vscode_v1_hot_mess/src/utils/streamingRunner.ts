import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';
import { StreamingMessage, CommandResult } from '../types';

export interface StreamingOptions {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    killSignal?: string;
    progressSteps?: string[];
}

export class StreamingCommandRunner extends EventEmitter {
    private _activeProcess?: ChildProcess;
    private _isRunning = false;
    private _startTime?: number;
    private _currentOutput = '';
    private _timeoutId?: NodeJS.Timeout;
    private _forceKillTimeoutId?: NodeJS.Timeout;

    constructor(private readonly _outputChannel: vscode.OutputChannel) {
        super();
    }

    // Main execution method
    public async executeWithStreaming(command: string, args: string[], options: StreamingOptions = {}): Promise<CommandResult> {
        if (this._isRunning) {
            throw new Error('Command is already running');
        }

        this._isRunning = true;
        this._startTime = Date.now();
        this._currentOutput = '';

        try {
            return await this._executeCommand(command, args, options);
        } finally {
            this._cleanup();
        }
    }

    // Test command execution
    public async executeTestCommand(command: string, args: string[], cwd?: string): Promise<CommandResult> {
        return this.executeWithStreaming(command, args, { cwd });
    }

    // Git command execution
    public async executeGitCommand(args: string[], cwd?: string): Promise<CommandResult> {
        return this.executeWithStreaming('git', args, { cwd });
    }

    // Lint command execution
    public async executeLintCommand(command: string, args: string[], cwd?: string): Promise<CommandResult> {
        return this.executeWithStreaming(command, args, { cwd });
    }

    private async _executeCommand(command: string, args: string[], options: StreamingOptions): Promise<CommandResult> {
        return new Promise<CommandResult>((resolve, reject) => {
            this._activeProcess = spawn(command, args, {
                cwd: options.cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                env: { ...process.env, ...options.env },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let error = '';

            // FIX: Add error handling for stdout/stderr streams
            this._activeProcess.stdout?.on('data', (data: Buffer) => {
                const text = data.toString();
                output += text;
                this._currentOutput += text;
                
                this.emit('output', text);
                this._outputChannel.append(text);
            });

            this._activeProcess.stdout?.on('error', (err: Error) => {
                console.warn('stdout stream error:', err);
                // Don't reject here, let the process handle it
            });

            this._activeProcess.stderr?.on('data', (data: Buffer) => {
                const text = data.toString();
                error += text;
                this._currentOutput += text;
                
                this.emit('error', text);
                this._outputChannel.append(text);
            });

            this._activeProcess.stderr?.on('error', (err: Error) => {
                console.warn('stderr stream error:', err);
                // Don't reject here, let the process handle it
            });

            this._activeProcess.on('close', (code: number) => {
                const duration = Date.now() - (this._startTime || 0);
                
                // FIX: Clear timeout when process completes
                if (this._timeoutId) {
                    clearTimeout(this._timeoutId);
                    this._timeoutId = undefined;
                }
                
                const result: CommandResult = {
                    success: code === 0,
                    exitCode: code,
                    output,
                    error,
                    duration
                };

                this.emit('complete', result);
                resolve(result);
            });

            this._activeProcess.on('error', (err: Error) => {
                const duration = Date.now() - (this._startTime || 0);
                
                // FIX: Clear timeout when process errors
                if (this._timeoutId) {
                    clearTimeout(this._timeoutId);
                    this._timeoutId = undefined;
                }
                
                const result: CommandResult = {
                    success: false,
                    exitCode: 1,
                    output,
                    error: err.message,
                    duration
                };

                this.emit('error', err.message);
                this.emit('complete', result);
                resolve(result); // Resolve instead of reject to maintain consistency
            });

            // FIX: Handle timeout properly
            if (options.timeout) {
                this._timeoutId = setTimeout(() => {
                    if (this._activeProcess && this._isRunning) {
                        console.log(`Command timed out after ${options.timeout}ms`);
                        this._cancelWithTimeout();
                        reject(new Error(`Command timed out after ${options.timeout}ms`));
                    }
                }, options.timeout);
            }
        });
    }

    public cancel(): void {
        if (this._activeProcess && this._isRunning) {
            this._cancelWithTimeout();
        }
    }

    // FIX: Improved cancel with timeout handling
    private _cancelWithTimeout(): void {
        if (!this._activeProcess) {
            return;
        }

        console.log('Cancelling command with SIGTERM');
        this._activeProcess.kill('SIGTERM');
        
        // FIX: Clear existing force kill timeout before setting new one
        if (this._forceKillTimeoutId) {
            clearTimeout(this._forceKillTimeoutId);
        }
        
        // Force kill after 5 seconds
        this._forceKillTimeoutId = setTimeout(() => {
            if (this._activeProcess) {
                console.log('Force killing command with SIGKILL');
                this._activeProcess.kill('SIGKILL');
            }
            this._forceKillTimeoutId = undefined;
        }, 5000);
    }

    // FIX: Comprehensive cleanup method
    private _cleanup(): void {
        this._isRunning = false;
        this._activeProcess = undefined;
        
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = undefined;
        }
        
        if (this._forceKillTimeoutId) {
            clearTimeout(this._forceKillTimeoutId);
            this._forceKillTimeoutId = undefined;
        }
    }

    public get isRunning(): boolean {
        return this._isRunning;
    }

    public getCurrentOutput(): string {
        return this._currentOutput;
    }

    public clearOutput(): void {
        this._currentOutput = '';
    }

    public simulateProgress(duration: number): void {
        const interval = 100; // Update every 100ms
        const steps = duration / interval;
        let currentStep = 0;

        const progressInterval = setInterval(() => {
            // FIX: Stop progress simulation if command is no longer running
            if (!this._isRunning) {
                clearInterval(progressInterval);
                return;
            }

            currentStep++;
            const progress = Math.min(90, Math.floor((currentStep / steps) * 100)); // Cap at 90%
            
            this.emit('progress', progress);
            
            if (currentStep >= steps) {
                clearInterval(progressInterval);
            }
        }, interval);
    }

    public dispose(): void {
        this.cancel();
        this._cleanup();
        this.removeAllListeners();
    }
}