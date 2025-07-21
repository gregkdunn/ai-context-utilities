import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';
import { CommandOptions, CommandResult } from '../types';

export type { CommandResult, CommandOptions } from '../types';
export type { CommandOptions as ShellCommandOptions } from '../types/commandOptions';

export class CommandRunner {
    private _outputChannel: vscode.OutputChannel;
    private _currentProcess?: ChildProcess;
    private _isRunning = false;

    constructor(outputChannel: vscode.OutputChannel) {
        this._outputChannel = outputChannel;
    }

    public async execute(command: string, args: string[], options: CommandOptions = {}): Promise<CommandResult> {
        const startTime = Date.now();
        
        return new Promise<CommandResult>((resolve) => {
            this._isRunning = true;
            
            this._currentProcess = spawn(command, args, {
                cwd: options.cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                env: { ...process.env, ...options.env },
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: options.shell || false
            });

            let stdout = '';
            let stderr = '';

            this._currentProcess.stdout?.on('data', (data: Buffer) => {
                const text = data.toString();
                stdout += text;
                this._outputChannel.append(text);
            });

            this._currentProcess.stderr?.on('data', (data: Buffer) => {
                const text = data.toString();
                stderr += text;
                this._outputChannel.append(text);
            });

            this._currentProcess.on('close', (code: number | null) => {
                this._isRunning = false;
                this._currentProcess = undefined;
                
                const duration = Date.now() - startTime;
                const exitCode = code || 0;
                
                resolve({
                    success: exitCode === 0,
                    exitCode,
                    output: stdout,
                    error: stderr || undefined,
                    duration,
                    outputFiles: this.getExpectedOutputFiles(this.mapCommandName(command, args))
                });
            });

            this._currentProcess.on('error', (error: Error) => {
                this._isRunning = false;
                this._currentProcess = undefined;
                
                const duration = Date.now() - startTime;
                
                resolve({
                    success: false,
                    exitCode: 1,
                    output: stdout,
                    error: error.message,
                    duration,
                    outputFiles: this.getExpectedOutputFiles(this.mapCommandName(command, args))
                });
            });

            // Handle timeout
            if (options.timeout) {
                setTimeout(() => {
                    if (this._currentProcess) {
                        this._currentProcess.kill('SIGTERM');
                        this._isRunning = false;
                        this._currentProcess = undefined;
                        
                        resolve({
                            success: false,
                            exitCode: 1,
                            output: stdout,
                            error: 'Command timed out',
                            duration: Date.now() - startTime
                        });
                    }
                }, options.timeout);
            }
        });
    }

    private mapCommandName(command: string, args: string[]): string {
        if (command === 'yarn' && args.includes('nx')) {
            if (args.includes('test')) {
                return 'nxTest';
            }
            if (args.includes('lint')) {
                return 'prepareToPush';
            }
            if (args.includes('ai-debug')) {
                return 'aiDebug';
            }
        }
        if (command === 'git' && args.includes('diff')) {
            return 'gitDiff';
        }
        return 'unknown';
    }

    public async executeShell(command: string, options: CommandOptions = {}): Promise<CommandResult> {
        const [cmd, ...args] = command.split(' ');
        return this.execute(cmd, args, { ...options, shell: true });
    }

    // AI Debug command
    public async runAiDebug(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        const args = ['nx', 'test', project, '--verbose'];
        const expectedFiles = [
            '.github/instructions/ai_utilities_context/ai-debug-context.txt',
            '.github/instructions/ai_utilities_context/jest-output.txt',
            '.github/instructions/ai_utilities_context/diff.txt'
        ];
        
        const result = await this.execute('yarn', args, options);
        return {
            ...result,
            outputFiles: expectedFiles
        };
    }

    // NX Test command
    public async runNxTest(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        const args = ['nx', 'test', project, options.useExpected ? '--use-expected' : '--verbose'];
        const expectedFiles = [
            '.github/instructions/ai_utilities_context/jest-output.txt'
        ];
        
        const result = await this.execute('yarn', args, options);
        return {
            ...result,
            outputFiles: expectedFiles
        };
    }

    // Git Diff command
    public async runGitDiff(options: CommandOptions = {}): Promise<CommandResult> {
        const args = ['diff'];
        const expectedFiles = [
            '.github/instructions/ai_utilities_context/diff.txt'
        ];
        
        const result = await this.execute('git', args, options);
        return {
            ...result,
            outputFiles: expectedFiles
        };
    }

    // Prepare to Push command
    public async runPrepareToPush(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        const args = ['nx', 'lint', project];
        const expectedFiles: string[] = [];
        
        const result = await this.execute('yarn', args, options);
        return {
            ...result,
            outputFiles: expectedFiles
        };
    }

    // Check if command is running
    public isRunning(): boolean {
        return this._isRunning;
    }

    // Cancel current command
    public cancel(): void {
        if (this._currentProcess) {
            this._currentProcess.kill('SIGTERM');
            this._isRunning = false;
            this._currentProcess = undefined;
        }
    }

    private mapToYarnCommands(command: string, args: string[]): { command: string; commandArgs: string[] } {
        return {
            command: 'echo',
            commandArgs: [`Unknown command: ${command}`]
        };
    }

    private getExpectedOutputFiles(commandType: string): string[] {
        switch (commandType) {
            case 'aiDebug':
                return [
                    '.github/instructions/ai_utilities_context/ai-debug-context.txt',
                    '.github/instructions/ai_utilities_context/jest-output.txt',
                    '.github/instructions/ai_utilities_context/diff.txt'
                ];
            case 'nxTest':
                return [
                    '.github/instructions/ai_utilities_context/jest-output.txt'
                ];
            case 'gitDiff':
                return [
                    '.github/instructions/ai_utilities_context/diff.txt'
                ];
            case 'prepareToPush':
                return [];
            default:
                return [];
        }
    }
}
