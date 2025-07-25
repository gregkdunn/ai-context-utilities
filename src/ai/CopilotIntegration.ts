/**
 * CopilotIntegration - Direct integration with GitHub Copilot Chat
 * 
 * Provides seamless integration with GitHub Copilot Chat for AI-powered
 * test failure analysis and fix suggestions.
 * 
 * @version 3.0.0
 */

import * as vscode from 'vscode';
import { TestFailure, TestResultSummary, TestFailureAnalyzer } from './TestFailureAnalyzer';

/**
 * Represents a fix suggestion from Copilot
 */
export interface FixSuggestion {
    readonly type: 'copilot_chat_opened' | 'pattern_match' | 'learning_suggestion';
    readonly message: string;
    readonly confidence?: number;
    readonly timestamp: string;
    readonly context?: string;
}

/**
 * Options for Copilot integration
 */
export interface CopilotOptions {
    readonly includeSourceCode?: boolean;
    readonly includeTestContext?: boolean;
    readonly maxContextLines?: number;
    readonly focusOnErrors?: boolean;
}

/**
 * Integrates with GitHub Copilot Chat for AI-powered test fix suggestions
 */
export class CopilotIntegration {
    private readonly analyzer: TestFailureAnalyzer;
    private readonly outputChannel: vscode.OutputChannel;

    constructor() {
        this.analyzer = new TestFailureAnalyzer();
        this.outputChannel = vscode.window.createOutputChannel('AI Debug Context - Copilot');
    }

    /**
     * Analyze test failures and open Copilot Chat with context
     */
    async analyzeWithCopilot(
        failures: TestFailure[],
        options: CopilotOptions = {}
    ): Promise<FixSuggestion[]> {
        if (failures.length === 0) {
            const message = 'No test failures to analyze';
            this.showOutput(message);
            return [{
                type: 'copilot_chat_opened',
                message,
                timestamp: new Date().toISOString()
            }];
        }

        const suggestions: FixSuggestion[] = [];

        try {
            // Check if Copilot Chat is available
            const isCopilotAvailable = await this.checkCopilotAvailability();
            
            if (!isCopilotAvailable) {
                const message = 'GitHub Copilot Chat is not available. Please install and authenticate with GitHub Copilot.';
                this.showError(message);
                return [{
                    type: 'copilot_chat_opened',
                    message,
                    timestamp: new Date().toISOString()
                }];
            }

            // Process failures by priority (most common patterns first)
            const prioritizedFailures = this.prioritizeFailures(failures);
            
            for (const failure of prioritizedFailures.slice(0, 3)) { // Limit to 3 most important
                const suggestion = await this.createCopilotSuggestion(failure, options);
                suggestions.push(suggestion);
            }

            // Show summary to user
            this.showAnalysisSummary(failures, suggestions);

        } catch (error) {
            const errorMessage = `Failed to analyze with Copilot: ${error}`;
            this.showError(errorMessage);
            return [{
                type: 'copilot_chat_opened',
                message: errorMessage,
                timestamp: new Date().toISOString()
            }];
        }

        return suggestions;
    }

