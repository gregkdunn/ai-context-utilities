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
            await this.showSuccessResult(result);
        } else {
            await this.showFailureResult(result);
        }
    }
    
    /**
     * Show successful test result with 3-button workflow
     */
    private async showSuccessResult(result: TestSummary): Promise<void> {
        if (!this.shouldShowPopup()) {
            // Just log to output if popup is suppressed
            this.outputChannel.appendLine(`✅ ${result.project}: All tests passed!`);
            return;
        }
        
        const message = `✅ ${result.project}: All tests passed! Ready for next steps.`;
        const actions = ['New Tests', 'Lint Code', 'PR Description', 'View Output'];
        
        try {
            this.currentPopupPromise = vscode.window.showInformationMessage(message, ...actions);
            const selection = await this.currentPopupPromise;
            this.currentPopupPromise = null;
            
            // Handle button clicks with error handling
            if (selection) {
                try {
                    switch (selection) {
                        case 'New Tests':
                            await this.generateNewTestRecommendations(result);
                            break;
                        case 'Lint Code':
                            await this.runPrepareToPush(result);
                            break;
                        case 'PR Description':
                            await this.generatePRDescription(result);
                            break;
                        case 'View Output':
                            this.outputChannel.show();
                            break;
                    }
                } catch (error) {
                    // Log error but don't let it crash the extension
                    this.outputChannel.appendLine(`⚠️ Error handling action '${selection}': ${error}`);
                    // Show user-friendly message if network error
                    if (error instanceof Error && error.message.includes('ENOTFOUND')) {
                        vscode.window.showWarningMessage('Network issue detected. Please check your internet connection.');
                    }
                }
            }
        } catch (error) {
            // If showing the popup fails, just log it
            this.outputChannel.appendLine(`⚠️ Error showing success popup: ${error}`);
        }
    }
    
    /**
     * Show failed test result with automatic AI analysis
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
            // Still trigger automatic AI analysis even when popup is suppressed
            await this.copilotDebugTests(result);
            return;
        }
        
        // Show brief notification about automatic AI analysis
        const message = `${result.project}: ${result.failed} tests failed (${result.failed} of ${result.total}). Automatically analyzing with AI...`;
        
        // Show non-modal notification about automatic analysis
        vscode.window.showErrorMessage(message, { modal: false });
        
        // Automatically trigger Copilot debug without waiting for user input
        await this.copilotDebugTests(result);
        
        // Show additional action options after AI analysis is triggered
        setTimeout(async () => {
            const followUpActions = ['Rerun Tests', 'View Test Results', 'View AI Analysis'];
            const selection = await vscode.window.showErrorMessage(
                `${result.project}: AI analysis sent to Copilot Chat. Additional options:`,
                ...followUpActions
            );
            
            switch (selection) {
                case 'Rerun Tests':
                    await this.rerunAllTests(result.project);
                    break;
                case 'View Test Results':
                    this.outputChannel.show();
                    break;
                case 'View AI Analysis':
                    // Try to focus on Copilot Chat
                    try {
                        await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                    } catch (error) {
                        vscode.window.showInformationMessage('Please check Copilot Chat for AI analysis');
                    }
                    break;
            }
        }, 2000); // Show follow-up actions after 2 seconds
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
            this.outputChannel.appendLine('📝 Attempting to compile fresh AI debug context...');
            const formattedContext = await this.compileAIDebugContext(result);
            
            if (formattedContext) {
                this.outputChannel.appendLine(`✅ Compiled context: ${Math.round(formattedContext.length / 1024)}KB`);
                // Add instruction prefix to the context
                const contextWithInstruction = `Analyze the pasted document.\n\n${formattedContext}`;
                await this.sendToCopilotChatAutomatic(contextWithInstruction, result);
                this.outputChannel.appendLine('🤖 Formatted AI debug context sent to Copilot Chat');
            } else {
                this.outputChannel.appendLine('⚠️ Could not compile fresh context, trying existing files...');
                // Fallback: try reading existing context file
                const existingContext = await this.readAIDebugContext();
                
                if (existingContext) {
                    this.outputChannel.appendLine(`✅ Found existing context: ${Math.round(existingContext.length / 1024)}KB`);
                    // Add instruction prefix to the context
                    const contextWithInstruction = `Analyze the pasted document.\n\n${existingContext}`;
                    await this.sendToCopilotChatAutomatic(contextWithInstruction, result);
                    this.outputChannel.appendLine('🤖 Existing AI debug context sent to Copilot Chat');
                } else {
                    this.outputChannel.appendLine('⚠️ No existing context found, generating prompt...');
                    // Final fallback to generated prompt
                    const contextPrompt = this.buildCopilotDebugPrompt(result);
                    this.outputChannel.appendLine(`✅ Generated prompt: ${Math.round(contextPrompt.length / 1024)}KB`);
                    await this.sendToCopilotChatAutomatic(contextPrompt, result);
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
            
            // Look for ai-debug-context.txt in the standard location
            const contextDir = path.join(this.workspaceRoot, '.github', 'instructions', 'ai-utilities-context');
            this.outputChannel.appendLine(`🔍 Looking for context files in: ${contextDir}`);
            
            if (!fs.existsSync(contextDir)) {
                this.outputChannel.appendLine(`⚠️ Context directory does not exist: ${contextDir}`);
                return null;
            }
            
            const contextFiles = ['ai-debug-context.txt', 'ai_debug_context.txt', 'ai_context.txt', 'context.txt'];
            
            for (const fileName of contextFiles) {
                const filePath = path.join(contextDir, fileName);
                this.outputChannel.appendLine(`🔍 Checking: ${filePath}`);
                
                if (fs.existsSync(filePath)) {
                    const stat = fs.statSync(filePath);
                    this.outputChannel.appendLine(`✅ Found file: ${fileName} (${Math.round(stat.size / 1024)}KB)`);
                    
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.trim()) {
                        this.outputChannel.appendLine(`📖 Successfully read ${content.length} characters from: ${fileName}`);
                        return content;
                    } else {
                        this.outputChannel.appendLine(`⚠️ File ${fileName} is empty`);
                    }
                } else {
                    this.outputChannel.appendLine(`❌ File not found: ${fileName}`);
                }
            }
            
            this.outputChannel.appendLine('⚠️ No AI debug context file found with content');
            return null;
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to read AI debug context: ${error}`);
            return null;
        }
    }

    /**
     * Send content to Copilot Chat with full automation for test failures
     */
    private async sendToCopilotChatAutomatic(content: string, result: TestSummary): Promise<void> {
        try {
            this.outputChannel.appendLine(`🚀 Fully automated Copilot integration for ${result.project} test failures`);
            this.outputChannel.appendLine(`📋 Preparing to send ${Math.round(content.length / 1024)}KB of context to Copilot Chat...`);
            
            // Always copy to clipboard first
            await vscode.env.clipboard.writeText(content);
            this.outputChannel.appendLine('📋 Content copied to clipboard successfully');
            
            // Try to open Copilot Chat
            const opened = await this.openCopilotChat();
            
            if (opened) {
                this.outputChannel.appendLine('🤖 Copilot Chat opened successfully');
                
                // Wait for Copilot Chat to fully load
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Focus on Copilot Chat
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                
                // Attempt automatic paste and submit
                this.outputChannel.appendLine('🚀 Attempting fully automated paste and submit...');
                const success = await this.tryAutomaticPaste();
                
                if (success) {
                    // Success - show brief success message
                    vscode.window.showInformationMessage(
                        `🚀 ${result.project} test analysis automatically sent to Copilot Chat!`,
                        { modal: false }
                    );
                } else {
                    // Fallback - show instructions
                    vscode.window.showInformationMessage(
                        '📋 Copilot Chat ready. Content in clipboard - paste (Ctrl+V/Cmd+V) and press Enter.',
                        { modal: false }
                    );
                }
                
            } else {
                this.outputChannel.appendLine('⚠️ Could not open Copilot Chat automatically');
                // Try alternative methods
                await this.tryAlternativeCopilotCommands();
                vscode.window.showInformationMessage(
                    '📋 AI context copied to clipboard. Please open Copilot Chat and paste.',
                    { modal: false }
                );
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error in automated Copilot integration: ${error}`);
            await vscode.env.clipboard.writeText(content);
            vscode.window.showErrorMessage(
                '❌ Auto-integration failed. Content copied to clipboard - please paste in Copilot Chat manually.'
            );
        }
    }


    /**
     * Try automatic paste and submit to Copilot Chat
     */
    private async tryAutomaticPaste(): Promise<boolean> {
        try {
            // Focus on Copilot Chat input
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try paste command
            this.outputChannel.appendLine('📋 Attempting automatic paste...');
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            await new Promise(resolve => setTimeout(resolve, 800)); // Wait for paste to complete
            
            this.outputChannel.appendLine('✅ Content pasted successfully, attempting auto-submit...');
            
            // Try to submit automatically with multiple methods
            const submitted = await this.tryAutoSubmit();
            
            if (submitted) {
                this.outputChannel.appendLine('🚀 Content automatically submitted to Copilot Chat!');
                vscode.window.showInformationMessage(
                    '🚀 Content pasted and submitted to Copilot Chat automatically!',
                    { modal: false }
                );
                return true;
            } else {
                this.outputChannel.appendLine('✅ Content pasted - please press Enter to submit');
                vscode.window.showInformationMessage(
                    '✅ Content pasted! Press Enter to submit to Copilot Chat.',
                    { modal: false }
                );
                return true;
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Auto-paste failed: ${error}`);
            return false;
        }
    }

    /**
     * Try different methods to automatically submit content to Copilot Chat
     */
    private async tryAutoSubmit(): Promise<boolean> {
        const submitMethods = [
            // Method 1: Standard Enter key simulation
            async () => {
                await vscode.commands.executeCommand('type', { text: '\n' });
                return true;
            },
            
            // Method 2: Workbench submit action
            async () => {
                await vscode.commands.executeCommand('workbench.action.chat.submit');
                return true;
            },
            
            // Method 3: Chat specific submit
            async () => {
                await vscode.commands.executeCommand('chat.action.submit');
                return true;
            },
            
            // Method 4: Generic submit/accept commands
            async () => {
                await vscode.commands.executeCommand('workbench.action.acceptSelectedSuggestion');
                return true;
            },
            
            // Method 5: Chat send message command
            async () => {
                await vscode.commands.executeCommand('workbench.action.chat.sendMessage');
                return true;
            },
            
            // Method 6: Copilot specific submit
            async () => {
                await vscode.commands.executeCommand('github.copilot.chat.submit');
                return true;
            },
            
            // Method 7: Editor action submit
            async () => {
                await vscode.commands.executeCommand('editor.action.submitComment');
                return true;
            },
            
            // Method 8: Simulate Ctrl+Enter or Cmd+Enter
            async () => {
                await vscode.commands.executeCommand('type', { text: '\r' });
                return true;
            }
        ];
        
        for (let i = 0; i < submitMethods.length; i++) {
            try {
                this.outputChannel.appendLine(`🔄 Trying submit method ${i + 1}...`);
                await submitMethods[i]();
                await new Promise(resolve => setTimeout(resolve, 200)); // Wait for command to process
                this.outputChannel.appendLine(`✅ Submit method ${i + 1} executed successfully`);
                return true;
            } catch (error) {
                this.outputChannel.appendLine(`⚠️ Submit method ${i + 1} failed: ${error}`);
                continue;
            }
        }
        
        this.outputChannel.appendLine('⚠️ All auto-submit methods failed - manual submission required');
        return false;
    }

    /**
     * Try alternative Copilot Chat commands
     */
    private async tryAlternativeCopilotCommands(): Promise<void> {
        const commands = [
            'github.copilot.openChat',
            'workbench.action.chat.open', 
            'github.copilot.terminal.explainTerminalSelection',
            'workbench.action.chat.newChat'
        ];
        
        for (const command of commands) {
            try {
                await vscode.commands.executeCommand(command);
                this.outputChannel.appendLine(`✅ Opened Copilot Chat using: ${command}`);
                vscode.window.showInformationMessage(
                    '🤖 Copilot Chat opened! Please paste the content from clipboard.',
                    { modal: false }
                );
                return;
            } catch (error) {
                this.outputChannel.appendLine(`⚠️ Command ${command} failed: ${error}`);
                continue;
            }
        }
        
        vscode.window.showWarningMessage(
            '⚠️ Could not open Copilot Chat. Please open it manually and paste the content.',
            { modal: false }
        );
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
                            this.showTestResult(testSummary).catch(error => {
                                this.outputChannel.appendLine(`❌ Failed to show test result: ${error}`);
                            });
                        } else {
                            // Show success result with 3-button popup
                            this.showTestResult(testSummary).catch(error => {
                                this.outputChannel.appendLine(`❌ Failed to show test result: ${error}`);
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

    /**
     * Generate new test recommendations using AI context
     */
    private async generateNewTestRecommendations(result: TestSummary): Promise<void> {
        try {
            this.outputChannel.appendLine(`\n🧪 Generating new test recommendations for ${result.project}...`);
            
            // Use the same reliable context compilation as failed tests
            const context = await this.compileAIDebugContext(result);
            
            if (context) {
                // Create specific prompt for new test recommendations
                const testRecommendationPrompt = `# 🧪 New Test Recommendations Request

Based on the current codebase and test results, please analyze the pasted document and provide specific recommendations for new tests that should be written.

Focus on:
1. **Missing test coverage** - What scenarios aren't being tested?
2. **Edge cases** - What boundary conditions should be tested?
3. **Integration tests** - What component interactions need testing?
4. **Error handling** - What failure scenarios should be covered?
5. **Performance tests** - What performance characteristics should be validated?

Please provide specific, actionable test recommendations with code examples.

${context}`;
                
                await this.sendToCopilotChatAutomatic(testRecommendationPrompt, result);
                this.outputChannel.appendLine('🧪 New test recommendations automatically sent to Copilot Chat');
            } else {
                this.outputChannel.appendLine('⚠️ Could not compile context, trying existing files...');
                // Fallback: try reading existing context file
                const existingContext = await this.readAIDebugContext();
                
                if (existingContext) {
                    const testRecommendationPrompt = `# 🧪 New Test Recommendations Request

Based on the current codebase, please analyze the pasted document and provide specific recommendations for new tests.

${existingContext}`;
                    
                    await this.sendToCopilotChatAutomatic(testRecommendationPrompt, result);
                    this.outputChannel.appendLine('🧪 New test recommendations automatically sent to Copilot Chat');
                } else {
                    // Final fallback to generated prompt
                    const prompt = this.buildNewTestPrompt(result);
                    const promptWithInstruction = `Analyze the pasted document and provide new test recommendations.\n\n${prompt}`;
                    await this.sendToCopilotChatAutomatic(promptWithInstruction, result);
                    this.outputChannel.appendLine('🧪 Generated new test prompt automatically sent to Copilot Chat');
                }
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to generate test recommendations: ${error}`);
            vscode.window.showErrorMessage('Failed to generate test recommendations');
        }
    }

    /**
     * Run prepare to push workflow (lint and prettier)
     */
    private async runPrepareToPush(result: TestSummary): Promise<void> {
        try {
            this.outputChannel.appendLine(`\n🔧 Running prepare to push workflow for ${result.project}...`);
            
            // Try to run lint and prettier commands
            const lintCommands = [
                'npm run lint:fix',
                'npm run lint',
                'npx eslint . --fix',
                'yarn lint:fix',
                'yarn lint'
            ];
            
            const prettierCommands = [
                'npm run format',
                'npm run prettier:fix',
                'npx prettier --write .',
                'yarn format',
                'yarn prettier:fix'
            ];
            
            let lintSuccess = false;
            let prettierSuccess = false;
            
            // Try linting first
            for (const command of lintCommands) {
                try {
                    await this.executeSimpleCommand(command, 'Linting code');
                    lintSuccess = true;
                    break;
                } catch (error) {
                    // Continue to next command
                    continue;
                }
            }
            
            // Try prettier/formatting
            for (const command of prettierCommands) {
                try {
                    await this.executeSimpleCommand(command, 'Formatting code');
                    prettierSuccess = true;
                    break;
                } catch (error) {
                    // Continue to next command
                    continue;
                }
            }
            
            // Report results
            if (lintSuccess && prettierSuccess) {
                this.outputChannel.appendLine('✅ Code linted and formatted successfully!');
                vscode.window.showInformationMessage('✅ Code is ready to push! Linting and formatting completed.');
            } else if (lintSuccess) {
                this.outputChannel.appendLine('✅ Code linted successfully! (No formatter found)');
                vscode.window.showInformationMessage('✅ Code linted successfully! Ready to push.');
            } else if (prettierSuccess) {
                this.outputChannel.appendLine('✅ Code formatted successfully! (No linter found)');
                vscode.window.showInformationMessage('✅ Code formatted successfully! Ready to push.');
            } else {
                this.outputChannel.appendLine('⚠️ No lint or format commands found. Code may need manual review.');
                vscode.window.showWarningMessage('⚠️ No lint/format commands found. Please check manually before pushing.');
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to run prepare to push: ${error}`);
            vscode.window.showErrorMessage('Failed to run prepare to push workflow');
        }
    }

    /**
     * Generate PR description using AI context
     */
    private async generatePRDescription(result: TestSummary): Promise<void> {
        try {
            this.outputChannel.appendLine(`\n📝 Generating PR description for ${result.project}...`);
            
            // Use the same reliable context compilation as failed tests
            const context = await this.compileAIDebugContext(result);
            
            if (context) {
                // Filter out AI analysis sections for PR descriptions
                const cleanContext = this.filterContextForPRDescription(context);
                
                // Create specific prompt for PR description
                const prDescriptionPrompt = `# 📝 Pull Request Description Generator

Based on the recent changes and test results, please analyze the pasted document and generate a comprehensive Pull Request description.

Please include:
1. **Summary** - Brief overview of what was changed
2. **Changes Made** - Detailed list of modifications
3. **Testing** - What testing was performed
4. **Impact** - How this affects the codebase
5. **Checklist** - Standard PR checklist items

Format the description professionally for GitHub PR submission.

${cleanContext}`;
                
                await this.sendToCopilotChatAutomatic(prDescriptionPrompt, result);
                this.outputChannel.appendLine('📝 PR description automatically sent to Copilot Chat');
            } else {
                this.outputChannel.appendLine('⚠️ Could not compile context, trying existing files...');
                // Fallback: try reading existing context file
                const existingContext = await this.readAIDebugContext();
                
                if (existingContext) {
                    // Filter existing context too
                    const cleanContext = this.filterContextForPRDescription(existingContext);
                    
                    const prDescriptionPrompt = `# 📝 Pull Request Description Generator

Based on the current changes, please analyze the pasted document and generate a comprehensive PR description.

${cleanContext}`;
                    
                    await this.sendToCopilotChatAutomatic(prDescriptionPrompt, result);
                    this.outputChannel.appendLine('📝 PR description automatically sent to Copilot Chat');
                } else {
                    // Final fallback to generated prompt
                    const prompt = this.buildPRDescriptionPrompt(result);
                    const promptWithInstruction = `Analyze the pasted document and generate a comprehensive PR description.\n\n${prompt}`;
                    await this.sendToCopilotChatAutomatic(promptWithInstruction, result);
                    this.outputChannel.appendLine('📝 Generated PR description prompt automatically sent to Copilot Chat');
                }
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to generate PR description: ${error}`);
            vscode.window.showErrorMessage('Failed to generate PR description');
        }
    }

    /**
     * Filter context to remove AI analysis sections for PR descriptions
     */
    private filterContextForPRDescription(context: string): string {
        if (!context) return context;
        
        // Find and remove the AI analysis sections
        const sectionsToRemove = [
            '🤖 AI ANALYSIS CONTEXT',
            '🚀 AI ASSISTANT GUIDANCE'
        ];
        
        let filteredContext = context;
        
        for (const sectionHeader of sectionsToRemove) {
            const sectionIndex = filteredContext.indexOf(sectionHeader);
            if (sectionIndex !== -1) {
                // Find the start of the section (usually after some equals signs)
                const lineStart = filteredContext.lastIndexOf('\n', sectionIndex);
                const sectionStart = lineStart !== -1 ? lineStart : sectionIndex;
                
                // Remove everything from this section onwards
                filteredContext = filteredContext.substring(0, sectionStart).trim();
                break; // Once we find the first AI section, remove everything from there
            }
        }
        
        return filteredContext;
    }

    /**
     * Compile AI context specifically for new test recommendations
     */
    private async compileNewTestContext(result: TestSummary): Promise<string | null> {
        try {
            const contextCompiler = new ContextCompiler({
                workspaceRoot: this.workspaceRoot,
                outputChannel: this.outputChannel
            });

            // Use 'new-tests' context type for test recommendations
            const context = await contextCompiler.compileContext('new-tests', true);
            return context;
            
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to compile new test context: ${error}`);
            return null;
        }
    }

    /**
     * Compile AI context specifically for PR description
     */
    private async compilePRContext(result: TestSummary): Promise<string | null> {
        try {
            const contextCompiler = new ContextCompiler({
                workspaceRoot: this.workspaceRoot,
                outputChannel: this.outputChannel
            });

            // Use 'pr-description' context type for PR generation
            const context = await contextCompiler.compileContext('pr-description', true);
            return context;
            
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to compile PR context: ${error}`);
            return null;
        }
    }

    /**
     * Build new test recommendations prompt
     */
    private buildNewTestPrompt(result: TestSummary): string {
        return `# 🧪 New Test Recommendations Request

I just finished running tests for **${result.project}** and all tests are passing! Now I'd like to improve test coverage and add new tests.

## 📊 Current Test Status
- **Project**: ${result.project}
- **Tests**: ${result.passed} passed (${result.total} total)
- **Duration**: ${result.duration || 'N/A'}s
- **Status**: ✅ All tests passing

## 🎯 What I need:

1. **🔍 Coverage Analysis**: What areas might need more test coverage?

2. **🧪 Test Suggestions**: Recommend specific new tests to write:
   - Unit tests for edge cases
   - Integration tests for workflows
   - Error handling scenarios
   - Performance/boundary tests

3. **📋 Test Patterns**: Suggest testing patterns and best practices for this project

4. **🚀 Priority Recommendations**: Which tests should I write first for maximum impact?

5. **📝 Code Examples**: Provide concrete test examples I can implement

Please analyze the codebase and suggest specific, actionable test improvements with code examples.`;
    }

    /**
     * Build PR description generation prompt
     */
    private buildPRDescriptionPrompt(result: TestSummary): string {
        return `# 📝 PR Description Generation Request

I just completed work on **${result.project}** and all tests are passing! I need help creating a comprehensive PR description.

## 📊 Current Status
- **Project**: ${result.project}
- **Tests**: ${result.passed} passed (${result.total} total)
- **Duration**: ${result.duration || 'N/A'}s
- **Status**: ✅ All tests passing

## 🎯 Please generate a PR description that includes:

1. **📋 Summary**: Clear overview of changes made

2. **🔧 Changes Made**: List of specific modifications:
   - New features added
   - Bug fixes implemented
   - Refactoring completed
   - Dependencies updated

3. **🧪 Testing**: Description of test coverage:
   - New tests added
   - Existing tests updated
   - Manual testing performed

4. **📖 Documentation**: Any documentation updates

5. **🚀 Impact**: How these changes improve the project

6. **✅ Checklist**: Standard PR checklist items

Please analyze the git changes and create a professional, detailed PR description that follows best practices.`;
    }

    /**
     * Execute a simple command and return success/failure
     */
    private async executeSimpleCommand(command: string, description: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            
            this.outputChannel.appendLine(`🔄 ${description}: ${command}`);
            
            const args = command.split(' ');
            const cmd = args.shift()!;
            
            const child = spawn(cmd, args, {
                cwd: this.workspaceRoot,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout?.on('data', (data: Buffer) => {
                stdout += data.toString();
            });
            
            child.stderr?.on('data', (data: Buffer) => {
                stderr += data.toString();
            });
            
            child.on('close', (code: number) => {
                if (code === 0) {
                    this.outputChannel.appendLine(`✅ ${description} completed successfully`);
                    resolve();
                } else {
                    this.outputChannel.appendLine(`❌ ${description} failed (exit code ${code})`);
                    if (stderr) {
                        this.outputChannel.appendLine(`Error: ${stderr}`);
                    }
                    reject(new Error(`${description} failed with exit code ${code}`));
                }
            });
            
            child.on('error', (error: Error) => {
                this.outputChannel.appendLine(`❌ Failed to execute ${description}: ${error.message}`);
                reject(error);
            });
        });
    }
}