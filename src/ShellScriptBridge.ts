/**
 * ShellScriptBridge - VSCode extension bridge to AI Debug Context shell scripts
 * 
 * This is a thin wrapper that executes shell scripts from VSCode.
 * The core functionality is implemented in universal shell scripts for maximum
 * compatibility and performance.
 * 
 * @version 3.0.0
 * @author AI Debug Context V3
 */

import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ShellScriptError, FileSystemError, ValidationError, ErrorHandler } from './errors/AIDebugErrors';
import { MacOSCompatibility } from './platform/MacOSCompatibility';

/**
 * Result of shell script execution
 */
export interface ScriptResult {
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
    readonly duration: number;
    readonly success: boolean;
}

/**
 * Configuration for script execution
 */
export interface ScriptOptions {
    readonly timeout?: number;
    readonly verbose?: boolean;
    readonly args?: string[];
    readonly input?: string;
    readonly cwd?: string;
}

/**
 * Shell script execution bridge for VSCode extension
 * 
 * Provides a clean TypeScript interface to the AI Debug Context shell scripts.
 * All core functionality is implemented in shell scripts for universal compatibility.
 */
export class ShellScriptBridge {
    private readonly workspaceRoot: string;
    private readonly scriptDir: string;
    private readonly outputChannel: vscode.OutputChannel;
    private readonly errorHandler: ErrorHandler;
    private readonly macosCompat: MacOSCompatibility;
    private currentProcess: ChildProcess | null = null;
    private readonly processRegistry: Set<ChildProcess> = new Set();

    /**
     * Initialize shell script bridge
     * 
     * @param extensionPath - Path to the VSCode extension
     * @param outputChannel - Shared output channel (optional, creates own if not provided)
     */
    constructor(extensionPath?: string, outputChannel?: vscode.OutputChannel) {
        // Use provided output channel or create own
        this.outputChannel = outputChannel || vscode.window.createOutputChannel('AI Debug Context');
        
        // Get workspace root
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        
        // Calculate script directory - must handle both development and installed cases
        if (extensionPath) {
            // When installed as extension, scripts are bundled with the extension
            this.scriptDir = path.join(extensionPath, 'scripts');
            this.outputChannel.appendLine(`📦 Using installed extension path: ${extensionPath}`);
        } else {
            // Development mode: scripts are relative to source
            this.scriptDir = path.join(__dirname, '..', 'scripts');
            this.outputChannel.appendLine(`🛠️ Using development path: ${__dirname}`);
        }
        this.outputChannel.appendLine(`📁 Final script directory: ${this.scriptDir}`);
        
        // Initialize error handler
        this.errorHandler = ErrorHandler.getInstance(this.outputChannel);
        
        // Initialize macOS compatibility
        this.macosCompat = new MacOSCompatibility();
        
        // Validate script directory exists
        this.validateScriptDirectory();
    }

    /**
     * Execute affected tests using shell script
     * 
     * Runs only tests affected by recent code changes for maximum speed.
     * 
     * @param options - Execution options
     * @returns Promise resolving to script execution result
     */
    async runAffectedTests(options: ScriptOptions = {}): Promise<ScriptResult> {
        this.showStatusMessage('Running affected tests...');
        
        const scriptArgs = this.buildScriptArgs(options, [
            '--base', 'main'  // Default to main branch
        ]);
        
        try {
            const result = await this.executeScript('ai-debug-affected-tests', scriptArgs, options);
            
            if (result.success) {
                this.showStatusMessage(`✅ Affected tests completed in ${result.duration}s`);
                vscode.window.showInformationMessage('Affected tests passed!');
            } else {
                this.showStatusMessage(`❌ Affected tests failed in ${result.duration}s`);
                // Don't show generic error - let the structured error handling below provide details
            }
            
            return result;
        } catch (error) {
            const structuredError = error instanceof ShellScriptError 
                ? error 
                : new ShellScriptError('ai-debug-affected-tests', 1, String(error), { operation: 'runAffectedTests' });
            
            this.errorHandler.showUserError(structuredError, vscode);
            throw structuredError;
        }
    }

