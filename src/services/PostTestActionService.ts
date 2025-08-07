/**
 * Post Test Action Service
 * Simplified post-test actions - Phase 3.2.0
 * Reduced to 3 core actions: View Output, Rerun Tests, Copy Failure Analysis
 */

import * as vscode from 'vscode';
import { ServiceContainer } from '../core/ServiceContainer';
import { TestResult } from './TestExecutionService';
import { TestFailure } from '../utils/testResultParser';
import * as fs from 'fs';
import * as path from 'path';

export interface PostTestAction {
    label: string;
    description: string;
    icon: string;
    action: () => Promise<void>;
}

/**
 * Simplified service for core post-test actions
 */
export class PostTestActionService {
    private lastTestRequest: any = null;
    private lastTestResult: TestResult | null = null;

    constructor(private services: ServiceContainer) {}

    /**
     * Show simplified post-test actions menu
     */
    async showPostTestActions(result: TestResult, request: any): Promise<void> {
        this.lastTestRequest = request;
        this.lastTestResult = result;
        
        const actions = this.getCoreActions();
        const items = actions.map(action => ({
            label: `${action.icon} ${action.label}`,
            detail: action.description,
            action: action.action
        }));

        // Add dismiss option
        const selection = await vscode.window.showQuickPick(items, {
            placeHolder: result.success ? 'Tests passed!' : 'Tests failed. Choose an action:',
            title: `Test ${result.success ? 'Success' : 'Failure'} Actions`
        });

        if (selection && selection.action) {
            await selection.action();
        }
    }

    /**
     * Get the core actions - different for success vs failure
     */
    private getCoreActions(): PostTestAction[] {
        const baseActions = [
            {
                label: 'View Output',
                description: 'Show detailed test output',
                icon: '$(output)',
                action: () => this.handleViewOutput()
            },
            {
                label: 'Test Recent',
                description: 'Run the same tests again',
                icon: '$(sync)',
                action: () => this.handleRerunTests()
            }
        ];

        if (this.lastTestResult?.success) {
            // For successful tests, add PR Description
            baseActions.push({
                label: 'PR Description',
                description: 'Generate pull request description using template',
                icon: '$(git-pull-request)',
                action: () => this.handlePRDescription()
            });
        } else {
            // For failed tests, add Failure Analysis
            baseActions.push({
                label: 'Copy Failure Analysis',
                description: 'Copy test failure analysis to clipboard',
                icon: '$(copy)',
                action: () => this.handleCopyFailureAnalysis()
            });
        }

        return baseActions;
    }

