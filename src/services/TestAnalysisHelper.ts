/**
 * Test Analysis Helper
 * Pattern-based test failure analysis and basic suggestions
 * Phase 3.2.0 - Honest pattern matching, no misleading terminology
 */

import * as vscode from 'vscode';
import { TestIntelligenceEngine, TestInsight } from '../core/TestIntelligenceEngine';
import { TestFailure } from '../utils/testResultParser';

export interface PatternAnalysis {
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
}

export interface TestSuggestion {
    type: 'new_test' | 'improve_test' | 'remove_test';
    testName: string;
    reason: string;
    code?: string;
    priority: 'high' | 'medium' | 'low';
}

/**
 * Pattern-based test failure analysis helper
 */
export class TestAnalysisHelper {
    private analysisCache = new Map<string, PatternAnalysis>();
    private readonly maxCacheSize = 50;

    constructor(
        private testIntelligence: TestIntelligenceEngine,
        private workspaceRoot: string,
        private outputChannel: vscode.OutputChannel
    ) {}

    /**
     * Analyze test failure using pattern matching
     */
    async analyze(
        failure: TestFailure,
        testOutput: string,
        context?: any
    ): Promise<PatternAnalysis> {
        const cacheKey = `${failure.test}-${failure.error}`;
        
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey)!;
        }

        const analysis = this.performPatternAnalysis(failure, testOutput);
        
        // Cache management
        if (this.analysisCache.size >= this.maxCacheSize) {
            const firstKey = this.analysisCache.keys().next().value;
            if (firstKey) {
                this.analysisCache.delete(firstKey);
            }
        }
        
        this.analysisCache.set(cacheKey, analysis);
        return analysis;
    }

    /**
     * Generate basic test suggestions using templates
     */
    async generateSuggestions(
        testFile: string,
        existingTests: string[]
    ): Promise<TestSuggestion[]> {
        return this.createStandardSuggestions(testFile, existingTests);
    }

    /**
     * Copy analysis results to clipboard
     */
    async copyToClipboard(analysis: PatternAnalysis): Promise<void> {
        const formatted = this.formatAnalysisForClipboard(analysis);
        await vscode.env.clipboard.writeText(formatted);
        vscode.window.showInformationMessage('Analysis copied to clipboard');
    }

    /**
     * Parse error message for common patterns
     */
    parseErrorMessage(errorMessage: string): { type: string; details: string } {
        // Handle null/undefined error messages
        if (!errorMessage) {
            return { type: 'General Error', details: 'Standard test failure pattern' };
        }
        
        // Common error patterns
        if (errorMessage.includes('TypeError')) {
            return { type: 'Type Error', details: 'Variable type mismatch detected' };
        }
        if (errorMessage.includes('ReferenceError')) {
            return { type: 'Reference Error', details: 'Undefined variable or function' };
        }
        if (errorMessage.includes('AssertionError') || errorMessage.includes('Expected')) {
            return { type: 'Assertion Error', details: 'Test expectation not met' };
        }
        if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
            return { type: 'Timeout Error', details: 'Test execution exceeded time limit' };
        }
        if (errorMessage.includes('Cannot read property') || errorMessage.includes('Cannot read properties')) {
            return { type: 'Property Error', details: 'Accessing property of null/undefined object' };
        }
        
        return { type: 'General Error', details: 'Standard test failure pattern' };
    }

    /**
     * Perform pattern-based analysis on test failure
     */
    private performPatternAnalysis(failure: TestFailure, testOutput: string): PatternAnalysis {
        const errorInfo = this.parseErrorMessage(failure.error);
        
        // Generate analysis based on error pattern
        switch (errorInfo.type) {
            case 'Type Error':
                return {
                    summary: 'Type mismatch detected in test',
                    rootCause: 'Variable types do not match expected types',
                    suggestedFix: 'Check variable types and add proper type assertions',
                    codeChanges: [{
                        file: failure.file || 'test file',
                        line: failure.line || 0,
                        original: 'Check the failing assertion',
                        suggested: 'Add type checks before assertions',
                        explanation: 'Ensure variables have expected types'
                    }]
                };
            
            case 'Reference Error':
                return {
                    summary: 'Undefined variable or function reference',
                    rootCause: 'Code references undefined variable or function',
                    suggestedFix: 'Check imports and variable declarations',
                    codeChanges: [{
                        file: failure.file || 'test file',
                        line: failure.line || 0,
                        original: 'Undefined reference',
                        suggested: 'Import or declare the missing reference',
                        explanation: 'Ensure all variables and functions are properly defined'
                    }]
                };
            
            case 'Assertion Error':
                return {
                    summary: 'Test expectation not met',
                    rootCause: 'Actual result differs from expected result',
                    suggestedFix: 'Review test logic and expected values',
                    codeChanges: [{
                        file: failure.file || 'test file',
                        line: failure.line || 0,
                        original: 'Check the assertion',
                        suggested: 'Update assertion or fix implementation',
                        explanation: 'Align test expectations with actual behavior'
                    }]
                };
            
            default:
                return {
                    summary: 'Standard test failure detected',
                    rootCause: 'Test did not pass expected conditions',
                    suggestedFix: 'Review test implementation and expectations',
                    codeChanges: [{
                        file: failure.file || 'test file',
                        line: failure.line || 0,
                        original: 'Review failing test',
                        suggested: 'Check test logic and implementation',
                        explanation: 'Standard debugging approach recommended'
                    }]
                };
        }
    }

    /**
     * Create standard test suggestions using 3 templates
     */
    private createStandardSuggestions(testFile: string, existingTests: string[]): TestSuggestion[] {
        const suggestions: TestSuggestion[] = [];
        
        // Template 1: Edge case testing
        suggestions.push({
            type: 'new_test',
            testName: 'should handle edge cases',
            reason: 'Add tests for boundary conditions and edge cases',
            code: '// Add tests for null, undefined, empty values, etc.',
            priority: 'high'
        });
        
        // Template 2: Error handling
        suggestions.push({
            type: 'new_test',
            testName: 'should handle error conditions',
            reason: 'Add tests for error scenarios and exception handling',
            code: '// Add tests for error conditions and proper error handling',
            priority: 'medium'
        });
        
        // Template 3: Integration testing
        suggestions.push({
            type: 'improve_test',
            testName: 'should improve test coverage',
            reason: 'Enhance existing tests with more comprehensive scenarios',
            code: '// Add more test cases to existing test suites',
            priority: 'low'
        });
        
        return suggestions;
    }

    /**
     * Format analysis for clipboard
     */
    private formatAnalysisForClipboard(analysis: PatternAnalysis): string {
        let formatted = `## Test Analysis Results\n\n`;
        formatted += `**Summary:** ${analysis.summary}\n\n`;
        formatted += `**Root Cause:** ${analysis.rootCause}\n\n`;
        formatted += `**Suggested Fix:** ${analysis.suggestedFix}\n\n`;
        
        if (analysis.codeChanges && analysis.codeChanges.length > 0) {
            formatted += `**Code Changes:**\n`;
            analysis.codeChanges.forEach((change, index) => {
                formatted += `${index + 1}. ${change.explanation}\n`;
                formatted += `   File: ${change.file}:${change.line}\n`;
                formatted += `   Change: ${change.suggested}\n\n`;
            });
        }
        
        return formatted;
    }
}