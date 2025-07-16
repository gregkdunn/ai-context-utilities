import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { CommandResult, StreamingEventEmitter } from '../types';

/**
 * Enhanced command runner with real-time streaming capabilities
 */
export class StreamingCommandRunner extends EventEmitter implements StreamingEventEmitter {
    private currentProcess?: ChildProcess;
    private startTime: number = 0;
    private outputBuffer: string = '';
    private errorBuffer: string = '';

    /**
     * Execute a command with real-time streaming
     */
    async executeWithStreaming(
        command: string, 
        args: string[], 
        options: {
            cwd?: string;
            shell?: boolean;
            progressSteps?: string[]; // Keywords that indicate progress milestones
        } = {}
    ): Promise<CommandResult> {
        this.startTime = Date.now();
        this.outputBuffer = '';
        this.errorBuffer = '';

        const progressSteps = options.progressSteps || [];
        let currentStep = 0;

        return new Promise((resolve) => {
            console.log(`Streaming command: ${command} ${args.join(' ')}`);
            
            this.currentProcess = spawn(command, args, {
                cwd: options.cwd,
                shell: options.shell !== false, // Default to true
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Stream stdout data
            this.currentProcess.stdout?.on('data', (data) => {
                const text = data.toString();
                this.outputBuffer += text;
                
                // Emit real-time output
                this.emit('output', text);
                
                // Check for progress milestones
                if (progressSteps.length > 0) {
                    const lowerText = text.toLowerCase();
                    for (let i = currentStep; i < progressSteps.length; i++) {
                        if (lowerText.includes(progressSteps[i].toLowerCase())) {
                            currentStep = i + 1;
                            const progress = Math.round((currentStep / progressSteps.length) * 100);
                            this.emit('progress', progress);
                            this.emit('status', `Step ${currentStep}/${progressSteps.length}: ${progressSteps[i]}`);
                            break;
                        }
                    }
                }
            });

            // Stream stderr data
            this.currentProcess.stderr?.on('data', (data) => {
                const text = data.toString();
                this.errorBuffer += text;
                
                // Emit error output (some commands use stderr for normal output)
                this.emit('error', text);
            });

            // Handle process completion
            this.currentProcess.on('close', (code) => {
                const duration = Date.now() - this.startTime;
                const result: CommandResult = {
                    success: code === 0,
                    exitCode: code || 0,
                    output: this.outputBuffer,
                    error: this.errorBuffer || undefined,
                    duration
                };
                
                this.currentProcess = undefined;
                this.emit('complete', result);
                resolve(result);
            });

            // Handle process errors
            this.currentProcess.on('error', (error) => {
                const duration = Date.now() - this.startTime;
                const result: CommandResult = {
                    success: false,
                    exitCode: 1,
                    output: this.outputBuffer,
                    error: error.message,
                    duration
                };
                
                this.currentProcess = undefined;
                this.emit('complete', result);
                resolve(result);
            });

            // Emit initial status
            this.emit('status', 'Starting command execution...');
        });
    }

    /**
     * Cancel the currently running command
     */
    cancel(): void {
        if (this.currentProcess) {
            this.emit('status', 'Cancelling command...');
            this.currentProcess.kill('SIGTERM');
            
            // Force kill after 5 seconds
            setTimeout(() => {
                if (this.currentProcess) {
                    this.currentProcess.kill('SIGKILL');
                }
            }, 5000);
            
            this.currentProcess = undefined;
        }
    }

    /**
     * Check if a command is currently running
     */
    isRunning(): boolean {
        return this.currentProcess !== undefined;
    }

    /**
     * Get current output buffer
     */
    getCurrentOutput(): string {
        return this.outputBuffer;
    }

    /**
     * Clear output buffers
     */
    clearOutput(): void {
        this.outputBuffer = '';
        this.errorBuffer = '';
    }

    /**
     * Simulate progress for commands that don't provide clear milestones
     */
    simulateProgress(durationMs: number = 30000): void {
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (!this.isRunning()) {
                clearInterval(interval);
                return;
            }

            const elapsed = Date.now() - startTime;
            const progress = Math.min(Math.round((elapsed / durationMs) * 90), 90); // Max 90% until complete
            this.emit('progress', progress);
        }, 1000);
    }

    /**
     * Enhanced execute method for test commands with smart progress tracking
     */
    async executeTestCommand(
        command: string,
        args: string[],
        cwd: string
    ): Promise<CommandResult> {
        const testProgressSteps = [
            'determining test suites to run',
            'found test suites',
            'running tests',
            'test suites completed',
            'collecting coverage',
            'test results'
        ];

        this.emit('status', 'Initializing test runner...');
        
        return this.executeWithStreaming(command, args, {
            cwd,
            progressSteps: testProgressSteps
        });
    }

    /**
     * Enhanced execute method for git operations
     */
    async executeGitCommand(
        args: string[],
        cwd: string
    ): Promise<CommandResult> {
        const gitProgressSteps = [
            'analyzing repository',
            'computing diff',
            'processing changes'
        ];

        this.emit('status', 'Analyzing git repository...');
        
        return this.executeWithStreaming('git', args, {
            cwd,
            progressSteps: gitProgressSteps
        });
    }

    /**
     * Enhanced execute method for lint/format operations
     */
    async executeLintCommand(
        command: string,
        args: string[],
        cwd: string
    ): Promise<CommandResult> {
        const lintProgressSteps = [
            'loading configuration',
            'scanning files',
            'running lint rules',
            'generating report'
        ];

        this.emit('status', 'Starting code analysis...');
        
        return this.executeWithStreaming(command, args, {
            cwd,
            progressSteps: lintProgressSteps
        });
    }
}