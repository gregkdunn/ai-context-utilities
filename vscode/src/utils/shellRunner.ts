import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { CommandOptions, CommandResult } from '../types';
import { AiDebugCommand } from '../commands/aiDebug';
import { NxTestCommand } from '../commands/nxTest';
import { GitDiffCommand } from '../commands/gitDiff';
import { PrepareToPushCommand } from '../commands/prepareToPush';

export class CommandRunner {
    private workspaceRoot: string;
    private currentProcess?: ChildProcess;
    private aiDebugCommand: AiDebugCommand;
    private nxTestCommand: NxTestCommand;
    private gitDiffCommand: GitDiffCommand;
    private prepareToPushCommand: PrepareToPushCommand;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.aiDebugCommand = new AiDebugCommand();
        this.nxTestCommand = new NxTestCommand();
        this.gitDiffCommand = new GitDiffCommand();
        this.prepareToPushCommand = new PrepareToPushCommand();
    }

    /**
     * Run AI Debug command
     */
    async runAiDebug(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        return this.aiDebugCommand.run(project, options);
    }

    /**
     * Run NX Test command
     */
    async runNxTest(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        return this.nxTestCommand.run(project, options);
    }

    /**
     * Run Git Diff command
     */
    async runGitDiff(options: CommandOptions = {}): Promise<CommandResult> {
        return this.gitDiffCommand.run(options);
    }

    /**
     * Run Prepare to Push command
     */
    async runPrepareToPush(project: string): Promise<CommandResult> {
        return this.prepareToPushCommand.run(project);
    }

    /**
     * Execute a generic shell command (used by legacy methods)
     */
    private async executeShellCommand(command: string, args: string[]): Promise<CommandResult> {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            let output = '';
            let errorOutput = '';
            
            console.log(`Running: ${command} ${args.join(' ')}`);
            
            this.currentProcess = spawn(command, args, {
                cwd: this.workspaceRoot,
                shell: true
            });

            this.currentProcess.stdout?.on('data', (data) => {
                const text = data.toString();
                output += text;
                this.sendOutputToTerminal(text);
            });

            this.currentProcess.stderr?.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                this.sendOutputToTerminal(text);
            });

            this.currentProcess.on('close', (code) => {
                const duration = Date.now() - startTime;
                const result: CommandResult = {
                    success: code === 0,
                    exitCode: code || 0,
                    output,
                    error: errorOutput || undefined,
                    duration
                };
                
                this.currentProcess = undefined;
                resolve(result);
            });

            this.currentProcess.on('error', (error) => {
                const duration = Date.now() - startTime;
                const result: CommandResult = {
                    success: false,
                    exitCode: 1,
                    output,
                    error: error.message,
                    duration
                };
                
                this.currentProcess = undefined;
                resolve(result);
            });
        });
    }





    /**
     * Send output to VSCode terminal
     */
    private sendOutputToTerminal(text: string) {
        const config = vscode.workspace.getConfiguration('aiDebugUtilities');
        if (config.get('terminalIntegration')) {
            // Create or reuse terminal
            const terminal = vscode.window.terminals.find(t => t.name === 'AI Debug Utilities') 
                || vscode.window.createTerminal('AI Debug Utilities');
            
            terminal.sendText(text, false);
        }
    }

    /**
     * Cancel current running command
     */
    cancel(): void {
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
            this.currentProcess = undefined;
        }
    }

    /**
     * Check if a command is currently running
     */
    isRunning(): boolean {
        return this.currentProcess !== undefined;
    }
}
