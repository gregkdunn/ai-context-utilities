/**
 * Test action utilities for handling test results and providing user actions
 * Part of Phase 1.7 immediate wins - Add re-run failed tests capability
 */

import * as vscode from 'vscode';
import { TestSummary, TestFailure, TestResultParser } from './testResultParser';
import { UserFriendlyErrors } from './userFriendlyErrors';
import { LegacyStyleFormatter } from './legacyStyleFormatter';
import { ContextCompiler } from '../modules/aiContext/ContextCompiler';

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
     * Build test command with proper project substitution
     */
    private buildTestCommand(project: string, additionalArgs?: string): string {
        let command = this.testCommand;
        
        // If command contains {project} placeholder, replace it
        if (command.includes('{project}')) {
            command = command.replace('{project}', project);
        } else {
            // Otherwise, append project name
            command = `${command} ${project}`;
        }
        
        // Add additional arguments if provided
        if (additionalArgs) {
            command += ` ${additionalArgs}`;
        }
        
        return command;
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
        
        // Show actionable notification with new button order
        const message = `${result.project}: ${result.failed} tests failed (${result.failed} of ${result.total}). Click for details and options.`;
        
        // New order: 1. Copilot Debug, 2. Rerun Tests, 3. View Test Results
        const actions = ['Copilot Debug', 'Rerun Tests', 'View Test Results'];
                
        this.currentPopupPromise = vscode.window.showErrorMessage(message, ...actions);
        const selection = await this.currentPopupPromise;
        this.currentPopupPromise = null;
        
        switch (selection) {
            case 'Copilot Debug':
                await this.copilotDebugTests(result);
                break;
            case 'Rerun Tests':
                await this.rerunAllTests(result.project);
                break;
            case 'View Test Results':
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
     * Open Copilot Chat for test debugging assistance
     */
    async copilotDebugTests(result: TestSummary): Promise<void> {
        try {
            this.outputChannel.appendLine(`\n🤖 Starting Copilot debug session for ${result.project}...`);
            
            // First, try to compile fresh AI context using ContextCompiler
            const formattedContext = await this.compileAIDebugContext(result);
            
            if (formattedContext) {
                // Send the properly formatted context to Copilot Chat
                await this.sendToCopilotChat(formattedContext);
                this.outputChannel.appendLine('🤖 Formatted AI debug context sent to Copilot Chat');
            } else {
                // Fallback: try reading existing context file
                const existingContext = await this.readAIDebugContext();
                
                if (existingContext) {
                    await this.sendToCopilotChat(existingContext);
                    this.outputChannel.appendLine('🤖 Existing AI debug context sent to Copilot Chat');
                } else {
                    // Final fallback to generated prompt
                    const contextPrompt = this.buildCopilotDebugPrompt(result);
                    await this.sendToCopilotChat(contextPrompt);
                    this.outputChannel.appendLine('🤖 Generated debug prompt sent to Copilot Chat');
                }
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to start Copilot debug session: ${error}`);
            vscode.window.showErrorMessage('Failed to start Copilot debug session');
        }
    }

    /**
     * Compile properly formatted AI debug context using ContextCompiler
     */
    private async compileAIDebugContext(result: TestSummary): Promise<string | null> {
        try {
            const contextCompiler = new ContextCompiler({
                workspaceRoot: this.workspaceRoot,
                outputChannel: this.outputChannel
            });

            // Determine if tests passed based on result
            const testPassed = result.success;
            
            // Compile debug context with proper formatting and prompts
            const context = await contextCompiler.compileContext('debug', testPassed);
            
            return context;
            
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to compile AI context: ${error}`);
            return null;
        }
    }

    /**
     * Read ai_debug_context.txt file content
     */
    private async readAIDebugContext(): Promise<string | null> {
        try {
            const fs = require('fs');
            const path = require('path');
            
            // Look for ai_debug_context.txt in the standard location
            const contextDir = path.join(this.workspaceRoot, '.github', 'instructions', 'ai_debug_context');
            const contextFiles = ['ai_debug_context.txt', 'ai_context.txt', 'context.txt'];
            
            for (const fileName of contextFiles) {
                const filePath = path.join(contextDir, fileName);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.trim()) {
                        this.outputChannel.appendLine(`📖 Reading context from: ${fileName}`);
                        return content;
                    }
                }
            }
            
            this.outputChannel.appendLine('⚠️ No AI debug context file found, using generated prompt');
            return null;
            
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to read AI debug context: ${error}`);
            return null;
        }
    }

    /**
     * Send content to Copilot Chat and submit it
     */
    private async sendToCopilotChat(content: string): Promise<void> {
        try {
            // First, open Copilot Chat
            const opened = await this.openCopilotChat();
            
            if (!opened) {
                // Fallback: copy to clipboard and show instructions
                await vscode.env.clipboard.writeText(content);
                vscode.window.showInformationMessage(
                    'Could not open Copilot Chat automatically. Content copied to clipboard - please paste manually.'
                );
                return;
            }
            
            // Wait for Copilot Chat to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try to send the content directly using various VS Code APIs
            const success = await this.trySendContentToCopilot(content);
            
            if (!success) {
                // Fallback: copy to clipboard and notify user
                await vscode.env.clipboard.writeText(content);
                vscode.window.showInformationMessage(
                    'Copilot Chat opened. Content copied to clipboard - paste with Ctrl+V and press Enter.'
                );
            }
            
        } catch (error) {
            // Final fallback
            await vscode.env.clipboard.writeText(content);
            vscode.window.showInformationMessage(
                'Content copied to clipboard. Please open Copilot Chat manually and paste.'
            );
        }
    }

    /**
     * Try different methods to send content to Copilot Chat
     */
    private async trySendContentToCopilot(content: string): Promise<boolean> {
        // Method 1: Try VS Code Chat API (VS Code 1.85+)
        try {
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: content
            });
            return true;
        } catch (error) {
            // Continue to next method
        }

        // Method 2: Try GitHub Copilot's chat API
        try {
            await vscode.commands.executeCommand('github.copilot.chat.newSession', {
                query: content
            });
            return true;
        } catch (error) {
            // Continue to next method
        }

        // Method 3: Try Copilot chat insert command
        try {
            await vscode.commands.executeCommand('github.copilot.chat.insertIntoChat', content);
            await new Promise(resolve => setTimeout(resolve, 500));
            await vscode.commands.executeCommand('workbench.action.acceptSelectedSuggestion');
            return true;
        } catch (error) {
            // Continue to next method
        }

        // Method 4: Try direct chat API with submission
        try {
            await vscode.commands.executeCommand('vscode.chat.sendMessage', {
                providerId: 'copilot',
                message: content
            });
            return true;
        } catch (error) {
            // Continue to next method
        }

        // Method 5: Copy to clipboard and simulate keyboard input
        try {
            await vscode.env.clipboard.writeText(content);
            
            // Focus on Copilot Chat and simulate paste + enter
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Try various paste commands
            const pasteCommands = [
                'editor.action.clipboardPasteAction',
                'workbench.action.terminal.paste',
                'paste'
            ];
            
            for (const pasteCmd of pasteCommands) {
                try {
                    await vscode.commands.executeCommand(pasteCmd);
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // Try to submit with various enter commands
                    const submitCommands = [
                        'workbench.action.acceptSelectedSuggestion',
                        'chat.action.submit',
                        'enterkey'
                    ];
                    
                    for (const submitCmd of submitCommands) {
                        try {
                            await vscode.commands.executeCommand(submitCmd);
                            return true;
                        } catch (submitError) {
                            continue;
                        }
                    }
                } catch (pasteError) {
                    continue;
                }
            }
        } catch (error) {
            // Continue to final fallback
        }

        return false;
    }

    /**
     * Build comprehensive Copilot debug prompt for test failures
     */
    private buildCopilotDebugPrompt(result: TestSummary): string {
        const prompt = `# 🤖 Test Failure Analysis Request

I need help debugging test failures in **${result.project}**. Here's the current situation:

## 📊 Test Summary
- **Failed Tests**: ${result.failed} of ${result.total}
- **Project**: ${result.project}
- **Duration**: ${result.duration || 'N/A'}s

## ❌ Failed Tests
${result.failures.map((failure, index) => 
    `### ${index + 1}. ${failure.test}
**Suite**: ${failure.suite || 'Unknown'}
**Error**: 
\`\`\`
${failure.error}
\`\`\`
${failure.file ? `**File**: ${failure.file}` : ''}
${failure.line ? `**Line**: ${failure.line}` : ''}`
).join('\n')}

## 🎯 What I need:

1. **🔧 Root Cause Analysis**: What's causing these test failures?

2. **💡 Specific Fixes**: Provide actionable code fixes with examples

3. **🧪 Test Improvements**: Suggest better test patterns to prevent similar issues

4. **📝 PR Description**: Help me write a clear PR description for these fixes

5. **🚀 Best Practices**: Recommend testing best practices for this project

Please provide specific, actionable suggestions with code examples where helpful.`;

        return prompt;
    }

    /**
     * Try to open Copilot Chat
     */
    private async openCopilotChat(): Promise<boolean> {
        try {
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            return true;
        } catch {
            try {
                await vscode.commands.executeCommand('github.copilot.openChat');
                return true;
            } catch {
                return false;
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
            const command = this.buildTestCommand(result.project, `--testNamePattern="${testPattern}"`);
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
            const command = this.buildTestCommand(project);
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
            const command = this.buildTestCommand(result.project, `--testNamePattern="${testPattern}" --inspect`);
            await this.executeTestCommand(command, `Debugging test: ${firstFailure.test}`);
        } catch (error) {
            // Fallback without inspect flag
            this.outputChannel.appendLine('Debug mode failed, running normal test...');
            try {
                const fallbackCommand = this.buildTestCommand(result.project, `--testNamePattern="${testPattern}"`);
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
        const command = this.buildTestCommand(project, '--watch');
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
            const command = this.buildTestCommand(project, `--testNamePattern="${testPattern}"`);
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
            const command = this.buildTestCommand(project, '--coverage');
            await this.executeTestCommand(command, `Running tests with coverage for ${project}`);
        } catch (error) {
            const errorMsg = UserFriendlyErrors.testCommandFailed(project, this.testCommand);
            this.outputChannel.appendLine(`❌ ${errorMsg}`);
            vscode.window.showErrorMessage(errorMsg);
        }
    }
}