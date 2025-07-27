/**
 * Test Output Intelligence
 * Advanced parsing and analysis of test output for better insights
 * Phase 2.0.2 - Intelligent test result analysis
 */

import { TestSummary } from './testResultParser';

export interface TestFailureInsight {
    type: 'syntax_error' | 'type_error' | 'logic_error' | 'dependency_error' | 'timeout_error' | 'async_error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestedFix: string;
    affectedFiles: string[];
    relatedErrors: string[];
    confidence: number; // 0-1
}

export interface TestPerformanceInsight {
    slowTests: Array<{
        testName: string;
        duration: number;
        suggestions: string[];
    }>;
    memoryIssues: Array<{
        testName: string;
        issue: string;
        suggestion: string;
    }>;
    flakiness: Array<{
        testName: string;
        flakeRate: number;
        possibleCauses: string[];
    }>;
}

export interface TestTrendAnalysis {
    passRateTrend: 'improving' | 'declining' | 'stable';
    performanceTrend: 'faster' | 'slower' | 'stable';
    newFailures: string[];
    fixedTests: string[];
    recommendations: string[];
}

export interface IntelligentTestAnalysis {
    failures: TestFailureInsight[];
    performance: TestPerformanceInsight;
    trends: TestTrendAnalysis;
    overallHealth: {
        score: number; // 0-100
        category: 'excellent' | 'good' | 'needs_attention' | 'critical';
        keyIssues: string[];
        priorityActions: string[];
    };
}

/**
 * Intelligent analysis of test output and patterns
 */
