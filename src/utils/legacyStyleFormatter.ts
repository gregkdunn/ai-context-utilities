/**
 * Legacy Style Test Output Formatter
 * Matches the output style from legacy/zsh/functions/nxTest.zsh
 * 
 * Provides AI Context, emoji-rich test reports with structured sections
 */

import { TestSummary, TestFailure } from './testResultParser';

export interface LegacyStyleOptions {
    command: string;
    exitCode: number;
    rawOutput: string;
    optimized?: boolean;
}

export class LegacyStyleFormatter {
    
    /**
     * Format test results in legacy zsh style
     */
    static formatTestReport(result: TestSummary, options: LegacyStyleOptions): string {
        const { command, exitCode, rawOutput, optimized = true } = options;
        const sections: string[] = [];
        
        // Header section
        sections.push(this.createHeader());
        
        // Command and status section
        sections.push(this.createCommandSection(command, exitCode));
        
        // Executive summary section
        sections.push(this.createExecutiveSummary(result));
        
        // Failure analysis (if tests failed)
        if (!result.success) {
            sections.push(this.createFailureAnalysis(result.failures, rawOutput));
        }
        
        // Test results summary
        sections.push(this.createTestResultsSummary(result));
        
        // Performance insights
        sections.push(this.createPerformanceInsights(result, rawOutput));
        
        // AI analysis context
        sections.push(this.createAIAnalysisContext(result, optimized));
        
        return sections.join('\n\n');
    }
    
    /**
     * Create the header section
     */
    private static createHeader(): string {
        return [
            '=================================================================',
            '🤖 TEST ANALYSIS REPORT',
            '================================================================='
        ].join('\n');
    }
    
    /**
     * Create command and status section
     */
    private static createCommandSection(command: string, exitCode: number): string {
        const status = exitCode === 0 ? '✅ PASSED' : '❌ FAILED';
        
        return [
            `COMMAND: ${command}`,
            `EXIT CODE: ${exitCode}`,
            `STATUS: ${status}`
        ].join('\n');
    }
    
    /**
     * Create executive summary section
     */
    private static createExecutiveSummary(result: TestSummary): string {
        const lines = [
            '=================================================================',
            '📊 EXECUTIVE SUMMARY',
            '================================================================='
        ];
        
        // Test Suites summary
        const suitesPassed = result.success ? 1 : 0;
        const suitesFailed = result.success ? 0 : 1;
        lines.push(`Test Suites: ${suitesPassed} passed, ${suitesFailed} failed, 1 total`);
        
        // Tests summary
        const testParts = [];
        if (result.failed > 0) testParts.push(`${result.failed} failed`);
        if (result.passed > 0) testParts.push(`${result.passed} passed`);
        if (result.skipped > 0) testParts.push(`${result.skipped} skipped`);
        testParts.push(`${result.total} total`);
        lines.push(`Tests: ${testParts.join(', ')}`);
        
        // Time
        lines.push(`Time: ${result.duration.toFixed(1)}s`);
        
        // Additional suite breakdown
        lines.push(`Test Suites: ${suitesPassed} passed, ${suitesFailed} failed`);
        
        return lines.join('\n');
    }
    
    /**
     * Create failure analysis section
     */
    private static createFailureAnalysis(failures: TestFailure[], rawOutput: string): string {
        const lines = [
            '=================================================================',
            '💥 FAILURE ANALYSIS',
            '================================================================='
        ];
        
        // Check for compilation errors
        const hasCompilationErrors = rawOutput.includes('Test suite failed to run') || 
                                   rawOutput.includes('error TS') ||
                                   rawOutput.includes('Cannot find');
        
        if (hasCompilationErrors) {
            lines.push('');
            lines.push('🔥 COMPILATION/RUNTIME ERRORS:');
            lines.push('--------------------------------');
            
            // Extract TypeScript and compilation errors
            const errorPatterns = [
                /error TS\d+:.+/g,
                /Property .+ does not exist.+/g,
                /Cannot find .+/g,
                /Type .+ is not assignable.+/g
            ];
            
            for (const pattern of errorPatterns) {
                const matches = rawOutput.match(pattern) || [];
                matches.forEach(match => {
                    lines.push(`  • ${match.trim()}`);
                });
            }
        }
        
        // Test failures
        if (failures.length > 0) {
            lines.push('');
            lines.push('🧪 TEST FAILURES:');
            lines.push('-----------------');
            
            failures.forEach(failure => {
                const suiteName = failure.suite ? `${failure.suite} › ` : '';
                lines.push(`  • ${suiteName}${failure.test}`);
                if (failure.error) {
                    // Clean up error message and add indentation
                    const cleanError = failure.error
                        .split('\n')
                        .filter(line => line.trim())
                        .slice(0, 3) // Limit to first 3 lines for brevity
                        .map(line => `    ${line.trim()}`)
                        .join('\n');
                    lines.push(cleanError);
                }
                lines.push('');
            });
        }
        
        return lines.join('\n');
    }
    
