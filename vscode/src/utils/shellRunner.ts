import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { CommandOptions, CommandResult } from '../types';

export class CommandRunner {
    private workspaceRoot: string;
    private currentProcess?: ChildProcess;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    /**
     * Run AI Debug command
     */
    async runAiDebug(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        const args = [project];
        
        if (options.quick) args.push('--quick');
        if (options.fullContext) args.push('--full-context');
        if (options.noDiff) args.push('--no-diff');
        if (options.focus) args.push(`--focus=${options.focus}`);

        return this.executeShellFunction('aiDebug', args);
    }

    /**
     * Run NX Test command
     */
    async runNxTest(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        const args = [project];
        
        if (options.useExpected) args.push('--use-expected');
        if (options.fullOutput) args.push('--full-output');

        return this.executeShellFunction('nxTest', args);
    }

    /**
     * Run Git Diff command
     */
    async runGitDiff(options: CommandOptions = {}): Promise<CommandResult> {
        const args: string[] = [];
        
        // Add any git diff specific options here
        
        return this.executeShellFunction('gitDiff', args);
    }

    /**
     * Run Prepare to Push command
     */
    async runPrepareToPush(project: string): Promise<CommandResult> {
        return this.executeShellFunction('prepareToPush', [project]);
    }

    /**
     * Execute a shell function (simulating the zsh functions)
     */
    private async executeShellFunction(functionName: string, args: string[]): Promise<CommandResult> {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            let output = '';
            let errorOutput = '';

            // For now, we'll simulate the shell functions by running yarn nx commands directly
            // In a real implementation, you'd want to either:
            // 1. Call the actual shell functions if available
            // 2. Port the shell logic to TypeScript
            // 3. Use a hybrid approach
            
            const { command, commandArgs } = this.mapToYarnCommands(functionName, args);
            
            console.log(`Running: ${command} ${commandArgs.join(' ')}`);
            
            this.currentProcess = spawn(command, commandArgs, {
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
                    duration,
                    outputFiles: this.getExpectedOutputFiles(functionName)
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
     * Map shell functions to yarn commands (temporary implementation)
     */
    private mapToYarnCommands(functionName: string, args: string[]): { command: string; commandArgs: string[] } {
        const project = args[0];
        
        switch (functionName) {
            case 'aiDebug':
                // For now, just run tests - we'll enhance this later
                return {
                    command: 'yarn',
                    commandArgs: ['nx', 'test', project, '--verbose']
                };
            
            case 'nxTest':
                return {
                    command: 'yarn',
                    commandArgs: ['nx', 'test', project, '--verbose']
                };
            
            case 'gitDiff':
                return {
                    command: 'git',
                    commandArgs: ['diff']
                };
            
            case 'prepareToPush':
                return {
                    command: 'yarn',
                    commandArgs: ['nx', 'lint', project]
                };
            
            default:
                return {
                    command: 'echo',
                    commandArgs: [`Unknown command: ${functionName}`]
                };
        }
    }

    /**
     * Get expected output files for a command
     */
    private getExpectedOutputFiles(functionName: string): string[] {
        const config = vscode.workspace.getConfiguration('aiDebugUtilities');
        const outputDir = config.get<string>('outputDirectory') || '.github/instructions/ai_utilities_context';
        
        switch (functionName) {
            case 'aiDebug':
                return [
                    `${outputDir}/ai-debug-context.txt`,
                    `${outputDir}/jest-output.txt`,
                    `${outputDir}/diff.txt`
                ];
            
            case 'nxTest':
                return [`${outputDir}/jest-output.txt`];
            
            case 'gitDiff':
                return [`${outputDir}/diff.txt`];
            
            case 'prepareToPush':
                return [];
            
            default:
                return [];
        }
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
