/**
 * TestFailureAnalyzer - Analyze test failures and extract actionable information
 * 
 * Parses Jest output and other test framework results to identify:
 * - Specific error types and patterns
 * - File locations and line numbers
 * - Suggested fixes based on error patterns
 * 
 * @version 3.0.0
 */

import * as path from 'path';
import { JestTestRunResult, JestTestResult, JestAssertionResult, parseJestOutput, isValidJestTestResult, isValidJestAssertionResult } from '../types/JestTypes';

/**
 * Represents a parsed test failure
 */
export interface TestFailure {
    readonly testName: string;
    readonly testFile: string;
    readonly errorMessage: string;
    readonly errorType: string;
    readonly stackTrace: string[];
    readonly sourceFile?: string;
    readonly lineNumber?: number;
    readonly columnNumber?: number;
    readonly suggestion?: string;
}

/**
 * Represents a test result summary
 */
export interface TestResultSummary {
    readonly totalTests: number;
    readonly passedTests: number;
    readonly failedTests: number;
    readonly skippedTests: number;
    readonly failures: TestFailure[];
    readonly duration: number;
    readonly timestamp: Date;
}

/**
 * Common error patterns and their suggested fixes
 */
interface ErrorPattern {
    readonly pattern: RegExp;
    readonly errorType: string;
    readonly suggestion: string;
    readonly confidence: number;
}

/**
 * Analyzes test failures and provides actionable insights
 */
export class TestFailureAnalyzer {
    private readonly errorPatterns: ErrorPattern[] = [
        {
            pattern: /expect.*toEqual.*expected|expected.*but received|toEqual.*received/i,
            errorType: 'assertion_mismatch',
            suggestion: 'Check the expected vs actual values. Consider if the test expectation is correct or if the implementation needs updating.',
            confidence: 0.9
        },
        {
            pattern: /cannot read property.*of undefined/i,
            errorType: 'null_reference',
            suggestion: 'Add null checks or ensure the object is properly initialized before accessing properties.',
            confidence: 0.8
        },
        {
            pattern: /module.*not found/i,
            errorType: 'missing_import',
            suggestion: 'Check the import path and ensure the module is installed or the path is correct.',
            confidence: 0.9
        },
        {
            pattern: /timeout.*exceeded/i,
            errorType: 'test_timeout',
            suggestion: 'Increase test timeout or optimize async operations. Check for infinite loops or slow operations.',
            confidence: 0.8
        },
        {
            pattern: /expected.*to be called.*times/i,
            errorType: 'mock_assertion',
            suggestion: 'Verify mock expectations match actual implementation behavior. Check if the mocked function is called correctly.',
            confidence: 0.8
        },
        {
            pattern: /type.*is not assignable to type/i,
            errorType: 'type_error',
            suggestion: 'Fix TypeScript type mismatch. Check variable types and function signatures.',
            confidence: 0.9
        }
    ];

    /**
     * Parse Jest JSON output into structured test results
     * 
     * @param jsonOutput - Raw JSON output from Jest test runner
     * @returns Structured test result summary with failures and statistics
     * @throws Error if JSON parsing fails or format is invalid
     * 
     * @example
     * ```typescript
     * const analyzer = new TestFailureAnalyzer();
     * const results = analyzer.parseJestOutput(jestJsonString);
     * console.log(`Found ${results.failures.length} failures`);
     * ```
     */
    parseJestOutput(jsonOutput: string): TestResultSummary {
        try {
            const jestResult = parseJestOutput(jsonOutput);
            
            const failures: TestFailure[] = [];
            
            // Parse test results from Jest output
            if (jestResult.testResults) {
                for (const testResult of jestResult.testResults) {
                    if (testResult.status === 'failed') {
                        failures.push(...this.parseTestResultFailures(testResult));
                    }
                }
            }
            
            return {
                totalTests: jestResult.numTotalTests || 0,
                passedTests: jestResult.numPassedTests || 0,
                failedTests: jestResult.numFailedTests || 0,
                skippedTests: jestResult.numPendingTests ?? 0,
                failures,
                duration: this.calculateDuration(jestResult),
                timestamp: new Date()
            };
        } catch (error) {
            throw new Error(`Failed to parse Jest output: ${error}`);
        }
    }