    /**
     * Generate Copilot context and open chat for a specific test failure
     */
    async getCopilotSuggestion(
        testFailure: TestFailure,
        sourceCode?: string,
        options: CopilotOptions = {}
    ): Promise<FixSuggestion> {
        try {
            // Analyze failure for patterns
            const analyzedFailure = this.analyzer.analyzeFailure(testFailure);
            
            // Build context for Copilot
            const context = this.buildCopilotContext(analyzedFailure, sourceCode, options);
            
            // Open Copilot Chat with context
            await this.openCopilotChat(context);
            
            const message = `Opened GitHub Copilot Chat for test failure: ${testFailure.testName}`;
            this.showOutput(message);
            
            return {
                type: 'copilot_chat_opened',
                message,
                confidence: 0.8,
                timestamp: new Date().toISOString(),
                context
            };
            
        } catch (error) {
            const errorMessage = `Failed to get Copilot suggestion: ${error}`;
            this.showError(errorMessage);
            
            return {
                type: 'copilot_chat_opened',
                message: errorMessage,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Create a summary analysis for multiple test failures
     */
    async analyzeBatchFailures(
        testResults: TestResultSummary,
        options: CopilotOptions = {}
    ): Promise<FixSuggestion> {
        const context = this.buildBatchAnalysisContext(testResults, options);
        
        await this.openCopilotChat(context);
        
        const message = `Opened GitHub Copilot Chat for batch analysis of ${testResults.failures.length} test failures`;
        this.showOutput(message);
        
        return {
            type: 'copilot_chat_opened',
            message,
            timestamp: new Date().toISOString(),
            context
        };
    }

    /**
     * Build context string for Copilot Chat
     */
    private buildCopilotContext(
        failure: TestFailure,
        sourceCode?: string,
        options: CopilotOptions = {}
    ): string {
        const sections = [
            '# 🐛 Test Failure Analysis & Fix Request',
            '',
            '## 📋 Test Information',
            `**Test Name**: ${failure.testName}`,
            `**Test File**: ${failure.testFile}`,
            `**Error Type**: ${failure.errorType}`,
            ''
        ];

        // Add error details
        sections.push(
            '## ❌ Error Details',
            '```',
            failure.errorMessage,
            '```',
            ''
        );

        // Add stack trace if available
        if (failure.stackTrace.length > 0) {
            sections.push(
                '## 📍 Stack Trace',
                '```',
                ...failure.stackTrace.slice(0, options.maxContextLines || 10),
                '```',
                ''
            );
        }

        // Add source code context if available
        if (sourceCode && options.includeSourceCode) {
            sections.push(
                '## 💻 Source Code Context',
                '```typescript',
                sourceCode,
                '```',
                ''
            );
        }

        // Add suggested fix if available
        if (failure.suggestion) {
            sections.push(
                '## 💡 Pattern-Based Suggestion',
                failure.suggestion,
                ''
            );
        }

        // Add specific request
        sections.push(
            '## 🎯 Request',
            'Please analyze this test failure and provide:',
            '1. **Root cause** analysis',
            '2. **Specific code changes** to fix the issue',
            '3. **Working code examples** with proper syntax',
            '4. **Best practices** to prevent similar issues',
            '',
            '**Focus on actionable solutions that can be immediately implemented.**'
        );

        return sections.join('\n');
    }

    /**
     * Build context for batch analysis of multiple failures
     */
    private buildBatchAnalysisContext(
        testResults: TestResultSummary,
        options: CopilotOptions = {}
    ): string {
        const { failures } = testResults;
        const failureGroups = this.analyzer.groupFailuresByType(failures);
        
        const sections = [
            '# 🔍 Batch Test Failure Analysis',
            '',
            '## 📊 Test Results Summary',
            `- **Total Tests**: ${testResults.totalTests}`,
            `- **Passed**: ${testResults.passedTests}`,
            `- **Failed**: ${testResults.failedTests}`,
            `- **Skipped**: ${testResults.skippedTests}`,
            `- **Duration**: ${testResults.duration}ms`,
            '',
            '## 🎯 Failure Analysis by Type',
            ''
        ];

        // Group failures by type
        for (const [errorType, typeFailures] of failureGroups.entries()) {
            sections.push(`### ${errorType} (${typeFailures.length} failures)`);
            sections.push('');
            
            for (const failure of typeFailures.slice(0, 2)) { // Show top 2 per type
                sections.push(`**${failure.testName}**`);
                sections.push('```');
                sections.push(failure.errorMessage);
                sections.push('```');
                sections.push('');
            }
            
            if (typeFailures.length > 2) {
                sections.push(`... and ${typeFailures.length - 2} more similar failures`);
                sections.push('');
            }
        }

        sections.push(
            '## 🎯 Request',
            'Please analyze these test failures and provide:',
            '1. **Priority order** for fixing (which to tackle first)',
            '2. **Common patterns** you notice across failures',
            '3. **Specific fixes** for the most critical issues',
            '4. **Refactoring suggestions** to prevent similar issues',
            '',
            '**Focus on solutions that will have the biggest impact on test reliability.**'
        );

        return sections.join('\n');
    }

    /**
     * Open GitHub Copilot Chat with the provided context
     */
    private async openCopilotChat(context: string): Promise<void> {
        try {
            // Try to use the official Copilot Chat command
            await vscode.commands.executeCommand('github.copilot.openChatEditor');
            
            // Wait a moment for the chat to open
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try to paste the context (this may not work in all versions)
            await vscode.env.clipboard.writeText(context);
            
            // Show user message about context being in clipboard
            vscode.window.showInformationMessage(
                'AI Debug Context copied to clipboard. Paste it into GitHub Copilot Chat for analysis.',
                'Open Copilot Chat'
            ).then(selection => {
                if (selection === 'Open Copilot Chat') {
                    vscode.commands.executeCommand('github.copilot.openChatEditor');
                }
            });
            
        } catch (error) {
            // Fallback: copy to clipboard and show instructions
            await vscode.env.clipboard.writeText(context);
            
            const message = 'AI Debug Context copied to clipboard. Please paste it into GitHub Copilot Chat.';
            vscode.window.showInformationMessage(message, 'Open Copilot Chat').then(selection => {
                if (selection === 'Open Copilot Chat') {
                    vscode.commands.executeCommand('github.copilot.openChatEditor').then(
                        () => {}, // Success - do nothing
                        () => {
                            vscode.window.showErrorMessage('GitHub Copilot Chat is not available. Please install the GitHub Copilot extension.');
                        }
                    );
                }
            });
        }
    }

    /**
     * Check if GitHub Copilot is available
     */
    private async checkCopilotAvailability(): Promise<boolean> {
        try {
            // Check if Copilot extension is installed
            const extension = vscode.extensions.getExtension('GitHub.copilot');
            if (!extension) {
                return false;
            }
            
            // Check if extension is active
            if (!extension.isActive) {
                await extension.activate();
            }
            
            return true;
        } catch (error) {
            this.showOutput(`Copilot availability check failed: ${error}`);
            return false;
        }
    }

    /**
     * Create Copilot suggestion for a single failure
     */
    private async createCopilotSuggestion(
        failure: TestFailure,
        options: CopilotOptions
    ): Promise<FixSuggestion> {
        // Try to read source code if location is available
        let sourceCode: string | undefined;
        
        if (failure.sourceFile && options.includeSourceCode) {
            try {
                const document = await vscode.workspace.openTextDocument(failure.sourceFile);
                const startLine = Math.max(0, (failure.lineNumber || 1) - 10);
                const endLine = Math.min(document.lineCount, (failure.lineNumber || 1) + 10);
                
                const range = new vscode.Range(startLine, 0, endLine, 0);
                sourceCode = document.getText(range);
            } catch (error) {
                this.showOutput(`Could not read source file ${failure.sourceFile}: ${error}`);
            }
        }
        
        return await this.getCopilotSuggestion(failure, sourceCode, options);
    }

    /**
     * Prioritize failures by error type and frequency
     */
    private prioritizeFailures(failures: TestFailure[]): TestFailure[] {
        const analyzed = failures.map(f => this.analyzer.analyzeFailure(f));
        
        // Sort by error type priority and then by frequency
        const typeFrequency = new Map<string, number>();
        for (const failure of analyzed) {
            typeFrequency.set(failure.errorType, (typeFrequency.get(failure.errorType) || 0) + 1);
        }
        
        const typePriority: Record<string, number> = {
            'assertion_mismatch': 1,
            'type_error': 2,
            'null_reference': 3,
            'missing_import': 4,
            'mock_assertion': 5,
            'test_timeout': 6,
            'unknown': 7
        };
        
        return analyzed.sort((a, b) => {
            const aPriority = typePriority[a.errorType] || 999;
            const bPriority = typePriority[b.errorType] || 999;
            
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            
            // If same priority, sort by frequency
            const aFreq = typeFrequency.get(a.errorType) || 0;
            const bFreq = typeFrequency.get(b.errorType) || 0;
            return bFreq - aFreq;
        });
    }

    /**
     * Show analysis summary to user
     */
    private showAnalysisSummary(failures: TestFailure[], suggestions: FixSuggestion[]): void {
        const summary = this.analyzer.createFailureSummary(failures);
        
        this.showOutput('Test Failure Analysis Complete');
        this.showOutput('==================================');
        this.showOutput(summary);
        this.showOutput('');
        this.showOutput(`Generated ${suggestions.length} AI analysis request(s)`);
        this.showOutput('GitHub Copilot Chat opened with context for analysis');
    }

    /**
     * Show output in the output channel
     */
    private showOutput(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`${timestamp} [INFO] ${message}`);
        this.outputChannel.show(true);
    }

    /**
     * Show error message
     */
    private showError(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`${timestamp} [ERROR] ${message}`);
        this.outputChannel.show(true);
        vscode.window.showErrorMessage(`AI Debug Context: ${message}`);
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}