    /**
     * Execute tests in parallel using shell script
     * 
     * Splits test files into chunks and runs them in parallel for maximum speed.
     * 
     * @param testFiles - Array of test file paths to execute
     * @param options - Execution options including concurrency
     * @returns Promise resolving to script execution result
     */
    async runParallelTests(testFiles: string[], options: ScriptOptions = {}): Promise<ScriptResult> {
        if (testFiles.length === 0) {
            const result: ScriptResult = {
                exitCode: 0,
                stdout: 'No test files provided',
                stderr: '',
                duration: 0,
                success: true
            };
            return result;
        }

        // Validate input to prevent command injection
        try {
            this.validateTestFiles(testFiles);
        } catch (error) {
            if (error instanceof ValidationError) {
                this.errorHandler.showUserError(error, vscode);
                throw error;
            }
            throw error;
        }
        
        this.showStatusMessage(`Running ${testFiles.length} test files in parallel...`);
        
        const scriptArgs = this.buildScriptArgs(options, [
            '--concurrency', options.args?.includes('--concurrency') ? 'auto' : 'auto'
        ]);
        
        const input = testFiles.join('\n');
        
        try {
            const result = await this.executeScript('ai-debug-parallel-tests', scriptArgs, {
                ...options,
                input
            });
            
            if (result.success) {
                this.showStatusMessage(`✅ Parallel tests completed in ${result.duration}s`);
                vscode.window.showInformationMessage(`All ${testFiles.length} test files passed!`);
            } else {
                this.showStatusMessage(`❌ Parallel tests failed in ${result.duration}s`);
                // Don't show generic error - let structured error handling provide details
            }
            
            return result;
        } catch (error) {
            const structuredError = error instanceof ShellScriptError 
                ? error 
                : new ShellScriptError('ai-debug-parallel-tests', 1, String(error), { 
                    operation: 'runParallelTests',
                    testFileCount: testFiles.length,
                    testFiles: testFiles.slice(0, 5) // First 5 files for context
                });
            
            this.errorHandler.showUserError(structuredError, vscode);
            throw structuredError;
        }
    }

