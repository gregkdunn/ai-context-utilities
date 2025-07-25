/**
 * Test action utilities for handling test results and providing user actions
 * Part of Phase 1.7 immediate wins - Add re-run failed tests capability
 */

import * as vscode from 'vscode';
import { TestSummary, TestFailure, TestResultParser } from './testResultParser';
import { UserFriendlyErrors } from './userFriendlyErrors';
import { LegacyStyleFormatter } from './legacyStyleFormatter';

export interface TestActionOptions {
    outputChannel: vscode.OutputChannel;
    workspaceRoot: string;
    testCommand?: string; // Default: 'npx nx test'
    rawOutput?: string; // For detecting Nx cloud URLs
}

export class TestActions {
    private outputChannel: vscode.OutputChannel;
    private workspaceRoot: string;
    private testCommand: string;
    private currentPopupPromise: Thenable<string | undefined> | null = null;
    private lastPopupTime: number = 0;
    private currentRawOutput: string = '';
    
    constructor(options: TestActionOptions) {
        this.outputChannel = options.outputChannel;
        this.workspaceRoot = options.workspaceRoot;
        this.testCommand = options.testCommand || 'npx nx test';
        this.currentRawOutput = options.rawOutput || '';
    }
    
    /**
     * Extract Nx cloud URL from raw output
     */
    private extractNxCloudUrl(rawOutput: string): string | null {
        const nxCloudPattern = /View structured, searchable error logs at (https:\/\/cloud\.nx\.app\/runs\/[a-zA-Z0-9]+)/g;
        const match = nxCloudPattern.exec(rawOutput);
        return match ? match[1] : null;
    }
    
    /**
     * Update raw output for URL detection
     */
    updateRawOutput(rawOutput: string): void {
        this.currentRawOutput = rawOutput;
    }
    
    /**
     * Show test result with actionable options
     */
    async showTestResult(result: TestSummary): Promise<void> {
        const summary = TestResultParser.formatSummary(result);
        this.outputChannel.appendLine(`\n${summary}`);
        
        if (result.success) {
            this.showSuccessResult(result);
        } else {
            await this.showFailureResult(result);
        }
    }
    
    /**
     * Show successful test result
     */
    private showSuccessResult(result: TestSummary): void {
        if (!this.shouldShowPopup()) {
            // Just log to output if popup is suppressed
            this.outputChannel.appendLine(`✅ ${result.project}: All tests passed!`);
            return;
        }
        
        this.currentPopupPromise = vscode.window.showInformationMessage(
            `✅ ${result.project}: All tests passed!`,
            'View Output'
        );
        
        this.currentPopupPromise.then(selection => {
            if (selection === 'View Output') {
                this.outputChannel.show();
            }
            this.currentPopupPromise = null;
        });
    }
    
    /**
     * Show failed test result with action options
     */
    private async showFailureResult(result: TestSummary): Promise<void> {
        // Show detailed failures in output
        if (result.failures.length > 0) {
            this.outputChannel.appendLine('\nFailed tests:');
            const failureDetails = TestResultParser.formatFailures(result.failures);
            this.outputChannel.appendLine(failureDetails);
        }
        
        // Check if we should show popup
        if (!this.shouldShowPopup()) {
            // Just log to output if popup is suppressed
            const message = UserFriendlyErrors.testsFailed(result.project, result.failed, result.total);
            this.outputChannel.appendLine(`❌ ${message}`);
            return;
        }
        
        // Show actionable notification
        const message = UserFriendlyErrors.testsFailed(result.project, result.failed, result.total);
        
        const actions = ['Re-run Failed', 'Re-run All', 'View Output'];
        if (result.failures.length > 0) {
            actions.unshift('Debug First Failure');
        }
                
        this.currentPopupPromise = vscode.window.showErrorMessage(message, ...actions);
        const selection = await this.currentPopupPromise;
        this.currentPopupPromise = null;
        
        switch (selection) {
            case 'Re-run Failed':
                await this.rerunFailedTests(result);
                break;
            case 'Re-run All':
                await this.rerunAllTests(result.project);
                break;
            case 'Debug First Failure':
                await this.debugFirstFailure(result);
                break;
            case 'View Output':
                this.outputChannel.show();
                break;
        }
    }
    
    /**
     * Check if we should show a new popup or if one is already active
     */
    private shouldShowPopup(): boolean {
        const now = Date.now();
        const timeSinceLastPopup = now - this.lastPopupTime;
        
        // Don't show new popup if:
        // 1. There's already one active
        // 2. Less than 1 second has passed since the last popup
        if (this.currentPopupPromise || timeSinceLastPopup < 1000) {
            return false;
        }
        
        this.lastPopupTime = now;
        return true;
    }
    