export class TestOutputIntelligence {
    private static readonly ERROR_PATTERNS = [
        // TypeScript/JavaScript errors
        {
            pattern: /TypeError: (.+)/gi,
            type: 'type_error' as const,
            severity: 'high' as const,
            extractDescription: (match: RegExpMatchArray) => `Type error: ${match[1]}`,
            suggestFix: (match: RegExpMatchArray, context: string) => {
                if (context.includes('undefined')) {
                    return 'Check for undefined values. Add null checks or initialize variables properly.';
                }
                if (context.includes('is not a function')) {
                    return 'Verify the object/variable has the expected method. Check imports and type definitions.';
                }
                return 'Review type definitions and ensure proper type checking.';
            }
        },
        {
            pattern: /ReferenceError: (.+) is not defined/gi,
            type: 'dependency_error' as const,
            severity: 'high' as const,
            extractDescription: (match: RegExpMatchArray) => `Reference error: ${match[1]} is not defined`,
            suggestFix: () => 'Check imports and ensure all dependencies are properly installed and imported.'
        },
        {
            pattern: /SyntaxError: (.+)/gi,
            type: 'syntax_error' as const,
            severity: 'high' as const,
            extractDescription: (match: RegExpMatchArray) => `Syntax error: ${match[1]}`,
            suggestFix: () => 'Fix syntax errors in the code. Check for missing brackets, semicolons, or typos.'
        },
        {
            pattern: /Cannot find module ['"`](.+)['"`]/gi,
            type: 'dependency_error' as const,
            severity: 'critical' as const,
            extractDescription: (match: RegExpMatchArray) => `Missing module: ${match[1]}`,
            suggestFix: (match: RegExpMatchArray) => `Install the missing module: npm install ${match[1]}`
        },
        {
            pattern: /Timeout of (\d+)ms exceeded/gi,
            type: 'timeout_error' as const,
            severity: 'medium' as const,
            extractDescription: (match: RegExpMatchArray) => `Test timeout exceeded (${match[1]}ms)`,
            suggestFix: () => 'Optimize slow operations, increase timeout, or check for infinite loops.'
        },
        {
            pattern: /Expected (.+) but received (.+)/gi,
            type: 'logic_error' as const,
            severity: 'medium' as const,
            extractDescription: (match: RegExpMatchArray) => `Assertion failed: expected ${match[1]} but received ${match[2]}`,
            suggestFix: () => 'Review test logic and implementation. Check if the expected behavior matches the actual implementation.'
        },
        {
            pattern: /Promise rejection was not handled/gi,
            type: 'async_error' as const,
            severity: 'high' as const,
            extractDescription: () => 'Unhandled promise rejection',
            suggestFix: () => 'Add proper error handling for promises. Use try-catch blocks or .catch() methods.'
        }
    ];

    private static readonly PERFORMANCE_PATTERNS = [
        {
            pattern: /(\w+\.spec\.ts) \((\d+\.?\d*)\s*s\)/gi,
            extractTest: (match: RegExpMatchArray) => ({
                testName: match[1],
                duration: parseFloat(match[2]) * 1000 // Convert to ms
            })
        },
        {
            pattern: /✓ (.+) \((\d+)ms\)/gi,
            extractTest: (match: RegExpMatchArray) => ({
                testName: match[1],
                duration: parseInt(match[2])
            })
        }
    ];

    /**
     * Analyze test output for intelligent insights
     */
    static analyzeTestOutput(
        testOutput: string,
        testSummary: TestSummary,
        previousResults?: TestSummary[]
    ): IntelligentTestAnalysis {
        const failures = this.analyzeFailures(testOutput);
        const performance = this.analyzePerformance(testOutput);
        const trends = this.analyzeTrends(testSummary, previousResults);
        const overallHealth = this.calculateOverallHealth(testSummary, failures, performance);

        return {
            failures,
            performance,
            trends,
            overallHealth
        };
    }

    /**
     * Analyze test failures for insights
     */
    private static analyzeFailures(testOutput: string): TestFailureInsight[] {
        const insights: TestFailureInsight[] = [];
        const lines = testOutput.split('\n');

        for (const pattern of this.ERROR_PATTERNS) {
            const matches = testOutput.matchAll(pattern.pattern);
            
            for (const match of matches) {
                const description = pattern.extractDescription(match);
                const suggestedFix = pattern.suggestFix(match, testOutput);
                const affectedFiles = this.extractAffectedFiles(testOutput, match.index || 0);
                const relatedErrors = this.findRelatedErrors(testOutput, match[0]);

                insights.push({
                    type: pattern.type,
                    severity: pattern.severity,
                    description,
                    suggestedFix,
                    affectedFiles,
                    relatedErrors,
                    confidence: this.calculateConfidence(pattern.type, match[0], testOutput)
                });
            }
        }

        // Remove duplicates and sort by severity
        const uniqueInsights = this.deduplicateInsights(insights);
        return this.sortInsightsBySeverity(uniqueInsights);
    }

    /**
     * Analyze test performance
     */
    private static analyzePerformance(testOutput: string): TestPerformanceInsight {
        const slowTests: TestPerformanceInsight['slowTests'] = [];
        const memoryIssues: TestPerformanceInsight['memoryIssues'] = [];
        const flakiness: TestPerformanceInsight['flakiness'] = [];

        // Extract test durations
        for (const pattern of this.PERFORMANCE_PATTERNS) {
            const matches = testOutput.matchAll(pattern.pattern);
            
            for (const match of matches) {
                const testInfo = pattern.extractTest(match);
                
                if (testInfo.duration > 5000) { // Slower than 5 seconds
                    const suggestions = this.generatePerformanceSuggestions(testInfo.duration);
                    slowTests.push({
                        testName: testInfo.testName,
                        duration: testInfo.duration,
                        suggestions
                    });
                }
            }
        }

        // Check for memory-related issues
        if (testOutput.includes('out of memory') || testOutput.includes('heap') || testOutput.includes('ENOMEM')) {
            memoryIssues.push({
                testName: 'Memory Issue Detected',
                issue: 'Potential memory leak or excessive memory usage',
                suggestion: 'Check for memory leaks, large data structures, or improper cleanup in tests'
            });
        }

        // TODO: Implement flakiness detection (requires historical data)

        return {
            slowTests: slowTests.slice(0, 10), // Top 10 slowest
            memoryIssues,
            flakiness
        };
    }

    /**
     * Analyze trends compared to previous results
     */
    private static analyzeTrends(
        currentSummary: TestSummary,
        previousResults?: TestSummary[]
    ): TestTrendAnalysis {
        if (!previousResults || previousResults.length === 0) {
            return {
                passRateTrend: 'stable',
                performanceTrend: 'stable',
                newFailures: [],
                fixedTests: [],
                recommendations: ['Collect more test data to analyze trends']
            };
        }

        const lastResult = previousResults[previousResults.length - 1];
        const currentPassRate = currentSummary.total > 0 ? currentSummary.passed / currentSummary.total : 0;
        const lastPassRate = lastResult.total > 0 ? lastResult.passed / lastResult.total : 0;

        // Analyze pass rate trend
        let passRateTrend: TestTrendAnalysis['passRateTrend'] = 'stable';
        if (currentPassRate > lastPassRate + 0.05) passRateTrend = 'improving';
        else if (currentPassRate < lastPassRate - 0.05) passRateTrend = 'declining';

        // Analyze performance trend
        let performanceTrend: TestTrendAnalysis['performanceTrend'] = 'stable';
        if (currentSummary.duration && lastResult.duration) {
            const speedupRatio = lastResult.duration / currentSummary.duration;
            if (speedupRatio > 1.1) performanceTrend = 'faster';
            else if (speedupRatio < 0.9) performanceTrend = 'slower';
        }

        // Find new failures and fixed tests
        const currentFailures = new Set(currentSummary.failures.map(f => f.test));
        const lastFailures = new Set(lastResult.failures.map(f => f.test));
        
        const newFailures = Array.from(currentFailures).filter(f => !lastFailures.has(f));
        const fixedTests = Array.from(lastFailures).filter(f => !currentFailures.has(f));

        // Generate recommendations
        const recommendations = this.generateTrendRecommendations(
            passRateTrend,
            performanceTrend,
            newFailures,
            fixedTests
        );

        return {
            passRateTrend,
            performanceTrend,
            newFailures,
            fixedTests,
            recommendations
        };
    }

    /**
     * Calculate overall health score
     */
    private static calculateOverallHealth(
        testSummary: TestSummary,
        failures: TestFailureInsight[],
        performance: TestPerformanceInsight
    ) {
        let score = 100;
        const keyIssues: string[] = [];
        const priorityActions: string[] = [];

        // Deduct points for test failures
        const passRate = testSummary.total > 0 ? testSummary.passed / testSummary.total : 1;
        score -= (1 - passRate) * 40; // Up to 40 points for failures

        // Deduct points for critical errors
        const criticalErrors = failures.filter(f => f.severity === 'critical').length;
        score -= criticalErrors * 15; // 15 points per critical error

        // Deduct points for high severity errors
        const highErrors = failures.filter(f => f.severity === 'high').length;
        score -= highErrors * 8; // 8 points per high severity error

        // Deduct points for performance issues
        score -= performance.slowTests.length * 2; // 2 points per slow test
        score -= performance.memoryIssues.length * 10; // 10 points per memory issue

        // Generate key issues
        if (passRate < 0.8) {
            keyIssues.push(`Low pass rate: ${(passRate * 100).toFixed(1)}%`);
            priorityActions.push('Fix failing tests to improve overall stability');
        }

        if (criticalErrors > 0) {
            keyIssues.push(`${criticalErrors} critical error(s)`);
            priorityActions.push('Address critical errors immediately');
        }

        if (performance.slowTests.length > 3) {
            keyIssues.push(`${performance.slowTests.length} slow tests`);
            priorityActions.push('Optimize slow test performance');
        }

        if (performance.memoryIssues.length > 0) {
            keyIssues.push('Memory usage issues detected');
            priorityActions.push('Investigate and fix memory leaks');
        }

        // Determine category
        let category: 'excellent' | 'good' | 'needs_attention' | 'critical';
        if (score >= 90) category = 'excellent';
        else if (score >= 75) category = 'good';
        else if (score >= 50) category = 'needs_attention';
        else category = 'critical';

        return {
            score: Math.max(0, Math.round(score)),
            category,
            keyIssues,
            priorityActions
        };
    }

    /**
     * Extract affected files from error context
     */
    private static extractAffectedFiles(testOutput: string, errorIndex: number): string[] {
        const files: string[] = [];
        const lines = testOutput.split('\n');
        const errorLineIndex = testOutput.substring(0, errorIndex).split('\n').length - 1;

        // Look for file references in the error and surrounding lines
        const searchRange = 10; // Lines to search around the error
        const startLine = Math.max(0, errorLineIndex - searchRange);
        const endLine = Math.min(lines.length, errorLineIndex + searchRange);

        for (let i = startLine; i < endLine; i++) {
            const line = lines[i];
            // Match file paths in stack traces
            const fileMatches = line.matchAll(/(?:at .+ \()?([^()]+\.(ts|js|tsx|jsx))(?::\d+:\d+)?/gi);
            for (const match of fileMatches) {
                const filePath = match[1];
                if (!files.includes(filePath)) {
                    files.push(filePath);
                }
            }
        }

        return files;
    }

    /**
     * Find related errors in the same output
     */
    private static findRelatedErrors(testOutput: string, currentError: string): string[] {
        const relatedErrors: string[] = [];
        
        // Look for similar error patterns
        for (const pattern of this.ERROR_PATTERNS) {
            const matches = testOutput.matchAll(pattern.pattern);
            for (const match of matches) {
                const errorText = match[0];
                if (errorText !== currentError && !relatedErrors.includes(errorText)) {
                    // Check if errors are related (same file, similar type, etc.)
                    if (this.areErrorsRelated(currentError, errorText)) {
                        relatedErrors.push(errorText);
                    }
                }
            }
        }

        return relatedErrors.slice(0, 3); // Limit to top 3 related errors
    }

    /**
     * Check if two errors are related
     */
    private static areErrorsRelated(error1: string, error2: string): boolean {
        // Simple heuristic: errors are related if they share similar keywords
        const keywords1 = this.extractErrorKeywords(error1);
        const keywords2 = this.extractErrorKeywords(error2);
        
        const sharedKeywords = keywords1.filter(k => keywords2.includes(k));
        return sharedKeywords.length > 0;
    }

    /**
     * Extract keywords from error message
     */
    private static extractErrorKeywords(error: string): string[] {
        // Extract meaningful words from error message
        const words = error.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3);
        
        // Filter out common, non-meaningful words
        const stopWords = ['error', 'cannot', 'undefined', 'null', 'expected', 'received'];
        return words.filter(word => !stopWords.includes(word));
    }

    /**
     * Calculate confidence score for an insight
     */
    private static calculateConfidence(
        type: TestFailureInsight['type'],
        errorText: string,
        fullOutput: string
    ): number {
        let confidence = 0.7; // Base confidence

        // Boost confidence for specific error types
        if (type === 'dependency_error' && errorText.includes('Cannot find module')) {
            confidence = 0.95;
        } else if (type === 'syntax_error') {
            confidence = 0.9;
        } else if (type === 'type_error' && errorText.includes('TypeError')) {
            confidence = 0.85;
        }

        // Boost confidence if error appears multiple times
        const occurrences = (fullOutput.match(new RegExp(errorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (occurrences > 1) {
            confidence += 0.1;
        }

        return Math.min(1, confidence);
    }

    /**
     * Remove duplicate insights
     */
    private static deduplicateInsights(insights: TestFailureInsight[]): TestFailureInsight[] {
        const seen = new Set<string>();
        return insights.filter(insight => {
            const key = `${insight.type}-${insight.description}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Sort insights by severity
     */
    private static sortInsightsBySeverity(insights: TestFailureInsight[]): TestFailureInsight[] {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return insights.sort((a, b) => {
            if (severityOrder[a.severity] !== severityOrder[b.severity]) {
                return severityOrder[a.severity] - severityOrder[b.severity];
            }
            return b.confidence - a.confidence;
        });
    }

    /**
     * Generate performance suggestions
     */
    private static generatePerformanceSuggestions(duration: number): string[] {
        const suggestions: string[] = [];

        if (duration > 30000) { // Over 30 seconds
            suggestions.push('Consider breaking this test into smaller, focused tests');
            suggestions.push('Check for inefficient database queries or API calls');
        } else if (duration > 10000) { // Over 10 seconds
            suggestions.push('Look for opportunities to mock external dependencies');
            suggestions.push('Consider using test data fixtures instead of generating data');
        } else if (duration > 5000) { // Over 5 seconds
            suggestions.push('Review async operations for potential optimizations');
            suggestions.push('Consider parallel execution where possible');
        }

        suggestions.push('Add performance monitoring to track improvements');
        return suggestions;
    }

    /**
     * Generate trend recommendations
     */
    private static generateTrendRecommendations(
        passRateTrend: TestTrendAnalysis['passRateTrend'],
        performanceTrend: TestTrendAnalysis['performanceTrend'],
        newFailures: string[],
        fixedTests: string[]
    ): string[] {
        const recommendations: string[] = [];

        if (passRateTrend === 'declining') {
            recommendations.push('Address declining test pass rate - investigate recent changes');
        } else if (passRateTrend === 'improving') {
            recommendations.push('Good progress! Continue current testing practices');
        }

        if (performanceTrend === 'slower') {
            recommendations.push('Test performance is declining - review recent changes for optimization opportunities');
        } else if (performanceTrend === 'faster') {
            recommendations.push('Great job improving test performance!');
        }

        if (newFailures.length > 0) {
            recommendations.push(`${newFailures.length} new test failures detected - prioritize fixing these`);
        }

        if (fixedTests.length > 0) {
            recommendations.push(`${fixedTests.length} tests fixed - excellent progress!`);
        }

        if (recommendations.length === 0) {
            recommendations.push('Test suite is stable - consider adding more comprehensive test coverage');
        }

        return recommendations;
    }

    /**
     * Format analysis for display
     */
    static formatAnalysisForDisplay(analysis: IntelligentTestAnalysis): string {
        let output = '\n🧠 INTELLIGENT TEST ANALYSIS\n';
        output += '='.repeat(50) + '\n\n';

        // Overall health
        const healthIcon = {
            'excellent': '💚',
            'good': '💛',
            'needs_attention': '🧡',
            'critical': '❤️'
        }[analysis.overallHealth.category];

        output += `${healthIcon} Overall Health: ${analysis.overallHealth.score}/100 (${analysis.overallHealth.category})\n\n`;

        // Key issues
        if (analysis.overallHealth.keyIssues.length > 0) {
            output += '🚨 Key Issues:\n';
            for (const issue of analysis.overallHealth.keyIssues) {
                output += `   • ${issue}\n`;
            }
            output += '\n';
        }

        // Priority actions
        if (analysis.overallHealth.priorityActions.length > 0) {
            output += '🎯 Priority Actions:\n';
            for (const action of analysis.overallHealth.priorityActions) {
                output += `   • ${action}\n`;
            }
            output += '\n';
        }

        // Failure insights
        if (analysis.failures.length > 0) {
            output += '🔍 Failure Analysis:\n';
            for (const [index, failure] of analysis.failures.slice(0, 5).entries()) {
                const severityIcon = {
                    'critical': '🚨',
                    'high': '⚠️',
                    'medium': '⚡',
                    'low': 'ℹ️'
                }[failure.severity];
                
                output += `   ${index + 1}. ${severityIcon} ${failure.description}\n`;
                output += `      💡 ${failure.suggestedFix}\n`;
                
                if (failure.affectedFiles.length > 0) {
                    output += `      📁 Files: ${failure.affectedFiles.slice(0, 2).join(', ')}`;
                    if (failure.affectedFiles.length > 2) {
                        output += ` (+${failure.affectedFiles.length - 2} more)`;
                    }
                    output += '\n';
                }
                output += '\n';
            }
        }

        // Performance insights
        if (analysis.performance.slowTests.length > 0) {
            output += '🐌 Performance Issues:\n';
            for (const slowTest of analysis.performance.slowTests.slice(0, 3)) {
                output += `   • ${slowTest.testName} (${(slowTest.duration / 1000).toFixed(1)}s)\n`;
                if (slowTest.suggestions.length > 0) {
                    output += `     💡 ${slowTest.suggestions[0]}\n`;
                }
            }
            output += '\n';
        }

        // Trends
        if (analysis.trends.passRateTrend !== 'stable' || analysis.trends.performanceTrend !== 'stable') {
            output += '📈 Trends:\n';
            if (analysis.trends.passRateTrend !== 'stable') {
                const trendIcon = analysis.trends.passRateTrend === 'improving' ? '📈' : '📉';
                output += `   ${trendIcon} Pass rate is ${analysis.trends.passRateTrend}\n`;
            }
            if (analysis.trends.performanceTrend !== 'stable') {
                const trendIcon = analysis.trends.performanceTrend === 'faster' ? '⚡' : '🐌';
                output += `   ${trendIcon} Performance is ${analysis.trends.performanceTrend}\n`;
            }
            output += '\n';
        }

        return output;
    }
}