    /**
     * Start file watching using shell script
     * 
     * Monitors files for changes and automatically runs affected tests.
     * 
     * @param watchDirectory - Directory to watch (defaults to workspace root)
     * @param options - Execution options including debounce time
     * @returns Promise resolving when file watching starts
     */
    async startFileWatcher(watchDirectory?: string, options: ScriptOptions = {}): Promise<void> {
        const watchDir = watchDirectory || this.workspaceRoot;
        
        this.showStatusMessage('Starting file watcher...');
        
        const scriptArgs = this.buildScriptArgs(options, [
            '--debounce', '2',  // Default 2 second debounce
            watchDir
        ]);
        
        try {
            // File watcher runs indefinitely, so we don't await the result
            this.executeScriptAsync('ai-debug-watch', scriptArgs, options);
            
            this.showStatusMessage('📁 File watcher started');
            vscode.window.showInformationMessage('File watcher started. Tests will run automatically on file changes.');
            
        } catch (error) {
            const errorMessage = `Failed to start file watcher: ${error}`;
            this.showError(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Stop any currently running script
     */
    stopCurrentExecution(): void {
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
            this.currentProcess = null;
            this.showStatusMessage('⏹️ Execution stopped');
            vscode.window.showInformationMessage('Script execution stopped.');
        }
    }

    /**
     * Get script execution status
     */
    isExecuting(): boolean {
        return this.currentProcess !== null;
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.stopCurrentExecution();
        
        // Kill all tracked processes
        for (const process of this.processRegistry) {
            if (!process.killed) {
                process.kill('SIGTERM');
                // Give processes a moment to terminate gracefully
                setTimeout(() => {
                    if (!process.killed) {
                        process.kill('SIGKILL');
                    }
                }, 1000);
            }
        }
        
        this.processRegistry.clear();
        this.outputChannel.dispose();
    }

    /**
     * Validate that script directory exists and contains required scripts
     */
    private validateScriptDirectory(): void {
        this.outputChannel.appendLine(`🔍 Checking script directory: ${this.scriptDir}`);
        this.outputChannel.appendLine(`   Extension path provided: ${this.scriptDir.includes('extensions') ? 'YES' : 'NO'}`);
        this.outputChannel.appendLine(`   Directory exists: ${fs.existsSync(this.scriptDir)}`);
        
        if (!fs.existsSync(this.scriptDir)) {
            this.outputChannel.appendLine(`❌ Script directory not found at: ${this.scriptDir}`);
            throw new FileSystemError(
                'directory_check',
                this.scriptDir,
                new Error('ENOENT: Script directory not found'),
                { expectedScripts: ['ai-debug-affected-tests', 'ai-debug-parallel-tests', 'ai-debug-watch'] }
            );
        }

        const requiredScripts = [
            'ai-debug-affected-tests',
            'ai-debug-parallel-tests', 
            'ai-debug-watch'
        ];

        for (const script of requiredScripts) {
            const scriptPath = path.join(this.scriptDir, script);
            if (!fs.existsSync(scriptPath)) {
                throw new FileSystemError(
                    'script_check',
                    scriptPath,
                    new Error('ENOENT: Required script not found'),
                    { scriptName: script, scriptDir: this.scriptDir }
                );
            }
            
            // Check if script is executable
            try {
                fs.accessSync(scriptPath, fs.constants.X_OK);
            } catch (error) {
                throw new FileSystemError(
                    'script_permission',
                    scriptPath,
                    error as Error,
                    { scriptName: script, hint: 'Run chmod +x ' + scriptPath }
                );
            }
        }
    }

    /**
     * Validate input to prevent command injection
     */
    private validateInput(input: string, fieldName: string): void {
        // Check for dangerous characters that could be used for command injection
        const dangerousPatterns = [
            /[;&|`$(){}[\]<>]/,  // Shell metacharacters
            /\.\./,              // Directory traversal
            /^\s*-/,             // Arguments that start with dash (could be confused as options)
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(input)) {
                throw new ValidationError(
                    fieldName,
                    input,
                    'Input contains potentially dangerous characters',
                    { 
                        detectedPattern: pattern.toString(),
                        safeAlternatives: 'Use alphanumeric characters, underscores, and hyphens only'
                    }
                );
            }
        }

        // Validate length
        if (input.length > 1000) {
            throw new ValidationError(
                fieldName,
                input.slice(0, 50) + '...',
                'Input too long (max 1000 characters)',
                { actualLength: input.length }
            );
        }
    }

    /**
     * Validate array of test file paths
     */
    private validateTestFiles(testFiles: string[]): void {
        if (testFiles.length > 100) {
            throw new ValidationError(
                'testFiles',
                `${testFiles.length} files`,
                'Too many test files (max 100 at once)',
                { 
                    suggestion: 'Run tests in smaller batches',
                    actualCount: testFiles.length
                }
            );
        }

        for (const file of testFiles) {
            this.validateInput(file, 'testFile');
            
            // Ensure file has valid test extension
            if (!file.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/)) {
                throw new ValidationError(
                    'testFile',
                    file,
                    'File does not appear to be a test file',
                    { expectedExtensions: '.test.ts, .spec.ts, .test.js, .spec.js' }
                );
            }
        }
    }

    /**
     * Build script arguments from options
     */
    private buildScriptArgs(options: ScriptOptions, defaultArgs: string[] = []): string[] {
        const args = [...defaultArgs];
        
        if (options.verbose) {
            args.push('--verbose');
        }
        
        if (options.args) {
            args.push(...options.args);
        }
        
        return args;
    }

    /**
     * Execute shell script and return result
     */
    async executeScript(
        scriptName: string,
        args: string[] = [],
        options: ScriptOptions = {}
    ): Promise<ScriptResult> {
        return new Promise(async (resolve, reject) => {
            const scriptPath = path.join(this.scriptDir, scriptName);
            const startTime = Date.now();
            
            let stdout = '';
            let stderr = '';
            
            this.showOutput(`Executing: ${scriptName} ${args.join(' ')}`);
            
            // Get macOS environment for proper tool paths
            try {
                const env = await this.macosCompat.detectEnvironment();
                const enhancedEnv = {
                    ...process.env,
                    PATH: `${env.homebrewPrefix}/bin:${process.env.PATH}`,
                    AI_DEBUG_MACOS_COMPAT: 'true'
                };

                const childProcess = spawn(scriptPath, args, {
                    cwd: options.cwd || this.workspaceRoot,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: enhancedEnv
                });

                this.currentProcess = childProcess;
                this.processRegistry.add(childProcess);

                // Ensure process cleanup
                childProcess.on('close', () => {
                    this.processRegistry.delete(childProcess);
                });

                childProcess.on('error', () => {
                    this.processRegistry.delete(childProcess);
                });

                // Handle input if provided
            if (options.input) {
                childProcess.stdin?.write(options.input);
                childProcess.stdin?.end();
            }

            // Collect stdout
            childProcess.stdout?.on('data', (data: Buffer) => {
                const output = data.toString();
                stdout += output;
                this.showOutput(output);
            });

            // Collect stderr
            childProcess.stderr?.on('data', (data: Buffer) => {
                const error = data.toString();
                stderr += error;
                this.showOutput(error, true);
            });

            // Handle process completion
            childProcess.on('close', (code: number | null) => {
                this.currentProcess = null;
                const duration = Math.round((Date.now() - startTime) / 1000);
                
                const result: ScriptResult = {
                    exitCode: code || 0,
                    stdout,
                    stderr,
                    duration,
                    success: (code || 0) === 0
                };
                
                // If script failed, create structured error with details
                if (!result.success) {
                    const error = new ShellScriptError(
                        scriptName,
                        result.exitCode,
                        result.stderr || 'Script failed with no error output',
                        { 
                            args,
                            duration,
                            stdout: result.stdout.slice(0, 500), // Truncate for context
                            cwd: options.cwd || this.workspaceRoot
                        }
                    );
                    reject(error);
                } else {
                    resolve(result);
                }
            });

            // Handle process errors (spawn/execution errors)
            childProcess.on('error', (error: Error) => {
                this.currentProcess = null;
                const duration = Math.round((Date.now() - startTime) / 1000);
                
                // Create specific error based on error type
                let structuredError: ShellScriptError;
                
                if (error.message.includes('ENOENT')) {
                    structuredError = new ShellScriptError(
                        scriptName,
                        127, // Command not found
                        `Script not found: ${scriptPath}`,
                        { args, duration, originalError: error.message }
                    );
                } else if (error.message.includes('EACCES')) {
                    structuredError = new ShellScriptError(
                        scriptName,
                        126, // Permission denied
                        `Permission denied: ${scriptPath}`,
                        { args, duration, originalError: error.message }
                    );
                } else {
                    structuredError = new ShellScriptError(
                        scriptName,
                        1,
                        error.message,
                        { args, duration, originalError: error.message }
                    );
                }
                
                reject(structuredError);
            });

                // Handle timeout
                if (options.timeout && options.timeout > 0) {
                    setTimeout(() => {
                        if (this.currentProcess === childProcess) {
                            childProcess.kill('SIGTERM');
                            const timeoutError = new ShellScriptError(
                                scriptName,
                                124, // Timeout exit code
                                `Script execution timed out after ${options.timeout}s`,
                                { 
                                    args,
                                    timeoutSeconds: options.timeout,
                                    stdout: stdout.slice(0, 500),
                                    stderr: stderr.slice(0, 500)
                                }
                            );
                            reject(timeoutError);
                        }
                    }, options.timeout * 1000);
                }
            } catch (error) {
                // Handle macOS environment detection errors
                this.currentProcess = null;
                const duration = Math.round((Date.now() - startTime) / 1000);
                const structuredError = new ShellScriptError(
                    scriptName,
                    1,
                    `Environment detection failed: ${error}`,
                    { args, duration, originalError: String(error) }
                );
                reject(structuredError);
            }
        });
    }

    /**
     * Execute shell script asynchronously (for long-running processes like file watcher)
     */
    private executeScriptAsync(
        scriptName: string,
        args: string[] = [],
        options: ScriptOptions = {}
    ): void {
        const scriptPath = path.join(this.scriptDir, scriptName);
        
        this.showOutput(`Starting: ${scriptName} ${args.join(' ')}`);
        
        const childProcess = spawn(scriptPath, args, {
            cwd: options.cwd || this.workspaceRoot,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env }
        });

        this.currentProcess = childProcess;

        // Handle input if provided
        if (options.input) {
            childProcess.stdin?.write(options.input);
            childProcess.stdin?.end();
        }

        // Stream stdout to output channel
        childProcess.stdout?.on('data', (data: Buffer) => {
            this.showOutput(data.toString());
        });

        // Stream stderr to output channel
        childProcess.stderr?.on('data', (data: Buffer) => {
            this.showOutput(data.toString(), true);
        });

        // Handle process completion
        childProcess.on('close', (code: number | null) => {
            this.currentProcess = null;
            if (code !== 0) {
                this.showError(`${scriptName} exited with code ${code}`);
            }
        });

        // Handle process errors
        childProcess.on('error', (error: Error) => {
            this.currentProcess = null;
            this.showError(`${scriptName} error: ${error.message}`);
        });
    }

    /**
     * Show output in VSCode output panel
     */
    private showOutput(output: string, isError: boolean = false): void {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = isError ? '[ERROR]' : '[INFO]';
        const formattedOutput = `${timestamp} ${prefix} ${output}`;
        
        this.outputChannel.appendLine(formattedOutput);
        
        // Auto-show output panel for errors
        if (isError) {
            this.outputChannel.show(true);
        }
    }

    /**
     * Show error message
     */
    private showError(error: string): void {
        this.showOutput(error, true);
        vscode.window.showErrorMessage(`AI Debug Context: ${error}`);
    }

    /**
     * Show status bar message
     */
    private showStatusMessage(message: string): void {
        vscode.window.setStatusBarMessage(`AI Debug: ${message}`, 3000);
    }
}