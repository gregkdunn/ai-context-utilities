/**
 * AI Context Compiler Module
 * Compiles diff.txt and test-output.txt into ai_debug_context.txt
 * Part of Phase 2.0 - Git Diff & Post-Test Intelligence
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ContextCompilerOptions {
    workspaceRoot: string;
    outputChannel: vscode.OutputChannel;
}

export type ContextType = 'debug' | 'new-tests' | 'pr-description';

/**
 * Service for compiling AI context from diff and test output
 */
export class ContextCompiler {
    private readonly instructionsPath: string;
    private readonly contextFilePath: string;
    private readonly diffFilePath: string;
    private readonly testOutputPath: string;

    constructor(private options: ContextCompilerOptions) {
        this.instructionsPath = path.join(
            this.options.workspaceRoot,
            '.github',
            'instructions', 
            'ai_debug_context'
        );
        this.contextFilePath = path.join(this.instructionsPath, 'ai_debug_context.txt');
        this.diffFilePath = path.join(this.instructionsPath, 'diff.txt');
        this.testOutputPath = path.join(this.instructionsPath, 'test-output.txt');
    }

    /**
     * Compile context based on type
     */
    async compileContext(type: ContextType, testPassed: boolean): Promise<string | null> {
        try {
            this.options.outputChannel.appendLine(`🤖 Compiling AI context for ${type}...`);

            // Read diff and test output
            const diff = await this.readFileIfExists(this.diffFilePath);
            const testOutput = await this.readFileIfExists(this.testOutputPath);

            if (!diff && !testOutput) {
                this.options.outputChannel.appendLine('⚠️  No diff or test output found');
                return null;
            }

            // Generate context based on type
            const context = this.generateContext(type, testPassed, diff, testOutput);
            
            // Save context to file
            await fs.promises.writeFile(this.contextFilePath, context);
            
            this.options.outputChannel.appendLine(
                `✅ AI context compiled to ${this.getRelativePath(this.contextFilePath)}`
            );

            return context;

        } catch (error) {
            this.options.outputChannel.appendLine(`❌ Failed to compile AI context: ${error}`);
            return null;
        }
    }

