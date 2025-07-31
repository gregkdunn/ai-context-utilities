/**
 * AI Context Compiler Module
 * Compiles diff.txt and test-output.txt into ai_debug_context.txt
 * Part of Phase 2.0 - Git Diff & Post-Test Intelligence
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WorkspaceAnalyzer } from '../../utils/WorkspaceAnalyzer';

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
    private readonly prDescriptionPath: string;

    constructor(private options: ContextCompilerOptions) {
        this.instructionsPath = path.join(
            this.options.workspaceRoot,
            '.github',
            'instructions',
            'ai-utilities-context'
        );
        this.contextFilePath = path.join(this.instructionsPath, 'ai-debug-context.txt');
        this.diffFilePath = path.join(this.instructionsPath, 'diff.txt');
        this.testOutputPath = path.join(this.instructionsPath, 'test-output.txt');
        this.prDescriptionPath = path.join(this.instructionsPath, 'pr-description.txt');
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
            const context = await this.generateContext(type, testPassed, diff, testOutput);
            
            // Determine output file path based on context type
            const outputFilePath = type === 'pr-description' ? this.prDescriptionPath : this.contextFilePath;
            
            // Save context to file
            await fs.promises.writeFile(outputFilePath, context);
            
            this.options.outputChannel.appendLine(
                `✅ AI context compiled to ${this.getRelativePath(outputFilePath)}`
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
    private async generateContext(
        type: ContextType, 
        testPassed: boolean,
        diff: string | null,
        testOutput: string | null
    ): Promise<string> {
        const timestamp = new Date().toLocaleString();
        const workspace = path.basename(this.options.workspaceRoot);

        // Get workspace analysis for better Copilot context
        let workspaceInfo: string[] = [];
        try {
            const workspaceAnalyzer = new WorkspaceAnalyzer(this.options.workspaceRoot);
            workspaceInfo = await workspaceAnalyzer.getFormattedSummary();
        } catch (error) {
            // If workspace analysis fails, continue without it
            this.options.outputChannel.appendLine(`⚠️ Workspace analysis failed: ${error}`);
        }

        // Legacy aiDebug.zsh format with exact structure and emojis
        // This header format is critical for AI recognition and processing
        // Customize header based on context type
        const headerTitle = type === 'pr-description' 
            ? '📝 PR DESCRIPTION CONTEXT - READY FOR GENERATION'
            : '🤖 AI DEBUG CONTEXT - OPTIMIZED FOR ANALYSIS';
        
        const analysisHeader = type === 'pr-description'
            ? '📝 PR GENERATION REQUEST'
            : '🎯 ANALYSIS REQUEST';
            
        const analysisIntro = type === 'pr-description'
            ? 'Please generate a pull request description using the context below:'
            : 'Please analyze this context and provide:';
        
        const sections = [
            '=================================================================',
            headerTitle,
            '=================================================================',
            '',
            'PROJECT: Angular NX Monorepo',
            `TARGET: ${workspace}`,
            `STATUS: ${testPassed ? '✅ TESTS PASSING' : '❌ TESTS FAILING'}`,
            `FOCUS: ${type === 'debug' ? 'General debugging' : type === 'new-tests' ? 'Test coverage analysis' : 'PR description generation'}`,
            `TIMESTAMP: ${timestamp}`,
            ''
        ];

        // Add workspace technology stack information for Copilot context
        if (workspaceInfo.length > 0) {
            sections.push(
                '=================================================================',
                '🔧 WORKSPACE TECHNOLOGY STACK - USE THESE FRAMEWORKS ONLY',
                '=================================================================',
                'IMPORTANT: All code suggestions must use the frameworks detected in this workspace.',
                'Do not recommend alternatives. Use only the technologies listed below:',
                '',
                ...workspaceInfo.map(info => `• ${info}`),
                '',
                '⚠️  DO NOT suggest different frameworks (e.g., if Jest is detected, do not suggest Jasmine)',
                '⚠️  DO NOT recommend changing the existing tech stack',
                '⚠️  USE the detected versions when providing code examples',
                ''
            );
        }

        sections.push(
            '=================================================================',
            analysisHeader,
            '=================================================================',
            '',
            analysisIntro,
            ''
        );

        // Add specific analysis requests based on context type - Phase 3.4.0 focused prompts
        if (type === 'pr-description') {
            const prPrompt = await this.getPRDescriptionPrompt();
            sections.push(prPrompt);
        } else if (testPassed) {
            // Focused passing test analysis with output format
            sections.push(
                'PASSING TESTS - CODE REVIEW NEEDED:',
                '',
                'Review the code changes and test results below for:',
                '1. Code quality issues in changed files',
                '2. Missing test coverage for new functionality',
                '3. Security concerns and performance issues',
                '4. Integration testing gaps',
                '',
                '**RESPONSE FORMAT:**',
                'Organize your response using these sections:',
                '',
                '```',
                '## Code Quality Review',
                '',
                '### 🔍 Issues Found:',
                '**File:** src/path/to/file.ts (lines X-Y)',
                '- Issue description with specific concern',
                '- Recommended fix with code example',
                '',
                '### 🧪 Missing Test Coverage:',
                '**File:** src/path/to/test.spec.ts',
                '```typescript',
                'describe("New test suite", () => {',
                '  it("should test specific behavior", () => {',
                '    // Test implementation',
                '  });',
                '});',
                '```',
                '',
                '### 🔒 Security Concerns:',
                '**File:** src/path/to/file.ts (line X)',
                '- Security issue description',
                '- Mitigation code example',
                '',
                '### 🔗 Integration Tests:',
                '- Test scenario 1: Expected behavior',
                '- Test scenario 2: Expected behavior',
                '```',
                '',
                'Use this exact structure for consistency.',
                '',
                '**FRAMEWORK REQUIREMENTS:**',
                '- Use ONLY the frameworks detected in the workspace technology stack above',
                '- Follow the existing patterns and conventions in the codebase',
                '- Match the detected versions when suggesting code examples'
            );
        } else {
            // Focused failing test analysis with output format
            sections.push(
                'FAILING TESTS - IMMEDIATE FIXES NEEDED:',
                '',
                'Analyze the test failures below and provide fixes for:',
                '1. TypeScript compilation errors',
                '2. Test assertion failures', 
                '3. Missing imports or dependencies',
                '4. Method signature changes',
                '',
                '**RESPONSE FORMAT:**',
                'For each fix, use this exact format:',
                '',
                '```',
                '## Fix #[N]: [Brief description]',
                '**File:** src/path/to/file.ts',
                '**Line:** [line number]',
                '**Issue:** [What\'s wrong]',
                '**Solution:**',
                '```typescript',
                '// Replace this:',
                '[old code]',
                '',
                '// With this:',
                '[new code]',
                '```',
                '**Explanation:** [Why this fixes the issue]',
                '```',
                '',
                'Provide fixes in this format for all errors shown below.',
                '',
                '**FRAMEWORK REQUIREMENTS:**',
                '- Use ONLY the frameworks detected in the workspace technology stack above',
                '- Do not suggest switching test frameworks (e.g., if Jest is detected, fix Jest issues, don\'t suggest Jasmine)',
                '- Follow existing test patterns and imports in the codebase',
                '- Use the exact versions detected in the workspace'
            );
        }

        sections.push('', '');

        // Add focused test results section - Phase 3.4.0
        if (testOutput && testOutput.trim()) {
            sections.push(
                '==================================================================',
                '🧪 TEST EXECUTION DETAILS',
                '==================================================================',
                ''
            );
            
            // Extract key information from test output
            const testSummary = this.extractTestSummary(testOutput);
            if (testSummary) {
                sections.push(testSummary, '');
            }
            
            // Include actual test output but keep it focused
            const focusedOutput = this.getFocusedTestOutput(testOutput, testPassed);
            sections.push(focusedOutput);
            
            sections.push('', '');
        }

        // Add specific code changes analysis - Phase 3.4.0 focused
        sections.push(
            '==================================================================',
            '📋 SPECIFIC CHANGES MADE',
            '==================================================================',
            ''
        );

        if (diff && diff.trim()) {
            const changesSummary = this.extractChangesSummary(diff);
            sections.push(changesSummary, '');
            
            // Include focused diff content
            const focusedDiff = this.getFocusedDiff(diff);
            sections.push(focusedDiff);
        } else {
            sections.push(
                'No code changes detected in current commit.',
                '',
                testPassed ? 
                'Tests passing without changes - good for code review.' :
                'Tests failing without changes - likely environment/setup issue.'
            );
        }

        sections.push('', '');

        // Add final guidance - Phase 3.4.0 focused
        sections.push(
            '==================================================================',
            '🎯 ANALYSIS FOCUS',
            '==================================================================',
            'This context provides:',
            '• Specific test failures with error messages',
            '• Actual code changes with file paths and line numbers',
            '• Focused prompts for actionable analysis',
            '• Clear priority: fix failing tests first, enhance passing tests second',
            '',
            `Complete relevant information included - optimized for AI analysis`
        );

        return sections.join('\n');
    }

    /**
     * Extract focused test summary from test output - Phase 3.4.0
     */
    private extractTestSummary(testOutput: string): string | null {
        const lines = testOutput.split('\n');
        let summary = '';
        
        // Look for test summary patterns
        for (const line of lines) {
            if (line.includes('Test Suites:') || line.includes('Tests:') || 
                line.includes('PASS') || line.includes('FAIL') ||
                line.includes('passed') || line.includes('failed')) {
                summary += line + '\n';
            }
        }
        
        return summary.trim() || null;
    }

    /**
     * Extract focused test output - Phase 3.4.0
     */
    private getFocusedTestOutput(testOutput: string, testPassed: boolean): string {
        const lines = testOutput.split('\n');
        let focusedLines: string[] = [];
        
        if (!testPassed) {
            // For failing tests, focus on errors and failures
            let inErrorBlock = false;
            for (const line of lines) {
                if (line.includes('FAIL') || line.includes('Error:') || 
                    line.includes('TypeError') || line.includes('ReferenceError') ||
                    line.includes('AssertionError') || line.includes('Expected')) {
                    inErrorBlock = true;
                    focusedLines.push(line);
                } else if (inErrorBlock && (line.startsWith('    ') || line.startsWith('\t'))) {
                    focusedLines.push(line);
                } else if (inErrorBlock && line.trim() === '') {
                    focusedLines.push(line);
                } else {
                    inErrorBlock = false;
                }
                
                // Include all relevant error information - no arbitrary limits
            }
        } else {
            // For passing tests, include summaries, warnings, and performance info
            for (const line of lines) {
                if (line.includes('PASS') || line.includes('✓') || 
                    line.includes('Warning') || line.includes('Deprecation') ||
                    line.includes('Test Suites:') || line.includes('Tests:') ||
                    line.includes('Time:') || line.includes('Snapshot') ||
                    line.includes('Coverage') || line.includes('Slow test') ||
                    line.includes('Memory') || line.includes('Performance') ||
                    line.includes('Heap') || line.includes('TODO') ||
                    line.includes('FIXME') || line.includes('console.')) {
                    focusedLines.push(line);
                }
                // Include all relevant information that could help with code review
            }
        }
        
        // If no focused content found, include relevant portions filtering out noise
        if (focusedLines.length === 0) {
            const relevantLines = testOutput.split('\n').filter(line => 
                line.trim() !== '' && 
                !line.includes('npm WARN') && 
                !line.includes('node_modules') &&
                !line.startsWith('> ') // Remove npm script output headers
            );
            return relevantLines.join('\n');
        }
        
        return focusedLines.join('\n');
    }

    /**
     * Extract changes summary from diff - Phase 3.4.0
     */
    private extractChangesSummary(diff: string): string {
        const lines = diff.split('\n');
        let filesChanged = new Set<string>();
        let addedLines = 0;
        let deletedLines = 0;
        
        for (const line of lines) {
            if (line.startsWith('diff --git')) {
                const match = line.match(/diff --git a\/(.*) b\/(.*)/);
                if (match) {
                    filesChanged.add(match[1]);
                }
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                addedLines++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                deletedLines++;
            }
        }
        
        return [
            `Files changed: ${filesChanged.size}`,
            `Lines added: ${addedLines}`,
            `Lines removed: ${deletedLines}`,
            '',
            'Modified files:',
            ...Array.from(filesChanged).map(file => `• ${file}`)
        ].join('\n');
    }

    /**
     * Extract focused diff content - Phase 3.4.0
     */
    private getFocusedDiff(diff: string): string {
        const lines = diff.split('\n');
        let focusedLines: string[] = [];
        let currentFile = '';
        
        for (const line of lines) {
            if (line.startsWith('diff --git')) {
                const match = line.match(/diff --git a\/(.*) b\/(.*)/);
                if (match) {
                    currentFile = match[1];
                    focusedLines.push(`\n=== ${currentFile} ===`);
                }
            } else if (line.startsWith('@@')) {
                focusedLines.push(line);
            } else if (line.startsWith('+') || line.startsWith('-')) {
                focusedLines.push(line);
            }
            
            // Include all relevant changes - complete context is better than truncated
        }
        
        return focusedLines.join('\n');
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
     * Get PR description prompt with template if available
     */
    private async getPRDescriptionPrompt(): Promise<string> {
        const prTemplate = await this.readPRTemplate();
        
        if (prTemplate) {
            return [
                '## 📝 Pull Request Description Request',
                '',
                'Analyze the git diff and test results below, then generate a PR description using the project template.',
                '',
                '**ANALYSIS REQUIRED:**',
                '1. Identify the main purpose of these changes from the git diff',
                '2. List specific files changed and their functionality',
                '3. Extract any feature flags found in the code changes',
                '4. Identify any breaking changes or API modifications',
                '5. Note the test results and coverage impact',
                '',
                '**PR TEMPLATE TO FILL:**',
                '```',
                prTemplate,
                '```',
                '',
                '**OUTPUT FORMAT:**',
                'Return the completed template with:',
                '- Summary based on actual code changes (not generic descriptions)',
                '- Specific file changes with what each does',
                '- Feature flags section if any flags detected in diff',
                '- Breaking changes section if interface/API changes found',
                '- Test results referenced with actual numbers from test output',
                '- All placeholders replaced with real information',
                ''
            ].join('\n');
        }
        
        // Fallback to default format if no template found
        return [
            '## 📝 Pull Request Description Request',
            '',
            'Analyze the git diff and test results below to generate a comprehensive PR description.',
            '',
            '**ANALYSIS STEPS:**',
            '1. Examine the git diff to understand what was actually changed',
            '2. Identify the main functionality being added/modified/removed',
            '3. Extract any feature flags from the code changes',
            '4. Detect breaking changes (interface modifications, method signature changes)',
            '5. Note performance implications (new dependencies, heavy operations)',
            '6. Reference actual test results and coverage numbers',
            '',
            '**OUTPUT FORMAT:**',
            'Generate a PR description using this structure:',
            '',
            '```markdown',
            '# Pull Request Title',
            '',
            '## Summary',
            '[Specific description based on actual code changes]',
            '',
            '## Changes Made',
            '- [Specific file]: [What changed and why]',
            '- [Specific file]: [What changed and why]',
            '',
            '## Feature Flags (if any detected)',
            '- `flag-name`: [Purpose and testing instructions]',
            '',
            '## Testing',
            '- [X] Unit tests pass ([actual numbers from test output])',
            '- [X] Integration tests pass',
            '- [ ] Manual testing completed',
            '',
            '## Breaking Changes (if any)',
            '- [Specific change]: [Migration instructions]',
            '',
            '## Additional Notes',
            '[Performance implications, dependencies, etc.]',
            '```',
            '',
            'Base all content on the actual git diff and test results provided below.',
            ''
        ].join('\n');
    }

    /**
     * Read PR template from .github/PULL_REQUEST_TEMPLATE.md
     */
    private async readPRTemplate(): Promise<string | null> {
        try {
            const templatePath = path.join(this.options.workspaceRoot, '.github', 'PULL_REQUEST_TEMPLATE.md');
            const content = await fs.promises.readFile(templatePath, 'utf8');
            return content.trim();
        } catch {
            // Template doesn't exist, return null
            return null;
        }
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
            // Add instruction for Copilot to analyze the document
            const contextWithInstruction = `Analyze the pasted document.\n\n${context}`;
            await vscode.env.clipboard.writeText(contextWithInstruction);
            this.options.outputChannel.appendLine('📋 AI context copied to clipboard with analysis instruction');
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
        const files = [this.contextFilePath, this.diffFilePath, this.testOutputPath, this.prDescriptionPath];
        
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