    /**
     * Parse text output from various test runners
     * 
     * @param textOutput - Raw text output from test framework (supports ✕, ×, FAIL markers)
     * @param testFile - Optional test file path for context
     * @returns Array of parsed test failures with error details
     * 
     * @example
     * ```typescript
     * const failures = analyzer.parseTextOutput(testOutput, 'math.test.js');
     * failures.forEach(f => console.log(f.errorMessage));
     * ```
     */
    parseTextOutput(textOutput: string, testFile?: string): TestFailure[] {
        const failures: TestFailure[] = [];
        const lines = textOutput.split('\n');
        
        let currentTest = '';
        let currentError = '';
        let currentStack: string[] = [];
        let inStackTrace = false;
        
        for (const line of lines) {
            // Detect test names
            const testMatch = line.match(/^\s*(?:✕|×|FAIL)\s+(.+)$/);
            if (testMatch) {
                if (currentTest && currentError) {
                    failures.push(this.createTestFailure(
                        currentTest,
                        testFile || 'unknown',
                        currentError,
                        currentStack
                    ));
                }
                currentTest = testMatch[1].trim();
                currentError = '';
                currentStack = [];
                inStackTrace = false;
                continue;
            }
            
            // Detect error messages
            const errorMatch = line.match(/^\s*(?:Error|TypeError|ReferenceError|AssertionError):\s*(.+)$/);
            if (errorMatch) {
                currentError = errorMatch[1].trim();
                inStackTrace = true;
                continue;
            }
            
            // Collect stack trace
            if (inStackTrace && line.trim().startsWith('at ')) {
                currentStack.push(line.trim());
            }
            
            // Stop collecting stack trace on empty line
            if (inStackTrace && !line.trim()) {
                inStackTrace = false;
            }
        }
        
        // Add final test if exists
        if (currentTest && currentError) {
            failures.push(this.createTestFailure(
                currentTest,
                testFile || 'unknown',
                currentError,
                currentStack
            ));
        }
        
        return failures;
    }

    /**
     * Analyze a test failure and suggest fixes based on error patterns
     * 
     * @param failure - Test failure to analyze
     * @returns Enhanced failure object with error type classification and suggestions
     * 
     * @example
     * ```typescript
     * const analyzed = analyzer.analyzeFailure(rawFailure);
     * console.log(`Error type: ${analyzed.errorType}`);
     * if (analyzed.suggestion) {
     *     console.log(`Suggestion: ${analyzed.suggestion}`);
     * }
     * ```
     */
    analyzeFailure(failure: TestFailure): TestFailure {
        const pattern = this.findMatchingPattern(failure.errorMessage);
        
        if (pattern) {
            return {
                ...failure,
                errorType: pattern.errorType,
                suggestion: pattern.suggestion
            };
        }
        
        return {
            ...failure,
            errorType: 'unknown',
            suggestion: 'Review the error message and stack trace for clues about the root cause.'
        };
    }

    /**
     * Generate formatted context for AI analysis
     * 
     * @param failure - Test failure to create context for
     * @param sourceCode - Optional source code context to include
     * @returns Markdown-formatted context string ready for AI analysis
     * 
     * @example
     * ```typescript
     * const context = analyzer.generateAIContext(failure, sourceCode);
     * await copilot.analyze(context);
     * ```
     */
    generateAIContext(failure: TestFailure, sourceCode?: string): string {
        const context = [
            '# Test Failure Analysis',
            '',
            `**Test**: ${failure.testName}`,
            `**File**: ${failure.testFile}`,
            `**Error Type**: ${failure.errorType}`,
            '',
            '## Error Message',
            '```',
            failure.errorMessage,
            '```',
            '',
            '## Stack Trace',
            '```',
            ...failure.stackTrace,
            '```'
        ];
        
        if (failure.suggestion) {
            context.push(
                '',
                '## Suggested Fix',
                failure.suggestion
            );
        }
        
        if (sourceCode) {
            context.push(
                '',
                '## Source Code Context',
                '```typescript',
                sourceCode,
                '```'
            );
        }
        
        context.push(
            '',
            '## Request',
            'Please analyze this test failure and provide specific code changes to fix the issue.',
            'Focus on the most likely root cause and provide working code examples.'
        );
        
        return context.join('\n');
    }