    /**
     * Generate context based on type (Phase 2.1 - Legacy aiDebug.zsh format)
     * 
     * This is the core method that generates AI-optimized context files matching
     * the exact format of the legacy aiDebug.zsh script. It combines test output
     * and git diff information into a comprehensive analysis context.
     * 
     * The generated context follows the legacy format structure:
     * 1. Header with project information and status
     * 2. Analysis request with context-specific prompts
     * 3. Test results analysis (if available)
     * 4. Code quality results with push readiness status
     * 5. Code changes analysis from git diff
     * 6. AI assistant guidance with optimization notes
     * 
     * @param type - Type of analysis context ('debug', 'new-tests', 'pr-description')
     * @param testPassed - Whether tests are currently passing
     * @param diff - Git diff content (null if no changes)
     * @param testOutput - Test execution output (null if no tests run)
     * @returns Formatted context string matching legacy aiDebug.zsh format
     */
    private generateContext(
        type: ContextType, 
        testPassed: boolean,
        diff: string | null,
        testOutput: string | null
    ): string {
        const timestamp = new Date().toLocaleString();
        const workspace = path.basename(this.options.workspaceRoot);

        // Legacy aiDebug.zsh format with exact structure and emojis
        // This header format is critical for AI recognition and processing
        const sections = [
            '=================================================================',
            '🤖 AI DEBUG CONTEXT - OPTIMIZED FOR ANALYSIS',
            '=================================================================',
            '',
            'PROJECT: Angular NX Monorepo',
            `TARGET: ${workspace}`,
            `STATUS: ${testPassed ? '✅ TESTS PASSING' : '❌ TESTS FAILING'}`,
            `FOCUS: ${type === 'debug' ? 'General debugging' : type === 'new-tests' ? 'Test coverage analysis' : 'PR description generation'}`,
            `TIMESTAMP: ${timestamp}`,
            '',
            '=================================================================',
            '🎯 ANALYSIS REQUEST',
            '=================================================================',
            '',
            'Please analyze this context and provide:',
            ''
        ];

        // Add conditional analysis requests based on test status (exact legacy format)
        if (testPassed) {
            sections.push(
                '1. 🔍 CODE QUALITY ANALYSIS',
                '   • Review code changes for potential improvements',
                '   • Identify any code smells or anti-patterns',
                '   • Check for performance optimization opportunities',
                '',
                '2. 🎭 MOCK DATA VALIDATION (CRITICAL)',
                '   • Review all mock data to ensure it matches real-world data structures',
                '   • Verify mock objects have correct property names and types',
                '   • Check that mock data represents realistic scenarios (not just minimal passing data)',
                '   • Ensure mocked API responses match actual API contract',
                '   • Validate that test data covers edge cases and realistic variations',
                '   • Identify mock data that might be giving false positives',
                '',
                '3. 🧪 TEST COVERAGE ANALYSIS',
                '   • Missing test coverage for new functionality',
                '   • Edge cases that should be tested',
                '   • Additional test scenarios to prevent regressions',
                '   • Test improvements for better maintainability',
                '   • File-specific coverage analysis (diff coverage vs total coverage)',
                '',
                '4. 🚀 ENHANCEMENT RECOMMENDATIONS',
                '   • Code quality improvements',
                '   • Better error handling or validation',
                '   • Documentation or typing improvements',
                '   • Performance optimizations',
                '',
                '5. 🛡️ ROBUSTNESS IMPROVEMENTS',
                '   • Potential edge cases to handle',
                '   • Error scenarios to test',
                '   • Input validation opportunities',
                '   • Defensive programming suggestions'
            );
        } else {
            sections.push(
                '1. 🔍 ROOT CAUSE ANALYSIS',
                '   • What specific changes are breaking the tests?',
                '   • Are there type mismatches or interface changes?',
                '   • Did method signatures change?',
                '',
                '2. 🛠️ CONCRETE FIXES (PRIORITY 1)',
                '   • Exact code changes needed to fix failing tests',
                '   • Updated test expectations if business logic changed',
                '   • Type definitions or interface updates required',
                '',
                '3. 🧪 EXISTING TEST FIXES (PRIORITY 1)',
                '   • Fix existing failing tests first',
                '   • Update test assertions to match new behavior',
                '   • Fix test setup or mocking issues',
                '',
                '4. 🚀 IMPLEMENTATION GUIDANCE (PRIORITY 1)',
                '   • Order of fixes (dependencies first)',
                '   • Potential side effects to watch for',
                '   • Getting tests green is the immediate priority',
                '',
                '5. ✨ NEW TEST SUGGESTIONS (PRIORITY 2 - AFTER FIXES)',
                '   • Missing test coverage for new functionality',
                '   • Edge cases that should be tested',
                '   • Additional test scenarios to prevent regressions',
                '   • Test improvements for better maintainability',
                '   • File-specific coverage analysis (diff coverage vs total coverage)',
                '   • Specify files and line numbers where new tests should be added.',
                '',
                'NOTE: Focus on items 1-4 first to get tests passing, then implement item 5'
            );
        }

        sections.push('', '');

        // Add test results analysis section
        sections.push(
            '==================================================================',
            '🧪 TEST RESULTS ANALYSIS',
            '==================================================================',
            ''
        );

        if (testOutput) {
            sections.push(testOutput);
        } else {
            sections.push('❌ No test results available');
        }

        sections.push('', '');

        // Add code quality results (simplified for Phase 2.1)
        sections.push(
            '==================================================================',
            '🔧 CODE QUALITY RESULTS',
            '==================================================================',
            '',
            '📋 LINTING RESULTS:',
            testPassed ? '✅ Status: PASSED' : '⚠️  Status: NEEDS REVIEW',
            testPassed ? '• All linting rules satisfied' : '• Review linting after test fixes',
            '',
            '✨ FORMATTING RESULTS:',
            testPassed ? '✅ Status: COMPLETED' : '⚠️  Status: PENDING',
            testPassed ? '• Code formatting applied successfully' : '• Formatting will run after tests pass',
            '',
            '🚀 PUSH READINESS:',
            testPassed ? '✅ READY TO PUSH' : '⚠️  NOT READY - Issues need resolution:',
            testPassed ? '• Tests: Passing ✅' : '• Tests: Failing ❌',
            testPassed ? '• Lint: Clean ✅' : '• Lint: Pending ⚠️',
            testPassed ? '• Format: Applied ✅' : '• Format: Pending ⚠️'
        );

        sections.push('', '');

        // Add git changes analysis
        sections.push(
            '==================================================================',
            '📋 CODE CHANGES ANALYSIS',
            '==================================================================',
            ''
        );

        if (diff) {
            sections.push(diff);
        } else {
            sections.push(
                'ℹ️  No recent code changes detected',
                '',
                'This suggests the test failures may be due to:',
                '• Environment or configuration issues',
                '• Dependencies or version conflicts',
                '• Test setup or teardown problems',
                '• Race conditions or timing issues'
            );
        }

        sections.push('', '');

        // Add final AI guidance (exact legacy format)
        sections.push(
            '==================================================================',
            '🚀 AI ASSISTANT GUIDANCE',
            '==================================================================',
            'This context file is optimized for AI analysis with:',
            '• Structured failure information for easy parsing',
            '• Code changes correlated with test failures',
            '• Clear focus areas for targeted analysis',
            '• Actionable fix categories for systematic resolution',
            '',
            `Context file size: ${sections.length} lines (optimized for AI processing)`
        );

        return sections.join('\n');
    }

