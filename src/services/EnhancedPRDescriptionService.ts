/**
 * Enhanced PR Description Service
 * Phase 4 implementation of PR Description Enhancement Plan 3.5.2
 * Main orchestrator service that integrates all enhanced components
 */

import * as vscode from 'vscode';
import { ServiceContainer } from '../core/ServiceContainer';
import { GitDiffAnalysisService, GitDiffAnalysis } from './GitDiffAnalysisService';
import { TemplateDetectionService, TemplateStructure } from './TemplateDetectionService';
import { PromptTemplateEngine, PRContext } from './PromptTemplateEngine';
import { ContentGenerationService, GeneratedContent } from './ContentGenerationService';
import { TestResult } from './TestExecutionService';

export interface PRDescriptionOptions {
    includeTestResults?: boolean;
    userPreferences?: {
        tone: 'professional' | 'casual' | 'technical';
        detailLevel: 'brief' | 'detailed' | 'comprehensive';
        includeEmojis: boolean;
    };
    generatePromptOnly?: boolean;
    enhancedMode?: boolean;
}

export interface PRDescriptionResult {
    success: boolean;
    description?: string;
    prompt?: string;
    quality?: {
        overall: number;
        issues: string[];
        suggestions: string[];
    };
    context?: {
        filesChanged: number;
        featureFlags: number;
        riskLevel: string;
        jiraTickets: string[];
    };
    error?: string;
}

/**
 * Enhanced service for comprehensive PR description generation
 * Integrates all Phase 1-3 components with existing VSCode extension
 */
export class EnhancedPRDescriptionService {
    private diffAnalysisService: GitDiffAnalysisService;
    private templateDetectionService: TemplateDetectionService;
    private promptTemplateEngine: PromptTemplateEngine;
    private contentGenerationService: ContentGenerationService;

    constructor(private services: ServiceContainer) {
        this.diffAnalysisService = new GitDiffAnalysisService({
            workspaceRoot: services.workspaceRoot,
            outputChannel: services.outputChannel
        });
        
        this.templateDetectionService = new TemplateDetectionService({
            workspaceRoot: services.workspaceRoot,
            outputChannel: services.outputChannel
        });
        
        this.promptTemplateEngine = new PromptTemplateEngine();
        this.contentGenerationService = new ContentGenerationService();
    }

