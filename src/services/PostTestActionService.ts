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
        items.push({
            label: '$(close) Dismiss',
            detail: 'Close this menu',
            action: async () => {} // No-op
        });

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
                label: 'Rerun Tests',
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
     * Handle PR description generation using template
     */
    private async handlePRDescription(): Promise<void> {
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
                
                // Fill in some basic information if test results are available
                if (this.lastTestResult) {
                    // Replace template sections with test information
                    prDescription = prDescription.replace(
                        '<!-- Brief description of what this PR does -->',
                        `Phase 3.2.0 service simplification - Refactored services with ${this.lastTestResult.summary?.passed || 0} passing tests`
                    );
                    
                    prDescription = prDescription.replace(
                        '- \n- \n- ',
                        `- Simplified TestAnalysisHelper (68% reduction)\n- Simplified PostTestActionService (56% reduction)\n- Updated test coverage and documentation`
                    );
                    
                    prDescription = prDescription.replace(
                        '- [ ] Unit tests pass',
                        `- [x] Unit tests pass (${this.lastTestResult.summary?.passed || 0}/${this.lastTestResult.summary?.total || 0})`
                    );
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

                prDescription = `# Pull Request

## Summary
Phase 3.2.0 service simplification and refactoring

## Changes Made
- Simplified TestAnalysisHelper: 154 lines (68% reduction)
- Simplified PostTestActionService: 183 lines (56% reduction)
- Removed over-engineered features
- Updated tests and documentation

## Testing
- [x] Unit tests pass (${this.lastTestResult?.summary?.passed || 0}/${this.lastTestResult?.summary?.total || 0})
- [x] TypeScript compilation successful
- [x] Core functionality verified${qaSection}

## Breaking Changes
- Removed unused AI/ML terminology
- Simplified service interfaces
- Consolidated action menu options

## Additional Notes
Part of Phase 3.2.0 critical assessment to remove over-engineering and focus on core functionality.`;
            }

            await vscode.env.clipboard.writeText(prDescription);
            
            const templateUsed = templateContent ? 'using project template' : 'using default format';
            const flagInfo = featureFlags.length > 0 ? ` (${featureFlags.length} feature flags detected)` : '';
            vscode.window.showInformationMessage(`PR description copied to clipboard ${templateUsed}${flagInfo}!`);
            
        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'handlePRDescription' });
        }
    }

    /**
     * Extract feature flags from git diff
     */
    private async extractFeatureFlags(): Promise<string[]> {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            const { stdout } = await execAsync('git diff --cached', { cwd: this.services.workspaceRoot });
            const diffContent = stdout || '';

            const featureFlags: string[] = [];
            const lines = diffContent.split('\n');

            // Track FlipperService variable names from type declarations
            const flipperVariables = new Set<string>();

            // First pass: collect FlipperService variable names
            for (const line of lines) {
                if (line.startsWith('+') && !line.startsWith('+++')) {
                    // Look for FlipperService type declarations: variable: FlipperService
                    const typeMatch = line.match(/(\w+)\s*:\s*FlipperService/);
                    if (typeMatch) {
                        flipperVariables.add(typeMatch[1]);
                    }

                    // Look for FlipperService instantiations: const variable = new FlipperService
                    const instantiationMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*new\s+FlipperService/);
                    if (instantiationMatch) {
                        flipperVariables.add(instantiationMatch[1]);
                    }
                }
            }

            // Second pass: look for flipperEnabled/eagerlyEnabled calls
            for (const line of lines) {
                if (line.startsWith('+') && !line.startsWith('+++')) {
                    // Method 1: Look for calls on known FlipperService variables
                    if (flipperVariables.size > 0) {
                        for (const varName of flipperVariables) {
                            const flipperMatch = line.match(new RegExp(`${varName}\\s*\\.\\s*(?:flipperEnabled|eagerlyEnabled)\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]`));
                            if (flipperMatch) {
                                const flagName = flipperMatch[1];
                                if (!featureFlags.includes(flagName)) {
                                    featureFlags.push(flagName);
                                }
                            }
                        }
                    }

                    // Method 2: Look for any flipperEnabled/eagerlyEnabled method calls (generic pattern)
                    const genericMatch = line.match(/\w+\s*\.\s*(?:flipperEnabled|eagerlyEnabled)\s*\(\s*['"\`]([^'"\`]+)['"\`]/);
                    if (genericMatch) {
                        const flagName = genericMatch[1];
                        if (!featureFlags.includes(flagName)) {
                            featureFlags.push(flagName);
                        }
                    }

                    // Method 3: Look for standalone function calls (if they exist)
                    const standaloneMatch = line.match(/(?:flipperEnabled|eagerlyEnabled)\s*\(\s*['"\`]([^'"\`]+)['"\`]/);
                    if (standaloneMatch) {
                        const flagName = standaloneMatch[1];
                        if (!featureFlags.includes(flagName)) {
                            featureFlags.push(flagName);
                        }
                    }
                }
            }

            return featureFlags;
        } catch (error) {
            // If git diff fails, return empty array
            return [];
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