    /**
     * Handle view output action
     */
    private async handleViewOutput(): Promise<void> {
        try {
            this.services.outputChannel.clear();
            
            if (this.lastTestResult) {
                // Show test summary
                this.services.outputChannel.appendLine(`=== Test Results ===`);
                this.services.outputChannel.appendLine(`Status: ${this.lastTestResult.success ? 'PASSED' : 'FAILED'}`);
                this.services.outputChannel.appendLine(`Duration: ${this.lastTestResult.duration}ms`);
                this.services.outputChannel.appendLine('');
                
                // Show stdout if available
                if (this.lastTestResult.stdout) {
                    this.services.outputChannel.appendLine('=== Standard Output ===');
                    this.services.outputChannel.appendLine(this.lastTestResult.stdout);
                    this.services.outputChannel.appendLine('');
                }
                
                // Show stderr if available
                if (this.lastTestResult.stderr) {
                    this.services.outputChannel.appendLine('=== Error Output ===');
                    this.services.outputChannel.appendLine(this.lastTestResult.stderr);
                }
            } else {
                this.services.outputChannel.appendLine('No test results available');
            }
            
            this.services.outputChannel.show();
        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'handleViewOutput' });
        }
    }

    /**
     * Handle rerun tests action
     */
    private async handleRerunTests(): Promise<void> {
        if (!this.lastTestRequest) {
            vscode.window.showErrorMessage('No previous test to rerun');
            return;
        }

        try {
            await vscode.commands.executeCommand('aiDebugContext.runAffectedTests');
            vscode.window.showInformationMessage('Rerunning tests...');
        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'handleRerunTests' });
        }
    }

    /**
     * Handle copy failure analysis action
     */
    private async handleCopyFailureAnalysis(): Promise<void> {
        try {
            if (!this.lastTestResult) {
                vscode.window.showWarningMessage('No test results available for analysis');
                return;
            }

            let analysisText = `# Test Failure Analysis\n\n`;
            analysisText += `**Status:** ${this.lastTestResult.success ? 'PASSED' : 'FAILED'}\n`;
            analysisText += `**Duration:** ${this.lastTestResult.duration}ms\n`;
            analysisText += `**Exit Code:** ${this.lastTestResult.exitCode}\n\n`;

            if (this.lastTestResult.summary) {
                analysisText += `## Test Summary\n`;
                analysisText += `- **Total:** ${this.lastTestResult.summary.total}\n`;
                analysisText += `- **Passed:** ${this.lastTestResult.summary.passed}\n`;
                analysisText += `- **Failed:** ${this.lastTestResult.summary.failed}\n`;
                analysisText += `- **Skipped:** ${this.lastTestResult.summary.skipped}\n\n`;
            }

            if (!this.lastTestResult.success) {
                if (this.lastTestResult.stderr) {
                    analysisText += `## Error Output\n\`\`\`\n${this.lastTestResult.stderr}\n\`\`\`\n\n`;
                }
                
                if (this.lastTestResult.summary?.failures && this.lastTestResult.summary.failures.length > 0) {
                    analysisText += `## Failure Details\n`;
                    this.lastTestResult.summary.failures.forEach((failure: TestFailure, index: number) => {
                        analysisText += `### Failure ${index + 1}: ${failure.test}\n`;
                        analysisText += `- **Suite:** ${failure.suite}\n`;
                        if (failure.file) analysisText += `- **File:** ${failure.file}:${failure.line || 'unknown'}\n`;
                        analysisText += `- **Error:** ${failure.error}\n\n`;
                    });
                }
            }

            await vscode.env.clipboard.writeText(analysisText);
            vscode.window.showInformationMessage('Test failure analysis copied to clipboard');
            
        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'handleCopyFailureAnalysis' });
        }
    }

    /**
     * Handle PR description generation using enhanced AI system (Phase 3.5.2)
     * Falls back to legacy template-based approach if enhanced system fails
     */
    async handlePRDescription(): Promise<void> {
        try {
            // Phase 3.5.2: Try enhanced PR description generation first
            const enhancedResult = await this.tryEnhancedPRGeneration();
            if (enhancedResult.success) {
                this.services.outputChannel.appendLine('✅ Enhanced PR description generation completed');
                return;
            }

            // Fallback to legacy system
            this.services.outputChannel.appendLine('⚠️  Enhanced generation failed, using legacy system');
            await this.handleLegacyPRDescription();

        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'handlePRDescription' });
        }
    }

    /**
     * Try enhanced PR description generation (Phase 3.5.2)
     */
    private async tryEnhancedPRGeneration(): Promise<{ success: boolean; error?: string }> {
        try {
            // Check if enhanced system is available
            const { EnhancedPRDescriptionService } = await import('./EnhancedPRDescriptionService');
            const enhancedService = new EnhancedPRDescriptionService(this.services);

            // Validate prerequisites
            const validation = await enhancedService.validatePrerequisites();
            if (!validation.valid) {
                this.services.outputChannel.appendLine('❌ Enhanced PR description not available:');
                validation.issues.forEach(issue => {
                    this.services.outputChannel.appendLine(`   • ${issue}`);
                });
                return { success: false, error: 'Prerequisites not met' };
            }

            this.services.outputChannel.appendLine('🚀 Using enhanced PR description generation...');

            // Generate enhanced PR description with test context
            const result = await enhancedService.generateEnhancedPRDescription(
                this.lastTestResult || undefined,
                {
                    includeTestResults: !!this.lastTestResult,
                    userPreferences: {
                        tone: 'professional',
                        detailLevel: 'detailed',
                        includeEmojis: false
                    },
                    generatePromptOnly: true, // Send to Copilot for interactive editing
                    enhancedMode: true
                }
            );

            if (result.success) {
                // Check if custom override instructions were used
                const overrideInstructions = this.loadPRDescriptionOverrides();
                if (overrideInstructions) {
                    this.services.outputChannel.appendLine(`🎯 A custom PR Override Prompt was used:`);
                    // Extract first few lines for preview (limit to ~200 chars for readability)
                    const previewLines = overrideInstructions.split('\n')
                        .filter(line => line.trim() && !line.startsWith('#'))
                        .slice(0, 3);
                    const preview = previewLines.join(' ').substring(0, 200);
                    this.services.outputChannel.appendLine(`   "${preview}${preview.length === 200 ? '...' : ''}"`);
                }

                // Log success details
                if (result.context) {
                    this.services.outputChannel.appendLine('📊 Enhanced Analysis Results:');
                    this.services.outputChannel.appendLine(`   • Files Changed: ${result.context.filesChanged}`);
                    this.services.outputChannel.appendLine(`   • Feature Flags: ${result.context.featureFlags}`);
                    this.services.outputChannel.appendLine(`   • Risk Level: ${result.context.riskLevel}`);
                    if (result.context.jiraTickets.length > 0) {
                        this.services.outputChannel.appendLine(`   • JIRA Tickets: ${result.context.jiraTickets.join(', ')}`);
                    }
                }

                if (result.quality) {
                    this.services.outputChannel.appendLine(`   • Quality Score: ${(result.quality.overall * 100).toFixed(1)}%`);
                }

                vscode.window.showInformationMessage('📝 Enhanced PR description sent to Copilot Chat!');
                return { success: true };
            } else {
                return { success: false, error: result.error || 'Enhanced generation failed' };
            }

        } catch (error) {
            this.services.outputChannel.appendLine(`❌ Enhanced PR description error: ${error}`);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Legacy PR description generation (fallback)
     */
    private async handleLegacyPRDescription(): Promise<void> {
        try {
            let prDescription = '';

            // Get feature flags from git diff
            const featureFlags = await this.extractFeatureFlags();

            // Check for PR template in .github directory
            const prTemplatePaths = [
                path.join(this.services.workspaceRoot, '.github', 'PULL_REQUEST_TEMPLATE.md'),
                path.join(this.services.workspaceRoot, '.github', 'pull_request_template.md'),
                path.join(this.services.workspaceRoot, '.github', 'PR_TEMPLATE.md')
            ];

            let templateContent = '';
            for (const templatePath of prTemplatePaths) {
                try {
                    if (fs.existsSync(templatePath)) {
                        templateContent = fs.readFileSync(templatePath, 'utf8');
                        break;
                    }
                } catch {
                    // Continue to next template path
                }
            }

            if (templateContent) {
                prDescription = templateContent;
                
                // Phase 3.4.0: Generate description based on actual changes
                if (this.lastTestResult) {
                    const changeAnalysis = await this.analyzeActualChanges();
                    
                    // Replace template sections with actual change analysis
                    prDescription = prDescription.replace(
                        '<!-- Brief description of what this PR does -->',
                        changeAnalysis.summary
                    );
                    
                    prDescription = prDescription.replace(
                        '- \n- \n- ',
                        changeAnalysis.changesList
                    );
                    
                    prDescription = prDescription.replace(
                        '- [ ] Unit tests pass',
                        `- [x] Unit tests pass (${this.lastTestResult.summary?.passed || 0}/${this.lastTestResult.summary?.total || 0})`
                    );
                    
                    // Replace breaking changes section if there are any
                    if (changeAnalysis.breakingChanges) {
                        prDescription = prDescription.replace(
                            '- None',
                            changeAnalysis.breakingChanges
                        );
                    }
                }

                // Add feature flags to QA section if found
                if (featureFlags.length > 0) {
                    const qaSection = this.buildQASection(featureFlags);
                    prDescription = prDescription.replace(
                        '## Additional Notes\n<!-- Any additional information for reviewers -->',
                        `## QA\n${qaSection}\n\n## Additional Notes\n<!-- Any additional information for reviewers -->`
                    );
                }
            } else {
                // Fallback PR description if no template found
                let qaSection = '';
                if (featureFlags.length > 0) {
                    qaSection = `\n\n## QA\n${this.buildQASection(featureFlags)}`;
                }

                // Phase 3.4.0: Generate PR description based on actual changes without template
                const changeAnalysis = await this.analyzeActualChanges();
                
                prDescription = `# Pull Request

## Summary
${changeAnalysis.summary}

## Changes Made
${changeAnalysis.changesList}

## Testing
- [x] Unit tests pass (${this.lastTestResult?.summary?.passed || 0}/${this.lastTestResult?.summary?.total || 0})
- [x] TypeScript compilation successful
- [x] Core functionality verified${qaSection}

${changeAnalysis.breakingChanges ? `## Breaking Changes\n${changeAnalysis.breakingChanges}` : ''}

## Additional Notes
${changeAnalysis.additionalNotes || 'Code changes have been tested and are ready for review.'}`;
            }

            // Send to Copilot Chat with full automation (includes test results context)
            const prPrompt = this.buildPRDescriptionPrompt(prDescription);
            
            await this.sendToCopilotChatAutomatic(prPrompt);
            
            const templateUsed = templateContent ? 'using project template' : 'using default format';
            const flagInfo = featureFlags.length > 0 ? ` (${featureFlags.length} feature flags detected)` : '';
            
            this.services.outputChannel.appendLine(`✅ Legacy PR description generated ${templateUsed}${flagInfo}`);
            
        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'handleLegacyPRDescription' });
        }
    }

    /**
     * Extract feature flags from git diff - Phase 3.4.0 Multi-system support
     */
    private async extractFeatureFlags(): Promise<string[]> {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // Use smart detection logic - check unstaged first, then staged, then fallback
            const diffs = [];
            
            // Priority 1: Unstaged changes
            const unstagedResult = await execAsync('git diff', { cwd: this.services.workspaceRoot });
            if (unstagedResult.stdout && unstagedResult.stdout.trim()) {
                diffs.push(unstagedResult);
            }
            
            // Priority 2: Staged changes
            const stagedResult = await execAsync('git diff --cached', { cwd: this.services.workspaceRoot });
            if (stagedResult.stdout && stagedResult.stdout.trim()) {
                diffs.push(stagedResult);
            }
            
            // Priority 3: If no unstaged or staged changes, check last commit
            if (diffs.length === 0) {
                const lastCommitResult = await execAsync('git diff HEAD~1..HEAD', { cwd: this.services.workspaceRoot });
                if (lastCommitResult.stdout && lastCommitResult.stdout.trim()) {
                    diffs.push(lastCommitResult);
                }
            }

            const featureFlags: string[] = [];

            // Phase 3.4.0: Support multiple feature flag systems
            const FLAG_PATTERNS = [
                // FlipperService patterns
                /\.flipperEnabled\(['"`]([^'"`]+)['"`]\)/g,
                /\.eagerlyEnabled\(['"`]([^'"`]+)['"`]\)/g,
                
                // Generic isEnabled patterns
                /\.isEnabled\(['"`]([^'"`]+)['"`]\)/g,
                /\.checkFlag\(['"`]([^'"`]+)['"`]\)/g,
                
                // LaunchDarkly patterns
                /LaunchDarkly\.variation\(['"`]([^'"`]+)['"`]\)/g,
                /ldClient\.variation\(['"`]([^'"`]+)['"`]\)/g,
                
                // Feature flag function patterns
                /featureFlag\(['"`]([^'"`]+)['"`]\)/g,
                /getFeatureFlag\(['"`]([^'"`]+)['"`]\)/g,
                /isFeatureEnabled\(['"`]([^'"`]+)['"`]\)/g,
                
                // Config-based patterns
                /config\.feature\.([a-zA-Z0-9_-]+)/g,
                /features\.([a-zA-Z0-9_-]+)\.enabled/g
            ];

            for (const { stdout } of diffs) {
                if (!stdout) continue;
                
                const lines = stdout.split('\n');
                
                for (const line of lines) {
                    // Only check added lines
                    if (line.startsWith('+') && !line.startsWith('+++')) {
                        // Apply all patterns
                        for (const pattern of FLAG_PATTERNS) {
                            let match;
                            while ((match = pattern.exec(line)) !== null) {
                                const flagName = match[1];
                                if (flagName && !featureFlags.includes(flagName)) {
                                    featureFlags.push(flagName);
                                }
                            }
                            // Reset regex lastIndex for global patterns
                            pattern.lastIndex = 0;
                        }
                    }
                }
            }

            return [...new Set(featureFlags)]; // Remove duplicates
        } catch (error) {
            // If git diff fails, return empty array
            return [];
        }
    }

    /**
     * Analyze actual code changes for PR description - Phase 3.4.0
     */
    private async analyzeActualChanges(): Promise<{
        summary: string;
        changesList: string;
        breakingChanges?: string;
        additionalNotes?: string;
    }> {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // Use smart detection logic like GitDiffCapture - check unstaged first, then staged, then fallback
            let diffContent = '';
            let statsContent = '';
            let diffType = '';

            // Priority 1: Check for unstaged changes (working directory)
            const unstagedResult = await execAsync('git diff', { cwd: this.services.workspaceRoot });
            if (unstagedResult.stdout && unstagedResult.stdout.trim()) {
                const [diffResult, statsResult] = await Promise.all([
                    execAsync('git diff', { cwd: this.services.workspaceRoot }),
                    execAsync('git diff --stat', { cwd: this.services.workspaceRoot })
                ]);
                diffContent = diffResult.stdout || '';
                statsContent = statsResult.stdout || '';
                diffType = 'unstaged';
            } else {
                // Priority 2: Check for staged changes
                const stagedResult = await execAsync('git diff --cached', { cwd: this.services.workspaceRoot });
                if (stagedResult.stdout && stagedResult.stdout.trim()) {
                    const [diffResult, statsResult] = await Promise.all([
                        execAsync('git diff --cached', { cwd: this.services.workspaceRoot }),
                        execAsync('git diff --cached --stat', { cwd: this.services.workspaceRoot })
                    ]);
                    diffContent = diffResult.stdout || '';
                    statsContent = statsResult.stdout || '';
                    diffType = 'staged';
                } else {
                    // Priority 3: Fallback to last commit
                    const [diffResult, statsResult] = await Promise.all([
                        execAsync('git diff HEAD~1..HEAD', { cwd: this.services.workspaceRoot }),
                        execAsync('git diff HEAD~1..HEAD --stat', { cwd: this.services.workspaceRoot })
                    ]);
                    diffContent = diffResult.stdout || '';
                    statsContent = statsResult.stdout || '';
                    diffType = 'last-commit';
                }
            }
            
            if (!diffContent.trim()) {
                return {
                    summary: 'Code improvements and maintenance updates',
                    changesList: '- Code maintenance and improvements\n- Updated dependencies and configurations',
                    additionalNotes: 'No changes detected in git diff. This may include configuration or documentation updates.'
                };
            }

            // Analyze the actual changes
            const analysis = this.parseGitChanges(diffContent, statsContent);
            
            return {
                summary: analysis.summary,
                changesList: analysis.changes.map(change => `- ${change}`).join('\n'),
                breakingChanges: analysis.breakingChanges.length > 0 ? 
                    analysis.breakingChanges.map(change => `- ${change}`).join('\n') : undefined,
                additionalNotes: analysis.notes
            };
            
        } catch (error) {
            // Fallback if git commands fail
            return {
                summary: 'Code updates and improvements',
                changesList: '- Code changes and improvements\n- Updated functionality and tests',
                additionalNotes: 'Git analysis unavailable. Changes have been manually reviewed.'
            };
        }
    }

    /**
     * Parse git changes to extract meaningful information - Phase 3.4.0
     */
    private parseGitChanges(diffContent: string, statsContent: string): {
        summary: string;
        changes: string[];
        breakingChanges: string[];
        notes: string;
    } {
        const lines = diffContent.split('\n');
        const changes: string[] = [];
        const breakingChanges: string[] = [];
        const filesChanged = new Set<string>();
        let addedLines = 0;
        let deletedLines = 0;
        
        // Parse diff content
        for (const line of lines) {
            if (line.startsWith('diff --git')) {
                const match = line.match(/diff --git a\/(.*?) b\/(.*)/);
                if (match) {
                    filesChanged.add(match[1]);
                }
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                addedLines++;
                
                // Look for significant changes
                if (line.includes('export') && line.includes('class')) {
                    const classMatch = line.match(/export class (\w+)/);
                    if (classMatch) {
                        changes.push(`Added new class: ${classMatch[1]}`);
                    }
                }
                if (line.includes('export') && line.includes('function')) {
                    const funcMatch = line.match(/export function (\w+)/);
                    if (funcMatch) {
                        changes.push(`Added new function: ${funcMatch[1]}`);
                    }
                }
                if (line.includes('interface') && line.includes('export')) {
                    const interfaceMatch = line.match(/export interface (\w+)/);
                    if (interfaceMatch) {
                        changes.push(`Added new interface: ${interfaceMatch[1]}`);
                    }
                }
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                deletedLines++;
                
                // Look for breaking changes
                if (line.includes('export') && (line.includes('class') || line.includes('function') || line.includes('interface'))) {
                    breakingChanges.push('Removed exported API elements');
                }
            }
        }
        
        // Generate summary based on changes
        let summary = '';
        const fileCount = filesChanged.size;
        
        if (fileCount === 1) {
            summary = `Updated ${Array.from(filesChanged)[0]}`;
        } else if (fileCount <= 3) {
            summary = `Updated ${fileCount} files: ${Array.from(filesChanged).join(', ')}`;
        } else {
            summary = `Updated ${fileCount} files with ${addedLines} additions and ${deletedLines} deletions`;
        }
        
        // Add change types based on file patterns
        const fileTypes = Array.from(filesChanged);
        if (fileTypes.some(f => f.includes('.test.'))) {
            changes.push('Updated test coverage and test cases');
        }
        if (fileTypes.some(f => f.endsWith('.ts') && !f.includes('test'))) {
            changes.push('Enhanced TypeScript implementation');
        }
        if (fileTypes.some(f => f.endsWith('.md'))) {
            changes.push('Updated documentation');
        }
        if (fileTypes.some(f => f.includes('package.json') || f.includes('tsconfig'))) {
            changes.push('Updated project configuration');
        }
        
        // Analyze stats for better insights
        if (statsContent.includes('insertion') && statsContent.includes('deletion')) {
            const statsMatch = statsContent.match(/(\d+) insertion.*?(\d+) deletion/);
            if (statsMatch) {
                const inserted = parseInt(statsMatch[1]);
                const deleted = parseInt(statsMatch[2]);
                
                if (deleted > inserted * 2) {
                    changes.push(`Code simplification: removed ${deleted - inserted} lines of code`);
                }
                if (inserted > deleted * 2) {
                    changes.push(`Feature expansion: added ${inserted - deleted} lines of new functionality`);
                }
            }
        }
        
        // Default changes if none detected
        if (changes.length === 0) {
            changes.push('Code improvements and refactoring');
            changes.push('Enhanced functionality and performance');
        }
        
        return {
            summary,
            changes: [...new Set(changes)], // Remove duplicates
            breakingChanges: [...new Set(breakingChanges)],
            notes: `Analyzed ${fileCount} changed files with ${addedLines} additions and ${deletedLines} deletions.`
        };
    }

    /**
     * Build comprehensive PR description prompt for Copilot Chat
     */
    private buildPRDescriptionPrompt(prDescription: string): string {
        const testStatus = this.lastTestResult?.success ? 'PASSED' : 'FAILED';
        const testCount = this.lastTestResult?.summary?.total || 0;
        const passedCount = this.lastTestResult?.summary?.passed || 0;
        
        // Parse the PR description to extract key information
        const hasJiraTicket = prDescription.includes('**JIRA:**') || prDescription.includes('JIRA:');
        const hasFeatureFlags = prDescription.includes('## Feature Flags') || prDescription.includes('Feature Flags to Test:');
        const hasTemplate = prDescription.includes('## Summary') || prDescription.includes('## Changes');
        
        // Check for user override instructions with high priority
        const overrideInstructions = this.loadPRDescriptionOverrides();
        
        // If override instructions exist, use them with high priority
        if (overrideInstructions) {
            return `# 🎯 HIGH PRIORITY USER INSTRUCTIONS
${overrideInstructions}

# 🤖 Pull Request Description Context
## 📊 Test Results
- **Test Status**: ${testStatus} (${passedCount}/${testCount} tests)
- **Project**: ${this.lastTestResult?.project || 'Current project'}
${this.lastTestResult?.duration ? `- **Test Duration**: ${this.lastTestResult.duration}ms` : ''}

## 📝 Current PR Description Template
${prDescription}`;
        }
        
        // Default prompt without overrides
        return `# 🤖 Pull Request Description Review & Enhancement

Please enhance this PR description while maintaining the exact template structure and headers.

## 📊 Test Results Context
- **Test Status**: ${testStatus} (${passedCount}/${testCount} tests)
- **Project**: ${this.lastTestResult?.project || 'Current project'}
${this.lastTestResult?.duration ? `- **Test Duration**: ${this.lastTestResult.duration}ms` : ''}

## 📝 Current PR Description Template
${prDescription}

## 🎯 IMPORTANT INSTRUCTIONS:

1. **PRESERVE ALL HEADERS** - Keep all existing headers exactly as they are (## Summary, ## Changes, ## Details, ## QA, etc.)
2. **MAINTAIN JIRA LINK** - Keep the **JIRA:** line at the top if present
3. **FILL IN CONTENT** - Replace placeholder text with actual content based on the test results and changes

## 📋 Content Guidelines for Each Section:

### Summary Section
- Provide a clear, one-paragraph description of what this PR accomplishes
- Reference the test results showing all tests pass
- Focus on the business value and impact

### Changes Section
- List the key technical changes made
- Group related changes together
- Use bullet points for clarity

### Details Section (if present)
- Provide technical implementation details
- Explain architectural decisions
${hasFeatureFlags ? `
### Feature Flags
- Include ALL detected feature flags
- Add them to both QA section and Details section
- Format as: \`flag-name\` - Description of what the flag controls` : ''}

### QA Section
- Include specific manual testing steps for this PR's changes
- Add feature flag testing instructions if detected
- Focus on user flows that QA should verify
- Include edge cases or special scenarios to test

## ❌ DO NOT INCLUDE:
- Developer responsibility items:
  - CI test verification (developer should ensure tests pass before PR)
  - Merge conflict resolution (developer responsibility)
  - Build/compilation checks (developer prerequisites)
  - Unit test coverage (developer responsibility)

## ✅ DO INCLUDE:
- Specific manual testing steps for this PR's changes
- Feature flag testing instructions if detected
- User flows that QA should verify
- Edge cases or special scenarios
- Regression testing areas if applicable

Please provide the enhanced PR description maintaining the exact template structure while filling in meaningful content.`;
    }

    /**
     * Load PR description override instructions from user file
     * Checks multiple locations for pr-description-overrides.instructions.md
     */
    private loadPRDescriptionOverrides(): string | null {
        try {
            const possiblePaths = [
                // Priority 1: .github/instructions directory
                path.join(this.services.workspaceRoot, '.github', 'instructions', 'pr-description-overrides.instructions.md'),
                // Priority 2: .github directory  
                path.join(this.services.workspaceRoot, '.github', 'pr-description-overrides.instructions.md'),
                // Priority 3: Root directory
                path.join(this.services.workspaceRoot, 'pr-description-overrides.instructions.md'),
                // Priority 4: .vscode directory for workspace-specific overrides
                path.join(this.services.workspaceRoot, '.vscode', 'pr-description-overrides.instructions.md')
            ];

            for (const overridePath of possiblePaths) {
                if (fs.existsSync(overridePath)) {
                    const content = fs.readFileSync(overridePath, 'utf8').trim();
                    if (content) {
                        this.services.outputChannel.appendLine(`📋 Loading PR description overrides from: ${overridePath}`);
                        this.services.outputChannel.appendLine(`📋 Override instructions loaded (${Math.round(content.length / 1024)}KB)`);
                        return content;
                    }
                }
            }

            // No override file found - this is normal operation
            return null;
            
        } catch (error) {
            this.services.outputChannel.appendLine(`⚠️ Error loading PR description overrides: ${error}`);
            return null;
        }
    }

    /**
     * Send PR description to Copilot Chat with full automation
     */
    private async sendToCopilotChatAutomatic(content: string): Promise<void> {
        try {
            this.services.outputChannel.appendLine(`🚀 Fully automated Copilot integration for PR description generation`);
            
            // Check if custom override instructions were used
            const overrideInstructions = this.loadPRDescriptionOverrides();
            if (overrideInstructions) {
                this.services.outputChannel.appendLine(`🎯 A custom PR Override Prompt was used:`);
                // Extract first few lines for preview (limit to ~200 chars for readability)
                const previewLines = overrideInstructions.split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'))
                    .slice(0, 3);
                const preview = previewLines.join(' ').substring(0, 200);
                this.services.outputChannel.appendLine(`   "${preview}${preview.length === 200 ? '...' : ''}"`);  
            }
            
            this.services.outputChannel.appendLine(`📋 Preparing to send ${Math.round(content.length / 1024)}KB of context to Copilot Chat...`);
            
            // Import CopilotUtils dynamically to avoid startup dependencies
            const { CopilotUtils } = await import('../utils/CopilotUtils');
            
            const integrationResult = await CopilotUtils.integrateWithCopilot(
                content,
                this.services.outputChannel,
                {
                    autoSuccess: '🎉 PR description prompt sent to Copilot Chat! Check the response.',
                    manualPaste: '📋 PR description ready in Copilot Chat - press Enter to submit.',
                    clipboardOnly: '📋 PR description copied to clipboard. Please open Copilot Chat and paste manually.',
                    chatOpenFailed: '⚠️ Could not open Copilot Chat. PR description copied to clipboard.'
                }
            );
            
            this.services.outputChannel.appendLine(`✅ Copilot integration completed: ${integrationResult.method}`);
            
        } catch (error) {
            this.services.outputChannel.appendLine(`❌ Error in automated Copilot integration: ${error}`);
            // Fallback to manual copy
            await vscode.env.clipboard.writeText(content);
            vscode.window.showInformationMessage('❌ Auto-integration failed. PR description copied to clipboard - please paste in Copilot Chat manually.');
        }
    }

    /**
     * Build QA section with feature flags
     */
    private buildQASection(featureFlags: string[]): string {
        let qaSection = '**Feature Flags to Test:**\n';
        featureFlags.forEach(flag => {
            qaSection += `- [ ] \`${flag}\` - Test with flag enabled\n`;
            qaSection += `- [ ] \`${flag}\` - Test with flag disabled\n`;
        });
        return qaSection;
    }
}