    /**
     * Generate enhanced PR description with comprehensive analysis
     */
    async generateEnhancedPRDescription(
        testResult?: TestResult,
        options: PRDescriptionOptions = {}
    ): Promise<PRDescriptionResult> {
        try {
            this.services.outputChannel.appendLine('🚀 Starting enhanced PR description generation...');
            
            // Phase 1: Analyze git diff for comprehensive context
            const diffAnalysis = await this.diffAnalysisService.analyzeDiff();
            if (!diffAnalysis) {
                return { success: false, error: 'Failed to analyze git diff' };
            }

            // Phase 2: Detect and analyze template structure
            const templateStructure = await this.templateDetectionService.detectTemplate();
            if (!templateStructure) {
                return { success: false, error: 'Failed to detect template structure' };
            }

            // Prepare context for generation
            const context: PRContext = {
                diffAnalysis,
                templateStructure,
                testResults: testResult ? this.formatTestResults(testResult) : undefined,
                userPreferences: options.userPreferences || {
                    tone: 'professional',
                    detailLevel: 'detailed',
                    includeEmojis: false
                }
            };

            this.services.outputChannel.appendLine('✅ Context analysis completed');
            this.logAnalysisSummary(diffAnalysis, templateStructure);

            // Phase 3: Generate content or prompt based on options
            if (options.generatePromptOnly) {
                return await this.generatePromptOnly(context);
            } else {
                return await this.generateFullDescription(context, options);
            }

        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'generateEnhancedPRDescription' });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Enhanced PR description generation failed'
            };
        }
    }

    /**
     * Generate comprehensive prompt for Copilot Chat
     */
    private async generatePromptOnly(context: PRContext): Promise<PRDescriptionResult> {
        try {
            const prompt = this.promptTemplateEngine.generateComprehensivePrompt(context);
            
            // Send to Copilot Chat
            await this.sendToCopilotChat(prompt);
            
            return {
                success: true,
                prompt,
                context: this.createContextSummary(context.diffAnalysis)
            };
            
        } catch (error) {
            return {
                success: false,
                error: 'Failed to generate and send prompt'
            };
        }
    }

    /**
     * Generate full PR description using AI content generation
     */
    private async generateFullDescription(
        context: PRContext, 
        options: PRDescriptionOptions
    ): Promise<PRDescriptionResult> {
        try {
            this.services.outputChannel.appendLine('🤖 Generating AI-enhanced content...');
            
            // Generate content using AI
            const generationResult = await this.contentGenerationService.generatePRDescription(
                context.diffAnalysis,
                context.templateStructure,
                context.testResults,
                context.userPreferences
            );

            if (!generationResult.success || !generationResult.content) {
                // Fallback to prompt-only mode
                this.services.outputChannel.appendLine('⚠️  AI generation failed, falling back to prompt mode');
                return await this.generatePromptOnly(context);
            }

            const generated = generationResult.content;
            
            this.services.outputChannel.appendLine(`✅ Content generated (quality: ${(generated.quality.overall * 100).toFixed(1)}%)`);
            
            // Send to Copilot Chat for final review/editing
            if (options.enhancedMode !== false) {
                const reviewPrompt = this.createReviewPrompt(generated, context);
                await this.sendToCopilotChat(reviewPrompt);
            } else {
                // Direct copy to clipboard
                await vscode.env.clipboard.writeText(generated.description);
                vscode.window.showInformationMessage('Enhanced PR description copied to clipboard');
            }

            return {
                success: true,
                description: generated.description,
                quality: {
                    overall: generated.quality.overall,
                    issues: generated.quality.issues,
                    suggestions: generated.quality.suggestions
                },
                context: this.createContextSummary(context.diffAnalysis)
            };

        } catch (error) {
            return {
                success: false,
                error: 'Failed to generate full description'
            };
        }
    }

    /**
     * Create review prompt for generated content
     */
    private createReviewPrompt(generated: GeneratedContent, context: PRContext): string {
        const qualityIssues = generated.quality.issues.length > 0 ? 
            `\n**Quality Issues to Address:**\n${generated.quality.issues.map(issue => `- ${issue}`).join('\n')}\n` : '';
            
        const suggestions = generated.quality.suggestions.length > 0 ?
            `\n**Improvement Suggestions:**\n${generated.quality.suggestions.map(s => `- ${s}`).join('\n')}\n` : '';

        return `# 🎯 Enhanced PR Description Review

I've generated a PR description with ${(generated.quality.overall * 100).toFixed(1)}% quality score. Please review and enhance as needed.

## 📊 Quality Analysis
- **Overall Score:** ${(generated.quality.overall * 100).toFixed(1)}%
- **Completeness:** ${(generated.quality.metrics.completeness * 100).toFixed(1)}%
- **Specificity:** ${(generated.quality.metrics.specificity * 100).toFixed(1)}%
- **Actionability:** ${(generated.quality.metrics.actionability * 100).toFixed(1)}%
${qualityIssues}${suggestions}

## 📝 Generated PR Description
\`\`\`markdown
${generated.description}
\`\`\`

## 🎯 Instructions
Please review the generated content and:
1. Fix any quality issues identified above
2. Enhance sections that seem generic or incomplete
3. Ensure all technical details are accurate
4. Verify QA instructions are specific and actionable
5. Maintain the exact template structure and formatting

The description is ready to use as-is, but your review will make it even better!`;
    }

    /**
     * Send content to Copilot Chat
     */
    private async sendToCopilotChat(content: string): Promise<void> {
        try {
            this.services.outputChannel.appendLine(`📤 Sending to Copilot Chat (${Math.round(content.length / 1024)}KB)...`);
            
            // Use existing CopilotUtils for integration
            const { CopilotUtils } = await import('../utils/CopilotUtils');
            
            const result = await CopilotUtils.integrateWithCopilot(
                content,
                this.services.outputChannel,
                {
                    autoSuccess: '🎉 Enhanced PR description sent to Copilot Chat!',
                    manualPaste: '📋 Enhanced PR description ready - press Enter to submit.',
                    clipboardOnly: '📋 Enhanced PR description copied to clipboard.',
                    chatOpenFailed: '⚠️  Could not open Copilot Chat. Content copied to clipboard.'
                }
            );

            this.services.outputChannel.appendLine(`✅ Copilot integration: ${result.method}`);
            
        } catch (error) {
            this.services.outputChannel.appendLine(`❌ Copilot integration failed: ${error}`);
            
            // Fallback to clipboard
            await vscode.env.clipboard.writeText(content);
            vscode.window.showWarningMessage('Copilot integration failed. Content copied to clipboard.');
        }
    }

    /**
     * Format test results for context
     */
    private formatTestResults(testResult: TestResult): PRContext['testResults'] {
        return {
            passed: testResult.summary?.passed || 0,
            total: testResult.summary?.total || 0,
            status: testResult.success ? 'PASSED' : 'FAILED',
            duration: testResult.duration
        };
    }

    /**
     * Create context summary for response
     */
    private createContextSummary(diffAnalysis: GitDiffAnalysis) {
        return {
            filesChanged: diffAnalysis.fileChanges.added.length + 
                         diffAnalysis.fileChanges.modified.length + 
                         diffAnalysis.fileChanges.deleted.length,
            featureFlags: diffAnalysis.businessContext.featureFlags.length,
            riskLevel: diffAnalysis.impact.riskLevel,
            jiraTickets: diffAnalysis.businessContext.jiraTickets.map(t => t.key)
        };
    }

    /**
     * Log analysis summary for debugging
     */
    private logAnalysisSummary(diffAnalysis: GitDiffAnalysis, template: TemplateStructure): void {
        this.services.outputChannel.appendLine('📊 Analysis Summary:');
        this.services.outputChannel.appendLine(`   • Files: ${diffAnalysis.fileChanges.added.length} added, ${diffAnalysis.fileChanges.modified.length} modified`);
        this.services.outputChannel.appendLine(`   • Components: ${diffAnalysis.codeAnalysis.newComponents.length} new, ${diffAnalysis.codeAnalysis.modifiedComponents.length} modified`);
        this.services.outputChannel.appendLine(`   • Feature Flags: ${diffAnalysis.businessContext.featureFlags.length} detected`);
        this.services.outputChannel.appendLine(`   • JIRA Tickets: ${diffAnalysis.businessContext.jiraTickets.map(t => t.key).join(', ') || 'None'}`);
        this.services.outputChannel.appendLine(`   • Risk Level: ${diffAnalysis.impact.riskLevel.toUpperCase()}`);
        this.services.outputChannel.appendLine(`   • Template: ${template.source} (${template.sections.length} sections, ${template.format})`);
    }

    /**
     * Validate prerequisites for enhanced generation
     */
    async validatePrerequisites(): Promise<{ valid: boolean; issues: string[] }> {
        const issues = [];

        try {
            // Check git repository
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            await execAsync('git status', { cwd: this.services.workspaceRoot });
        } catch {
            issues.push('Not in a git repository or git is not available');
        }

        // Check workspace
        if (!this.services.workspaceRoot) {
            issues.push('No workspace folder opened');
        }

        // Check for TypeScript/Angular project indicators
        const packageJsonPath = require('path').join(this.services.workspaceRoot, 'package.json');
        if (!require('fs').existsSync(packageJsonPath)) {
            issues.push('No package.json found - project structure may not be supported');
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Get service status and capabilities
     */
    getServiceStatus(): {
        available: boolean;
        capabilities: string[];
        limitations: string[];
    } {
        return {
            available: true,
            capabilities: [
                'Comprehensive git diff analysis',
                'Angular component detection',
                'Feature flag extraction',
                'JIRA ticket integration',
                'Template structure analysis',
                'Quality-validated content generation',
                'Section-specific prompt engineering',
                'Copilot Chat integration'
            ],
            limitations: [
                'Requires git repository',
                'Optimized for Angular/TypeScript projects',
                'Copilot Chat integration depends on extension availability'
            ]
        };
    }

    /**
     * Generate preview without full processing
     */
    async generatePreview(): Promise<{
        filesSummary: string;
        templateSummary: string;
        estimatedQuality: string;
    }> {
        try {
            // Quick analysis for preview
            const diffAnalysis = await this.diffAnalysisService.analyzeDiff();
            const template = await this.templateDetectionService.detectTemplate();

            return {
                filesSummary: `${diffAnalysis.fileChanges.added.length + diffAnalysis.fileChanges.modified.length} files changed`,
                templateSummary: `${template.sections.length} sections (${template.source})`,
                estimatedQuality: diffAnalysis.impact.riskLevel === 'low' ? 'High' : 
                                 diffAnalysis.impact.riskLevel === 'medium' ? 'Medium' : 'Requires Review'
            };
        } catch (error) {
            return {
                filesSummary: 'Analysis failed',
                templateSummary: 'Template detection failed', 
                estimatedQuality: 'Unknown'
            };
        }
    }
}