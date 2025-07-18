#!/bin/bash

# Final TypeScript fixes - addressing remaining compilation errors
echo "🔧 Applying final TypeScript fixes..."

# Fix export type issues in shellRunner.ts
echo "Fixing export type issues..."
sed -i '' 's/export { CommandResult, CommandOptions };/export type { CommandResult, CommandOptions };/' src/utils/shellRunner.ts

# Fix CommandOptions interface to include missing properties
echo "Updating CommandOptions interface..."
cat > src/types/commandOptions.ts << 'EOF'
export interface CommandOptions {
    project?: string;
    quick?: boolean;
    fullContext?: boolean;
    noDiff?: boolean;
    focus?: 'tests' | 'types' | 'performance';
    useExpected?: boolean;
    fullOutput?: boolean;
    // Shell runner specific options
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    shell?: boolean;
}
EOF

# Update main types index to export the new interface
echo "Updating main types index..."
echo "export * from './commandOptions';" >> src/types/index.ts

# Fix shellRunner to use proper CommandOptions
echo "Fixing shellRunner to use proper CommandOptions..."
cat > src/utils/shellRunner.ts << 'EOF'
import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';
import { CommandOptions, CommandResult } from '../types';

export type { CommandResult, CommandOptions };

export class CommandRunner {
    private _outputChannel: vscode.OutputChannel;
    private _currentProcess?: ChildProcess;
    private _isRunning = false;

    constructor(outputChannel: vscode.OutputChannel) {
        this._outputChannel = outputChannel;
    }

    public async execute(command: string, options: CommandOptions = {}): Promise<CommandResult> {
        const startTime = Date.now();
        
        return new Promise<CommandResult>((resolve, reject) => {
            const [cmd, ...args] = command.split(' ');
            
            this._currentProcess = spawn(cmd, args, {
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

            this._currentProcess.on('close', (code: number) => {
                const duration = Date.now() - startTime;
                
                resolve({
                    success: code === 0,
                    exitCode: code,
                    output: stdout,
                    error: stderr,
                    duration
                });
            });

            this._currentProcess.on('error', (error: Error) => {
                reject(error);
            });

            // Handle timeout
            if (options.timeout) {
                setTimeout(() => {
                    if (this._currentProcess) {
                        this._currentProcess.kill('SIGTERM');
                        reject(new Error('Command timed out'));
                    }
                }, options.timeout);
            }
        });
    }

    public async executeShell(command: string, options: CommandOptions = {}): Promise<CommandResult> {
        return this.execute(command, { ...options, shell: true });
    }

    // AI Debug command
    public async runAiDebug(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        const cmd = `yarn nx run ${project}:ai-debug ${options.quick ? '--quick' : ''}`.trim();
        return this.execute(cmd, options);
    }

    // NX Test command
    public async runNxTest(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        const cmd = `yarn nx test ${project} ${options.useExpected ? '--use-expected' : ''}`.trim();
        return this.execute(cmd, options);
    }

    // Git Diff command
    public async runGitDiff(options: CommandOptions = {}): Promise<CommandResult> {
        const cmd = `git diff ${options.noDiff ? '--name-only' : ''}`.trim();
        return this.execute(cmd, options);
    }

    // Prepare to Push command
    public async runPrepareToPush(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        const cmd = `yarn nx run ${project}:prepare-to-push`;
        return this.execute(cmd, options);
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
        }
    }

    // Set running state
    private setRunning(running: boolean): void {
        this._isRunning = running;
    }
}
EOF

echo "✅ Final TypeScript fixes applied!"

# Run compilation test
echo "🧪 Testing TypeScript compilation..."
npm run compile

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript compilation still has errors"
    echo "Remaining errors:"
    npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
fi
