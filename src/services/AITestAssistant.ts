/**
 * AI Test Assistant
 * Direct AI integration for test failure analysis and fixes
 * Phase 2.0.3 - Real AI assistance, not just clipboard copying
 */

import * as vscode from 'vscode';
import { TestIntelligenceEngine, TestInsight } from '../core/TestIntelligenceEngine';
import { TestFailure } from '../utils/testResultParser';

export interface AIAnalysis {
    summary: string;
    rootCause: string;
    suggestedFix: string;
    codeChanges?: Array<{
        file: string;
        line: number;
        original: string;
        suggested: string;
        explanation: string;
    }>;
    relatedIssues?: string[];
    confidence: number;
}

export interface TestSuggestion {
    type: 'new_test' | 'improve_test' | 'remove_test' | 'refactor_test';
    testName: string;
    reason: string;
    code?: string;
    priority: 'high' | 'medium' | 'low';
}

/**
 * AI-powered test assistance
 */
export class AITestAssistant {
    private analysisCache = new Map<string, AIAnalysis>();
    private readonly maxCacheSize = 100;

    constructor(
        private testIntelligence: TestIntelligenceEngine,
        private workspaceRoot: string,
        private outputChannel: vscode.OutputChannel
    ) {}

    /**
     * Analyze test failure with AI
     */
    async analyzeFailure(
        failure: TestFailure,
        testHistory?: TestInsight
    ): Promise<AIAnalysis> {
        const cacheKey = `${failure.test}::${failure.error}`;
        
        // Check cache
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey)!;
        }

        // Build context for AI
        const context = await this.buildFailureContext(failure, testHistory);
        
        try {
            // In a real implementation, this would call an AI API
            // For now, we'll use pattern matching and heuristics
            const analysis = await this.performAnalysis(failure, context);
            
            // Cache result
            this.cacheAnalysis(cacheKey, analysis);
            
            return analysis;
        } catch (error) {
            this.outputChannel.appendLine(`❌ AI analysis failed: ${error}`);
            return this.getFallbackAnalysis(failure);
        }
    }

    /**
     * Get test improvement suggestions
     */
    async getTestSuggestions(
        projectName: string,
        testFiles: string[]
    ): Promise<TestSuggestion[]> {
        const suggestions: TestSuggestion[] = [];

        // Analyze test coverage gaps
        const coverageGaps = await this.analyzeCoverageGaps(projectName);
        for (const gap of coverageGaps) {
            suggestions.push({
                type: 'new_test',
                testName: gap.suggestedTestName,
                reason: `No test coverage for ${gap.functionality}`,
                code: gap.suggestedCode,
                priority: gap.critical ? 'high' : 'medium'
            });
        }

        // Analyze test quality
        for (const testFile of testFiles) {
            const qualityIssues = await this.analyzeTestQuality(testFile);
            for (const issue of qualityIssues) {
                suggestions.push({
                    type: 'improve_test',
                    testName: issue.testName,
                    reason: issue.reason,
                    code: issue.improvedCode,
                    priority: issue.severity === 'high' ? 'high' : 'medium'
                });
            }
        }

        // Find redundant tests
        const redundantTests = this.findRedundantTests(testFiles);
        for (const redundant of redundantTests) {
            suggestions.push({
                type: 'remove_test',
                testName: redundant.testName,
                reason: `Redundant with ${redundant.duplicateOf}`,
                priority: 'low'
            });
        }

        return suggestions.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    /**
     * Generate fix for test failure
     */
    async generateFix(
        failure: TestFailure,
        analysis: AIAnalysis
    ): Promise<string | null> {
        if (!analysis.codeChanges || analysis.codeChanges.length === 0) {
            return null;
        }

        try {
            // Generate a unified diff
            let diff = '';
            for (const change of analysis.codeChanges) {
                diff += `--- ${change.file}\n`;
                diff += `+++ ${change.file}\n`;
                diff += `@@ -${change.line},1 +${change.line},1 @@\n`;
                diff += `-${change.original}\n`;
                diff += `+${change.suggested}\n`;
                diff += `\n`;
            }

            return diff;
        } catch (error) {
            this.outputChannel.appendLine(`❌ Fix generation failed: ${error}`);
            return null;
        }
    }

    /**
     * Build context for failure analysis
     */
    private async buildFailureContext(
        failure: TestFailure,
        testHistory?: TestInsight
    ): Promise<any> {
        const context: any = {
            test: failure.test,
            suite: failure.suite,
            error: failure.error,
            file: failure.file,
            line: failure.line
        };

        // Add historical context
        if (testHistory) {
            context.history = {
                failureRate: testHistory.failureRate,
                averageDuration: testHistory.averageDuration,
                patterns: testHistory.patterns,
                lastFailures: testHistory.lastFailures.slice(0, 3)
            };
        }

        // Add source code context
        if (failure.file && failure.line) {
            context.sourceCode = await this.getSourceContext(failure.file, failure.line);
        }

        // Add related test code
        context.testCode = await this.getTestCode(failure.test, failure.suite);

        return context;
    }

    /**
     * Perform AI analysis (simulated for now)
     */
    private async performAnalysis(
        failure: TestFailure,
        context: any
    ): Promise<AIAnalysis> {
        // Pattern matching for common errors
        const errorLower = failure.error.toLowerCase();
        
        // Type errors
        if (errorLower.includes('cannot read property') || errorLower.includes('undefined')) {
            return {
                summary: 'Null reference error detected',
                rootCause: 'Attempting to access a property on an undefined object',
                suggestedFix: 'Add null/undefined checks before accessing object properties',
                codeChanges: this.generateNullCheckFix(failure, context),
                confidence: 0.85
            };
        }

        // Timeout errors
        if (errorLower.includes('timeout') || errorLower.includes('async')) {
            return {
                summary: 'Asynchronous operation timeout',
                rootCause: 'Test is taking longer than the configured timeout',
                suggestedFix: 'Increase timeout or optimize the async operation',
                codeChanges: this.generateTimeoutFix(failure, context),
                confidence: 0.8
            };
        }

        // Import/Module errors
        if (errorLower.includes('cannot find module') || errorLower.includes('import')) {
            return {
                summary: 'Module import error',
                rootCause: 'Missing or incorrectly imported module',
                suggestedFix: 'Check module installation and import paths',
                codeChanges: this.generateImportFix(failure, context),
                confidence: 0.9
            };
        }

        // Assertion errors
        if (errorLower.includes('expected') || errorLower.includes('assertion')) {
            return {
                summary: 'Test assertion failure',
                rootCause: 'Expected value does not match actual value',
                suggestedFix: 'Update test expectations or fix implementation',
                codeChanges: this.generateAssertionFix(failure, context),
                confidence: 0.75
            };
        }

        // Default analysis
        return this.getFallbackAnalysis(failure);
    }

    /**
     * Generate null check fix
     */
    private generateNullCheckFix(failure: TestFailure, context: any): any[] {
        // Extract the property access pattern
        const match = failure.error.match(/Cannot read property '(\w+)' of (undefined|null)/);
        if (!match) return [];

        const property = match[1];
        const nullValue = match[2];

        return [{
            file: failure.file || 'unknown',
            line: failure.line || 1,
            original: `object.${property}`,
            suggested: `object?.${property}`,
            explanation: `Add optional chaining to handle ${nullValue} values`
        }];
    }

    /**
     * Generate timeout fix
     */
    private generateTimeoutFix(failure: TestFailure, context: any): any[] {
        return [{
            file: failure.file || 'unknown',
            line: 1,
            original: 'it("test", async () => {',
            suggested: 'it("test", async () => {',
            explanation: 'Consider increasing test timeout with jest.setTimeout(10000) or test.timeout(10000)'
        }];
    }

    /**
     * Generate import fix
     */
    private generateImportFix(failure: TestFailure, context: any): any[] {
        const match = failure.error.match(/Cannot find module '(.+)'/);
        if (!match) return [];

        const moduleName = match[1];

        return [{
            file: failure.file || 'unknown',
            line: 1,
            original: `import { something } from '${moduleName}'`,
            suggested: `// Check if module is installed: npm install ${moduleName}`,
            explanation: `Module '${moduleName}' needs to be installed or import path corrected`
        }];
    }

    /**
     * Generate assertion fix
     */
    private generateAssertionFix(failure: TestFailure, context: any): any[] {
        const match = failure.error.match(/Expected (.+) to (be|equal) (.+)/);
        if (!match) return [];

        return [{
            file: failure.file || 'unknown',
            line: failure.line || 1,
            original: `expect(${match[1]}).${match[2]}(${match[3]})`,
            suggested: `// Update expectation or fix implementation\nexpect(${match[1]}).${match[2]}(/* actual value */)`,
            explanation: 'Either update the test expectation or fix the implementation to return the expected value'
        }];
    }

    /**
     * Get fallback analysis
     */
    private getFallbackAnalysis(failure: TestFailure): AIAnalysis {
        return {
            summary: 'Test failure detected',
            rootCause: 'Unable to determine specific root cause',
            suggestedFix: 'Review the error message and stack trace for more details',
            confidence: 0.3
        };
    }

    /**
     * Get source code context
     */
    private async getSourceContext(file: string, line: number): Promise<string> {
        try {
            const fs = require('fs').promises;
            const content = await fs.readFile(file, 'utf8');
            const lines = content.split('\n');
            
            const start = Math.max(0, line - 5);
            const end = Math.min(lines.length, line + 5);
            
            return lines.slice(start, end).join('\n');
        } catch {
            return '';
        }
    }

    /**
     * Get test code
     */
    private async getTestCode(testName: string, suiteName: string): Promise<string> {
        // This would search for the test in the codebase
        // For now, return empty
        return '';
    }

    /**
     * Analyze coverage gaps
     */
    private async analyzeCoverageGaps(projectName: string): Promise<any[]> {
        // This would analyze code coverage reports
        // For now, return sample suggestions
        return [{
            functionality: 'error handling in API calls',
            suggestedTestName: 'should handle network errors gracefully',
            suggestedCode: `
it('should handle network errors gracefully', async () => {
    // Mock network error
    jest.spyOn(api, 'fetchData').mockRejectedValue(new Error('Network error'));
    
    // Test error handling
    await expect(service.getData()).rejects.toThrow('Network error');
    expect(logger.error).toHaveBeenCalledWith('Failed to fetch data', expect.any(Error));
});`,
            critical: true
        }];
    }

    /**
     * Analyze test quality
     */
    private async analyzeTestQuality(testFile: string): Promise<any[]> {
        // This would analyze test code quality
        // For now, return sample issues
        return [{
            testName: 'should work correctly',
            reason: 'Test name is not descriptive',
            improvedCode: "it('should return user data when valid ID is provided', async () => {",
            severity: 'medium'
        }];
    }

    /**
     * Find redundant tests
     */
    private findRedundantTests(testFiles: string[]): any[] {
        // This would analyze test similarity
        // For now, return empty
        return [];
    }

    /**
     * Cache analysis result
     */
    private cacheAnalysis(key: string, analysis: AIAnalysis): void {
        // Limit cache size
        if (this.analysisCache.size >= this.maxCacheSize) {
            const firstKey = this.analysisCache.keys().next().value;
            if (firstKey) {
                this.analysisCache.delete(firstKey);
            }
        }
        
        this.analysisCache.set(key, analysis);
    }

    /**
     * Generate PR description from test results
     */
    async generatePRDescription(
        testResults: any,
        changedFiles: string[]
    ): Promise<string> {
        const totalTests = testResults.passed + testResults.failed + testResults.skipped;
        const passRate = totalTests > 0 ? (testResults.passed / totalTests * 100).toFixed(1) : 0;

        let description = `## 🧪 Test Results\n\n`;
        description += `✅ **${testResults.passed}** passed | `;
        description += `❌ **${testResults.failed}** failed | `;
        description += `⏭️ **${testResults.skipped}** skipped\n\n`;
        description += `**Pass Rate:** ${passRate}%\n\n`;

        if (testResults.failed > 0) {
            description += `### ❌ Failed Tests\n\n`;
            for (const failure of testResults.failures.slice(0, 5)) {
                description += `- \`${failure.test}\`\n`;
                description += `  - ${failure.error.split('\n')[0]}\n`;
            }
            if (testResults.failures.length > 5) {
                description += `\n_...and ${testResults.failures.length - 5} more failures_\n`;
            }
            description += '\n';
        }

        description += `### 📝 Changed Files\n\n`;
        for (const file of changedFiles.slice(0, 10)) {
            description += `- ${file}\n`;
        }
        if (changedFiles.length > 10) {
            description += `\n_...and ${changedFiles.length - 10} more files_\n`;
        }

        // Add AI insights
        const insights = await this.getTestInsightsSummary();
        if (insights) {
            description += `\n### 🤖 AI Insights\n\n${insights}\n`;
        }

        return description;
    }

    /**
     * Get test insights summary
     */
    private async getTestInsightsSummary(): Promise<string> {
        const suggestions = await this.testIntelligence.getOptimizationSuggestions();
        
        if (suggestions.length === 0) {
            return 'All tests are running optimally! 🎉';
        }

        let summary = '';
        for (const suggestion of suggestions.slice(0, 3)) {
            const icon = suggestion.impact === 'high' ? '🚨' : 
                        suggestion.impact === 'medium' ? '⚠️' : 'ℹ️';
            summary += `${icon} **${suggestion.title}**: ${suggestion.description}\n`;
        }

        return summary;
    }
}