    /**
     * Create test results summary section
     */
    private static createTestResultsSummary(result: TestSummary): string {
        const lines = [
            '=================================================================',
            '🧪 TEST RESULTS SUMMARY',
            '================================================================='
        ];
        
        if (result.success) {
            lines.push(`✅ ${result.project}.spec.ts`);
        } else {
            lines.push(`❌ ${result.project}.spec.ts`);
        }
        
        return lines.join('\n');
    }
    
    /**
     * Create performance insights section
     */
    private static createPerformanceInsights(result: TestSummary, rawOutput: string): string {
        const lines = [
            '=================================================================',
            '⚡ PERFORMANCE INSIGHTS',
            '================================================================='
        ];
        
        lines.push(`Time: ${result.duration.toFixed(1)}s`);
        
        // Detect slow tests (>1000ms)
        const slowTestPattern = /✓.+\((\d{4,})\s*ms\)/g;
        const slowTests = [];
        let match;
        
        while ((match = slowTestPattern.exec(rawOutput)) !== null) {
            const testLine = match[0].replace(/^[✓\s]+/, '').trim();
            slowTests.push(`🐌 SLOW: ${testLine}`);
        }
        
        if (slowTests.length > 0) {
            lines.push('');
            lines.push(...slowTests);
        }
        
        // Performance classification
        if (result.duration < 1) {
            lines.push('🚀 FAST: Test execution under 1 second');
        } else if (result.duration < 5) {
            lines.push('✅ GOOD: Test execution under 5 seconds');
        } else if (result.duration < 10) {
            lines.push('⚠️ SLOW: Consider optimizing test performance');
        } else {
            lines.push('🐌 VERY SLOW: Test performance needs attention');
        }
        
        return lines.join('\n');
    }
    
    /**
     * Create AI analysis context section
     */
    private static createAIAnalysisContext(result: TestSummary, optimized: boolean): string {
        const lines = [
            '=================================================================',
            '🎯 AI ANALYSIS CONTEXT',
            '================================================================='
        ];
        
        lines.push('This report focuses on:');
        lines.push('• Test failures and their root causes');
        lines.push('• Compilation/TypeScript errors');
        lines.push('• Performance issues (slow tests)');
        lines.push('• Overall test health metrics');
        lines.push('');
        
        lines.push('Key areas for analysis:');
        if (!result.success) {
            lines.push('• 🔍 Focus on failure analysis section above');
            lines.push('• 🔗 Correlate failures with recent code changes');
            lines.push('• 🛠️  Identify patterns in TypeScript errors');
        } else {
            lines.push('• ✅ All tests passing - check for performance optimizations');
            lines.push('• 📈 Monitor test execution time trends');
        }
        
        if (optimized) {
            lines.push('');
            lines.push('Original output optimized for AI efficiency.');
        }
        
        return lines.join('\n');
    }
    
    /**
     * Create a simple status banner for quick display
     */
    static createStatusBanner(result: TestSummary): string {
        const status = result.success ? '✅ PASSED' : '❌ FAILED';
        const duration = result.duration.toFixed(1);
        
        return [
            '=======================================================',
            `${status} - ${result.project}`,
            `Tests: ${result.passed} passed, ${result.failed} failed`,
            `Time: ${duration}s`,
            '======================================================='
        ].join('\n');
    }
    
    /**
     * Format just the failures section for quick error display
     */
    static formatFailuresOnly(failures: TestFailure[]): string {
        if (failures.length === 0) return '';
        
        const lines = [
            '💥 FAILURES:',
            '============'
        ];
        
        failures.forEach(failure => {
            const suiteName = failure.suite ? `${failure.suite} › ` : '';
            lines.push(`❌ ${suiteName}${failure.test}`);
            
            if (failure.error) {
                const cleanError = failure.error
                    .split('\n')
                    .filter(line => line.trim())
                    .slice(0, 2) // Limit to first 2 lines for brevity
                    .map(line => `   ${line.trim()}`)
                    .join('\n');
                lines.push(cleanError);
            }
            
            if (failure.file) {
                const location = failure.line ? `${failure.file}:${failure.line}` : failure.file;
                lines.push(`   📁 ${location}`);
            }
            
            lines.push('');
        });
        
        return lines.join('\n');
    }
}