    /**
     * Extract source file locations from stack trace frames
     * 
     * @param stackTrace - Array of stack trace lines from error
     * @returns Object containing file path, line number, and column number if found
     * 
     * @example
     * ```typescript
     * const location = analyzer.extractSourceLocation(failure.stackTrace);
     * if (location.file) {
     *     console.log(`Error at ${location.file}:${location.line}`);
     * }
     * ```
     */
    extractSourceLocation(stackTrace: string[]): { file?: string; line?: number; column?: number } {
        for (const frame of stackTrace) {
            // Match common stack trace formats
            const match = frame.match(/at .* \((.+):(\d+):(\d+)\)/) || 
                         frame.match(/at (.+):(\d+):(\d+)$/);
            
            if (match) {
                const [, filePath, lineStr, columnStr] = match;
                const line = parseInt(lineStr, 10);
                const column = parseInt(columnStr, 10);
                
                // Filter out test files and node_modules
                if (!filePath.includes('node_modules') && 
                    !filePath.includes('.spec.') && 
                    !filePath.includes('.test.')) {
                    return {
                        file: path.resolve(filePath),
                        line: isNaN(line) ? undefined : line,
                        column: isNaN(column) ? undefined : column
                    };
                }
            }
        }
        
        return {};
    }

    /**
     * Group failures by error type for pattern analysis
     * 
     * @param failures - Array of test failures to group
     * @returns Map of error type to array of failures of that type
     * 
     * @example
     * ```typescript
     * const groups = analyzer.groupFailuresByType(failures);
     * console.log(`Found ${groups.get('assertion_mismatch')?.length} assertion errors`);
     * ```
     */
    groupFailuresByType(failures: TestFailure[]): Map<string, TestFailure[]> {
        const groups = new Map<string, TestFailure[]>();
        
        for (const failure of failures) {
            const analyzed = this.analyzeFailure(failure);
            const key = analyzed.errorType;
            
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            
            groups.get(key)!.push(analyzed);
        }
        
        return groups;
    }

    /**
     * Create a human-readable summary of the most common failure types
     * 
     * @param failures - Array of test failures to summarize
     * @returns Human-readable summary string with error types and suggestions
     * 
     * @example
     * ```typescript
     * const summary = analyzer.createFailureSummary(failures);
     * console.log(summary);
     * // Output: "Found 5 test failure(s):\n**assertion_mismatch** (3 failures):\n  • should calculate sum\n    Check the expected vs actual values..."
     * ```
     */
    createFailureSummary(failures: TestFailure[]): string {
        if (failures.length === 0) {
            return 'No test failures to analyze.';
        }
        
        const groups = this.groupFailuresByType(failures);
        const summary = [`Found ${failures.length} test failure(s):`];
        
        for (const [errorType, typeFailures] of groups.entries()) {
            summary.push(`\n**${errorType}** (${typeFailures.length} failure${typeFailures.length > 1 ? 's' : ''}):`);
            
            for (const failure of typeFailures.slice(0, 3)) { // Show max 3 per type
                summary.push(`  • ${failure.testName}`);
                if (failure.suggestion) {
                    summary.push(`    ${failure.suggestion}`);
                }
            }
            
            if (typeFailures.length > 3) {
                summary.push(`  ... and ${typeFailures.length - 3} more`);
            }
        }
        
        return summary.join('\n');
    }

    /**
     * Parse individual test result failures from Jest
     */
    private parseTestResultFailures(testResult: JestTestResult): TestFailure[] {
        const failures: TestFailure[] = [];
        
        if (testResult.assertionResults) {
            for (const assertion of testResult.assertionResults) {
                if (assertion.status === 'failed') {
                    const stackTrace = assertion.failureMessages || [];
                    const errorMessage = stackTrace[0] || 'Test failed';
                    
                    failures.push(this.createTestFailure(
                        assertion.title || assertion.fullName || 'Unknown test',
                        testResult.name,
                        errorMessage,
                        stackTrace
                    ));
                }
            }
        }
        
        return failures;
    }

    /**
     * Create a structured TestFailure object
     */
    private createTestFailure(
        testName: string,
        testFile: string,
        errorMessage: string,
        stackTrace: string[]
    ): TestFailure {
        const location = this.extractSourceLocation(stackTrace);
        
        return {
            testName,
            testFile,
            errorMessage,
            errorType: 'unknown',
            stackTrace,
            sourceFile: location.file,
            lineNumber: location.line,
            columnNumber: location.column
        };
    }

    /**
     * Find matching error pattern
     */
    private findMatchingPattern(errorMessage: string): ErrorPattern | null {
        for (const pattern of this.errorPatterns) {
            if (pattern.pattern.test(errorMessage)) {
                return pattern;
            }
        }
        return null;
    }

    /**
     * Calculate test duration from Jest result
     */
    private calculateDuration(jestResult: JestTestRunResult): number {
        if (jestResult.startTime && jestResult.endTime) {
            return jestResult.endTime - jestResult.startTime;
        }
        return 0;
    }
}