    /**
     * Dismiss any currently showing popup to prevent multiple popups
     */
    private dismissCurrentPopup(): void {
        if (this.currentPopupPromise) {
            // Note: VSCode doesn't provide a direct way to dismiss modal dialogs,
            // but tracking the promise helps us avoid showing multiple popups
            // The user can still interact with the previous one, but new ones won't stack
            this.currentPopupPromise = null;
        }
    }
    
    /**
     * Clean ANSI escape sequences more thoroughly
     */
    private cleanAnsiSequences(text: string): string {
        return text
            // Remove color codes and formatting
            .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
            // Remove bold/formatting sequences like [1m and [22m
            .replace(/\[[0-9]+m/g, '')
            // Remove specific sequences
            .replace(/\[22m/g, '')
            .replace(/\[1m/g, '')
            // Remove bullet characters and other formatting
            .replace(/●\s*/g, '')
            // Remove carriage returns
            .replace(/\r/g, '')
            // Clean up extra spaces
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Process real-time output with ANSI cleaning and formatting
     */
    private processRealTimeOutput(output: string): void {
        const lines = output.split('\n');
        
        for (const line of lines) {
            const cleanedLine = this.cleanAnsiSequences(line);
            const trimmedLine = cleanedLine.trim();
            
            // Skip empty lines
            if (!trimmedLine) continue;
            
            // Show test file start/completion
            if (trimmedLine.startsWith('PASS ') || trimmedLine.startsWith('FAIL ')) {
                const status = trimmedLine.startsWith('PASS ') ? '✅' : '❌';
                const fileMatch = trimmedLine.match(/(PASS|FAIL)\s+(.+\.spec\.ts)/);
                if (fileMatch) {
                    const fileName = fileMatch[2].split('/').pop() || fileMatch[2];
                    this.outputChannel.appendLine(`   ${status} ${fileName}`);
                }
            }
            
            // Show test suite names (but filter out ANSI artifacts)
            else if (trimmedLine && 
                    !trimmedLine.startsWith('npm') && 
                    !trimmedLine.startsWith('>') && 
                    !trimmedLine.includes('nx test') &&
                    !trimmedLine.includes('nx run') &&
                    !trimmedLine.includes('RUNS') &&
                    !trimmedLine.includes('RUN') &&
                    !trimmedLine.includes('NX') &&
                    !trimmedLine.includes('Test suite failed') &&
                    !trimmedLine.includes('DeprecationWarning') &&
                    !trimmedLine.includes('node_modules') &&
                    trimmedLine.match(/^[A-Z][a-zA-Z\s]+[a-zA-Z]$/) &&
                    trimmedLine.length > 3 && trimmedLine.length < 50) {
                this.outputChannel.appendLine(`   📁 ${trimmedLine}`);
            }
            
            // Show compilation errors (cleaned)  
            else if (trimmedLine.includes('Test suite failed to run') ||
                    trimmedLine.includes('error TS') ||
                    trimmedLine.includes('Cannot find module') ||
                    trimmedLine.includes('SyntaxError')) {
                // Clean the error message thoroughly
                const cleanError = trimmedLine
                    .replace(/Test suite failed to run\s*/g, 'Test suite failed to run')
                    .trim();
                if (cleanError && cleanError !== 'Test suite failed to run') {
                    this.outputChannel.appendLine(`   🔥 ${cleanError}`);
                }
            }
            
            // Show important summary lines
            else if (trimmedLine.includes('Test Suites:') || trimmedLine.includes('Tests:') || trimmedLine.includes('Time:')) {
                this.outputChannel.appendLine(`   📊 ${trimmedLine}`);
            }
            
            // Show Nx cloud URLs
            else if (trimmedLine.includes('View structured, searchable error logs at https://cloud.nx.app')) {
                this.outputChannel.appendLine(`   🔗 ${trimmedLine}`);
            }
            
            // Show key command outputs
            else if (trimmedLine.startsWith('> nx run ')) {
                this.outputChannel.appendLine(`   ⚡ ${trimmedLine}`);
            }
        }
    }
    
    /**
     * Re-run only the failed tests
     */
    async rerunFailedTests(result: TestSummary): Promise<void> {
        if (result.failures.length === 0) {
            vscode.window.showInformationMessage('No failed tests to re-run');
            return;
        }
        
        const patterns = TestResultParser.getFailedTestPatterns(result.failures);
        const testPattern = patterns.join('|');
        
        this.outputChannel.appendLine(`\n🔄 Re-running ${result.failures.length} failed test(s)...`);
        
        try {
            const command = `${this.testCommand} ${result.project} --testNamePattern="${testPattern}"`;
            await this.executeTestCommand(command, `Re-running failed tests for ${result.project}`);
        } catch (error) {
            const errorMsg = UserFriendlyErrors.testCommandFailed(result.project, this.testCommand);
            this.outputChannel.appendLine(`❌ ${errorMsg}`);
            vscode.window.showErrorMessage(errorMsg);
        }
    }
    
    /**
     * Re-run all tests for the project
     */
    async rerunAllTests(project: string): Promise<void> {
        this.outputChannel.appendLine(`\n🔄 Re-running all tests for ${project}...`);
        
        try {
            const command = `${this.testCommand} ${project}`;
            await this.executeTestCommand(command, `Re-running all tests for ${project}`);
        } catch (error) {
            const errorMsg = UserFriendlyErrors.testCommandFailed(project, this.testCommand);
            this.outputChannel.appendLine(`❌ ${errorMsg}`);
            vscode.window.showErrorMessage(errorMsg);
        }
    }
    
    /**
     * Debug the first failed test
     */
    async debugFirstFailure(result: TestSummary): Promise<void> {
        if (result.failures.length === 0) {
            vscode.window.showInformationMessage('No failed tests to debug');
            return;
        }
        
        const firstFailure = result.failures[0];
        const patterns = TestResultParser.getFailedTestPatterns([firstFailure]);
        const testPattern = patterns[0];
        
        this.outputChannel.appendLine(`\n🐛 Debugging test: ${firstFailure.test}`);
        
        try {
            // Run with inspect flag for debugging
            const command = `${this.testCommand} ${result.project} --testNamePattern="${testPattern}" --inspect`;
            await this.executeTestCommand(command, `Debugging test: ${firstFailure.test}`);
        } catch (error) {
            // Fallback without inspect flag
            this.outputChannel.appendLine('Debug mode failed, running normal test...');
            try {
                const fallbackCommand = `${this.testCommand} ${result.project} --testNamePattern="${testPattern}"`;
                await this.executeTestCommand(fallbackCommand, `Running single test: ${firstFailure.test}`);
            } catch (fallbackError) {
                const errorMsg = UserFriendlyErrors.testCommandFailed(result.project, this.testCommand);
                this.outputChannel.appendLine(`❌ ${errorMsg}`);
                vscode.window.showErrorMessage(errorMsg);
            }
        }
    }
    
    /**
     * Execute test command with proper output handling
     */
    private async executeTestCommand(command: string, description: string): Promise<string> {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            
            // Add clear borders for test run
            this.outputChannel.appendLine('\n' + '='.repeat(80));
            this.outputChannel.appendLine(`🔄 ${description.toUpperCase()}`);
            this.outputChannel.appendLine('='.repeat(80));
            this.outputChannel.appendLine(`🧪 Running: ${command}`);
            this.outputChannel.appendLine('');
            this.outputChannel.show();
            
            const args = command.split(' ');
            const cmd = args.shift()!;
            
            const child = spawn(cmd, args, {
                cwd: this.workspaceRoot,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout?.on('data', (data: Buffer) => {
                const output = data.toString();
                stdout += output;
                // Process real-time output with ANSI cleaning
                this.processRealTimeOutput(output);
            });
            
            child.stderr?.on('data', (data: Buffer) => {
                const output = data.toString();
                stderr += output;
                // Process real-time output with ANSI cleaning
                this.processRealTimeOutput(output);
            });
            
            child.on('close', (code: number) => {
                const endTime = Date.now();
                const duration = ((endTime - startTime) / 1000).toFixed(1);
                
                // Parse test results if this was a test run
                if (command.includes('test ')) {
                    const projectMatch = command.match(/test\s+([^\s]+)/);
                    if (projectMatch) {
                        const testSummary = TestResultParser.parseNxOutput(stdout + stderr, projectMatch[1]);
                        testSummary.duration = parseFloat(duration);
                        
                        // Ensure consistency - if exit code is 1, mark as failed
                        if (code === 1) {
                            testSummary.success = false;
                            if (testSummary.failed === 0 && testSummary.failures.length === 0) {
                                testSummary.failed = 1;
                                testSummary.total = Math.max(testSummary.total, 1);
                            }
                        }
                        
                        // Create legacy-style formatted output
                        const formattedReport = LegacyStyleFormatter.formatTestReport(testSummary, {
                            command: command,
                            exitCode: code,
                            rawOutput: stdout + stderr,
                            optimized: true
                        });
                        
                        // Display the formatted report
                        this.outputChannel.appendLine('\n' + formattedReport);
                        
                        // Show status banner
                        const statusBanner = LegacyStyleFormatter.createStatusBanner(testSummary);
                        this.outputChannel.appendLine('\n' + statusBanner);
                        
                        // Update raw output for Nx cloud URL detection
                        this.updateRawOutput(stdout + stderr);
                        
                        // Show popup for failures
                        if (!testSummary.success) {
                            this.showTestResult(testSummary);
                        } else if (this.shouldShowPopup()) {
                            this.currentPopupPromise = vscode.window.showInformationMessage(
                                `✅ ${testSummary.project}: All tests now passing!`
                            );
                            this.currentPopupPromise.then(() => {
                                this.currentPopupPromise = null;
                            });
                        }
                    }
                }
                
                // Add closing border
                this.outputChannel.appendLine('\n' + '='.repeat(80));
                if (code === 0) {
                    this.outputChannel.appendLine(`✅ ${description.toUpperCase()} COMPLETED SUCCESSFULLY (${duration}s)`);
                    resolve(stdout);
                } else {
                    this.outputChannel.appendLine(`❌ ${description.toUpperCase()} FAILED (EXIT CODE ${code}) (${duration}s)`);
                    reject(new Error(`Command failed with exit code ${code}: ${stderr || stdout}`));
                }
                this.outputChannel.appendLine('='.repeat(80) + '\n');
            });
            
            child.on('error', (error: Error) => {
                this.outputChannel.appendLine(`\n❌ Failed to execute command: ${error.message}`);
                reject(error);
            });
        });
    }
    
    /**
     * Create a quick action for common test operations
     */
    static async showQuickActions(project: string, options: TestActionOptions): Promise<void> {
        const actions = [
            {
                label: '🧪 Run All Tests',
                detail: `Run all tests for ${project}`,
                action: 'run-all'
            },
            {
                label: '👀 Watch Tests',
                detail: `Start test watcher for ${project}`,
                action: 'watch'
            },
            {
                label: '🔍 Run Specific Test',
                detail: 'Enter test name pattern to run',
                action: 'specific'
            },
            {
                label: '📊 Test Coverage',
                detail: `Generate coverage report for ${project}`,
                action: 'coverage'
            }
        ];
        
        const selection = await vscode.window.showQuickPick(actions, {
            placeHolder: `Select test action for ${project}`,
            ignoreFocusOut: true
        });
        
        if (!selection) return;
        
        const testActions = new TestActions(options);
        
        switch (selection.action) {
            case 'run-all':
                await testActions.rerunAllTests(project);
                break;
            case 'watch':
                await testActions.startWatchMode(project);
                break;
            case 'specific':
                await testActions.runSpecificTest(project);
                break;
            case 'coverage':
                await testActions.runWithCoverage(project);
                break;
        }
    }
    
    /**
     * Start watch mode for a project
     */
    async startWatchMode(project: string): Promise<void> {
        const command = `${this.testCommand} ${project} --watch`;
        this.outputChannel.appendLine(`\n👀 Starting watch mode for ${project}...`);
        this.outputChannel.appendLine('Press Ctrl+C in terminal to stop watching\n');
        
        // Open terminal to run watch command
        const terminal = vscode.window.createTerminal(`Test Watch: ${project}`);
        terminal.sendText(`cd "${this.workspaceRoot}" && ${command}`);
        terminal.show();
    }
    
    /**
     * Run specific test by pattern
     */
    async runSpecificTest(project: string): Promise<void> {
        const testPattern = await vscode.window.showInputBox({
            prompt: 'Enter test name or pattern to run',
            placeHolder: 'e.g., "should handle login" or "UserService"',
            ignoreFocusOut: true
        });
        
        if (!testPattern) return;
        
        try {
            const command = `${this.testCommand} ${project} --testNamePattern="${testPattern}"`;
            await this.executeTestCommand(command, `Running tests matching: ${testPattern}`);
        } catch (error) {
            const errorMsg = UserFriendlyErrors.testCommandFailed(project, this.testCommand);
            this.outputChannel.appendLine(`❌ ${errorMsg}`);
            vscode.window.showErrorMessage(errorMsg);
        }
    }
    
    /**
     * Run tests with coverage
     */
    async runWithCoverage(project: string): Promise<void> {
        try {
            const command = `${this.testCommand} ${project} --coverage`;
            await this.executeTestCommand(command, `Running tests with coverage for ${project}`);
        } catch (error) {
            const errorMsg = UserFriendlyErrors.testCommandFailed(project, this.testCommand);
            this.outputChannel.appendLine(`❌ ${errorMsg}`);
            vscode.window.showErrorMessage(errorMsg);
        }
    }
}