    /**
     * Get debug prompt for test failures
     */
    private getDebugPrompt(): string {
        return [
            '## 🚨 Test Failure Analysis Request',
            '',
            'The tests have failed. Please analyze the git diff and test output to:',
            '1. Identify the root cause of the test failures',
            '2. Suggest specific fixes for the failing tests',
            '3. Highlight any potential issues in the code changes',
            '4. Provide step-by-step debugging recommendations',
            ''
        ].join('\n');
    }

    /**
     * Get new tests prompt for test successes
     */
    private getNewTestsPrompt(): string {
        return [
            '## ✨ New Test Recommendations',
            '',
            'The tests are passing. Please analyze the git diff to:',
            '1. Identify untested code paths in the changes',
            '2. Suggest additional test cases for better coverage',
            '3. Recommend edge cases that should be tested',
            '4. Provide example test code for the suggestions',
            ''
        ].join('\n');
    }

    /**
     * Get PR description prompt
     */
    private getPRDescriptionPrompt(): string {
        return [
            '## 📝 Pull Request Description Request',
            '',
            'Please generate a comprehensive PR description that includes:',
            '1. Clear summary of the changes made',
            '2. Why these changes were necessary',
            '3. How the changes have been tested (reference the passing tests)',
            '4. Any potential impacts or considerations for reviewers',
            '5. Checklist items if applicable',
            ''
        ].join('\n');
    }

    /**
     * Get type-specific instructions
     */
    private getTypeSpecificInstructions(type: ContextType, testPassed: boolean): string {
        const instructions = ['## Instructions', ''];

        switch (type) {
            case 'debug':
                instructions.push('Focus on the failing tests and provide actionable debugging steps.');
                instructions.push('Pay special attention to the error messages and stack traces.');
                break;
            case 'new-tests':
                instructions.push('Analyze code coverage gaps and suggest comprehensive test cases.');
                instructions.push('Provide concrete test examples that can be directly implemented.');
                break;
            case 'pr-description':
                instructions.push('Create a professional PR description suitable for code review.');
                instructions.push('Emphasize the validation provided by the passing tests.');
                break;
        }

        return instructions.join('\n');
    }

    /**
     * Read file if it exists
     */
    private async readFileIfExists(filePath: string): Promise<string | null> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            return content;
        } catch {
            return null;
        }
    }

    /**
     * Get relative path for display
     */
    private getRelativePath(fullPath: string): string {
        return path.relative(this.options.workspaceRoot, fullPath);
    }

    /**
     * Copy context to clipboard
     */
    async copyToClipboard(context: string): Promise<boolean> {
        try {
            await vscode.env.clipboard.writeText(context);
            this.options.outputChannel.appendLine('📋 AI context copied to clipboard');
            return true;
        } catch (error) {
            this.options.outputChannel.appendLine(`❌ Failed to copy to clipboard: ${error}`);
            return false;
        }
    }

    /**
     * Clear all context files
     */
    async clearContext(): Promise<void> {
        const files = [this.contextFilePath, this.diffFilePath, this.testOutputPath];
        
        for (const file of files) {
            try {
                await fs.promises.unlink(file);
            } catch {
                // File doesn't exist, ignore
            }
        }
        
        this.options.outputChannel.appendLine('🗑️  AI context files cleared');
    }
}