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
        
        // Phase 3.4.0 Enhanced error pattern recognition
        const message = errorMessage.toLowerCase();
        
        // Type errors with specific details
        if (message.includes('typeerror')) {
            if (message.includes('cannot read property') || message.includes('cannot read properties')) {
                const propertyMatch = errorMessage.match(/Cannot read propert(?:y|ies) of (null|undefined)/);
                return { type: 'Type Error', details: propertyMatch ? `Property accessed on ${propertyMatch[1]}` : 'Property access on null/undefined' };
            }
            if (message.includes('is not a function')) {
                const functionMatch = errorMessage.match(/(\w+) is not a function/);
                return { type: 'Type Error', details: functionMatch ? `${functionMatch[1]} is not a function` : 'Invalid function call' };
            }
            return { type: 'Type Error', details: 'Type mismatch or invalid operation' };
        }
        
        // Reference errors with variable names
        if (message.includes('referenceerror')) {
            const varMatch = errorMessage.match(/(\w+) is not defined/);
            return { type: 'Reference Error', details: varMatch ? `${varMatch[1]} is not defined` : 'Undefined variable or function' };
        }
        
        // Assertion errors with specifics
        if (message.includes('assertionerror') || message.includes('expected')) {
            const expectMatch = errorMessage.match(/expected (.+) but (got|received) (.+)/i);
            return { type: 'Assertion Error', details: expectMatch ? `Expected ${expectMatch[1]} but got ${expectMatch[3]}` : 'Test expectation not met' };
        }
        
        // Timeout errors
        if (message.includes('timeout')) {
            const timeMatch = errorMessage.match(/timeout of (\d+)ms exceeded/i);
            return { type: 'Timeout', details: timeMatch ? `Timeout of ${timeMatch[1]}ms exceeded` : 'Test execution timeout' };
        }
        
        // Module/Import errors
        if (message.includes('cannot resolve module') || message.includes('module not found') || message.includes('cannot find module')) {
            const moduleMatch = errorMessage.match(/cannot (?:resolve|find) module ['"]([^'"]+)['"]/i);
            return { type: 'Import/Module', details: moduleMatch ? `Cannot find module: ${moduleMatch[1]}` : 'Module resolution error' };
        }
        
        // Syntax errors
        if (message.includes('syntaxerror') || message.includes('unexpected token')) {
            const tokenMatch = errorMessage.match(/unexpected token ['"]([^'"]+)['"]/i);
            return { type: 'Syntax', details: tokenMatch ? `Unexpected token: ${tokenMatch[1]}` : 'Syntax error in code' };
        }
        
        // Network/HTTP errors
        if (message.includes('network') || message.includes('fetch') || message.includes('xhr')) {
            return { type: 'Network', details: 'Network or HTTP request error' };
        }
        
        // Mock/Spy errors
        if (message.includes('mock') || message.includes('spy') || message.includes('stub')) {
            return { type: 'Mock', details: 'Test mock or spy configuration error' };
        }
        
        return { type: 'General Error', details: errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage };
    }

    /**
     * Perform pattern-based analysis on test failure - Phase 3.4.0 Enhanced
     */
    private performPatternAnalysis(failure: TestFailure, testOutput: string): PatternAnalysis {
        const errorInfo = this.parseErrorMessage(failure.error);
        const specificContext = this.extractSpecificContext(failure, testOutput);
        
        // Enhanced pattern analysis based on actual error patterns
        switch (errorInfo.type) {
            case 'Type Error':
                return this.analyzeTypeError(failure, errorInfo, specificContext);
            
            case 'Reference Error':
                return this.analyzeReferenceError(failure, errorInfo, specificContext);
            
            case 'Assertion Error':
                return this.analyzeAssertionError(failure, errorInfo, specificContext);
            
            case 'Timeout':
                return this.analyzeTimeoutError(failure, errorInfo, specificContext);
            
            case 'Import/Module':
                return this.analyzeModuleError(failure, errorInfo, specificContext);
            
            case 'Syntax':
                return this.analyzeSyntaxError(failure, errorInfo, specificContext);
            
            default:
                return this.analyzeGenericError(failure, errorInfo, specificContext);
        }
    }

    /**
     * Extract specific context from test output - Phase 3.4.0
     */
    private extractSpecificContext(failure: TestFailure, testOutput: string): any {
        const lines = testOutput.split('\n');
        let errorContext = {};
        
        // Look for specific error patterns in test output
        for (const line of lines) {
            if (line.includes(failure.test || '')) {
                // Extract stack trace info
                const stackMatch = line.match(/at (.+) \((.+):(\d+):(\d+)\)/);
                if (stackMatch) {
                    errorContext = {
                        ...errorContext,
                        function: stackMatch[1],
                        file: stackMatch[2],
                        line: parseInt(stackMatch[3]),
                        column: parseInt(stackMatch[4])
                    };
                }
                
                // Extract expected vs actual values
                const expectedMatch = line.match(/Expected: (.+)/);
                const actualMatch = line.match(/Actual: (.+)/);
                if (expectedMatch) errorContext = { ...errorContext, expected: expectedMatch[1] };
                if (actualMatch) errorContext = { ...errorContext, actual: actualMatch[1] };
            }
        }
        
        return errorContext;
    }

    /**
     * Analyze TypeErrors with specific context - Phase 3.4.0
     */
    private analyzeTypeError(failure: TestFailure, errorInfo: any, context: any): PatternAnalysis {
        const isPropertyAccess = failure.error.includes('Cannot read property') || failure.error.includes('Cannot read properties');
        const isUndefinedCall = failure.error.includes('is not a function');
        
        if (isPropertyAccess) {
            return {
                summary: `Property access error: ${errorInfo.details}`,
                rootCause: 'Trying to access property on null/undefined object',
                suggestedFix: 'Add null check before property access',
                codeChanges: [{
                    file: context.file || failure.file || 'test file',
                    line: context.line || failure.line || 0,
                    original: `object.${errorInfo.details}`,
                    suggested: `object && object.${errorInfo.details}`,
                    explanation: 'Add null/undefined check before accessing properties'
                }]
            };
        }
        
        if (isUndefinedCall) {
            return {
                summary: `Function call error: ${errorInfo.details}`,
                rootCause: 'Trying to call a method that is not a function',
                suggestedFix: 'Verify function exists and is properly mocked',
                codeChanges: [{
                    file: context.file || failure.file || 'test file',
                    line: context.line || failure.line || 0,
                    original: 'Check function call',
                    suggested: 'Ensure function is defined and mocked correctly',
                    explanation: 'Function may be undefined or not properly mocked in tests'
                }]
            };
        }
        
        return {
            summary: 'Type mismatch in test execution',
            rootCause: errorInfo.details || 'Variable types do not match expected types',
            suggestedFix: 'Check variable types and type assertions',
            codeChanges: [{
                file: context.file || failure.file || 'test file',
                line: context.line || failure.line || 0,
                original: 'Type mismatch location',
                suggested: 'Add proper type checks',
                explanation: 'Ensure variables have expected types before operations'
            }]
        };
    }

    /**
     * Analyze assertion errors with expected vs actual - Phase 3.4.0
     */
    private analyzeAssertionError(failure: TestFailure, errorInfo: any, context: any): PatternAnalysis {
        const hasExpectedActual = context.expected && context.actual;
        
        return {
            summary: `Assertion failed: ${failure.test}`,
            rootCause: hasExpectedActual ? 
                `Expected "${context.expected}" but got "${context.actual}"` :
                'Test expectation not met',
            suggestedFix: hasExpectedActual ?
                'Update test expectation or fix implementation to match expected behavior' :
                'Review test logic and expected values',
            codeChanges: [{
                file: context.file || failure.file || 'test file',
                line: context.line || failure.line || 0,
                original: hasExpectedActual ? `expect(${context.actual})` : 'Check assertion',
                suggested: hasExpectedActual ? `expect(${context.expected})` : 'Update assertion or implementation',
                explanation: hasExpectedActual ?
                    `Test expects "${context.expected}" but implementation returns "${context.actual}"` :
                    'Align test expectations with actual behavior'
            }]
        };
    }

    /**
     * Analyze timeout errors - Phase 3.4.0
     */
    private analyzeTimeoutError(failure: TestFailure, errorInfo: any, context: any): PatternAnalysis {
        return {
            summary: 'Test timeout - async operation took too long',
            rootCause: 'Async operation did not complete within timeout period',
            suggestedFix: 'Check async/await usage or increase timeout',
            codeChanges: [{
                file: failure.file || 'test file',
                line: failure.line || 0,
                original: 'await asyncOperation()',
                suggested: 'await asyncOperation() or increase test timeout',
                explanation: 'Ensure async operations complete or adjust timeout settings'
            }],
            relatedIssues: ['Check for infinite loops', 'Verify API responses', 'Review async/await patterns']
        };
    }

    /**
     * Analyze module/import errors - Phase 3.4.0
     */
    private analyzeModuleError(failure: TestFailure, errorInfo: any, context: any): PatternAnalysis {
        return {
            summary: 'Module resolution or import error',
            rootCause: 'Cannot resolve module or import statement',
            suggestedFix: 'Check import paths and module availability',
            codeChanges: [{
                file: failure.file || 'test file',
                line: failure.line || 0,
                original: 'import statement or require()',
                suggested: 'Verify correct import path and module exists',
                explanation: 'Module path may be incorrect or module not installed'
            }],
            relatedIssues: ['Check package.json dependencies', 'Verify relative import paths', 'Check TypeScript config']
        };
    }

    /**
     * Analyze syntax errors - Phase 3.4.0
     */
    private analyzeSyntaxError(failure: TestFailure, errorInfo: any, context: any): PatternAnalysis {
        return {
            summary: 'Syntax error in test or source code',
            rootCause: 'Invalid JavaScript/TypeScript syntax',
            suggestedFix: 'Fix syntax error at specified location',
            codeChanges: [{
                file: context.file || failure.file || 'test file',
                line: context.line || failure.line || 0,
                original: 'Syntax error location',
                suggested: 'Fix syntax according to error message',
                explanation: 'Check for missing brackets, semicolons, or invalid syntax'
            }]
        };
    }

    /**
     * Analyze reference errors - Phase 3.4.0
     */
    private analyzeReferenceError(failure: TestFailure, errorInfo: any, context: any): PatternAnalysis {
        return {
            summary: `Reference error: ${errorInfo.details}`,
            rootCause: 'Variable or function is not defined',
            suggestedFix: 'Import, declare, or mock the missing reference',
            codeChanges: [{
                file: context.file || failure.file || 'test file',
                line: context.line || failure.line || 0,
                original: `${errorInfo.details} usage`,
                suggested: `import ${errorInfo.details} or declare/mock it`,
                explanation: 'Variable or function needs to be imported or declared'
            }]
        };
    }

    /**
     * Analyze generic errors - Phase 3.4.0
     */
    private analyzeGenericError(failure: TestFailure, errorInfo: any, context: any): PatternAnalysis {
        return {
            summary: `Test failure: ${failure.test}`,
            rootCause: errorInfo.details || 'Test execution failed',
            suggestedFix: 'Review error message and test implementation',
            codeChanges: [{
                file: context.file || failure.file || 'test file',
                line: context.line || failure.line || 0,
                original: 'Review the failing test',
                suggested: 'Debug based on specific error message',
                explanation: 'Examine error details for specific debugging steps'
            }]
        };
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