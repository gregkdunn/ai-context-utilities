/**
 * Test result parser that extracts meaningful information from test output
 * Part of Phase 1.7 immediate wins - Add test result parsing
 */

export interface TestFailure {
    test: string;
    suite: string;
    error: string;
    file?: string;
    line?: number;
}

export interface TestSummary {
    project: string;
    passed: number;
    failed: number;
    skipped: number;
    total: number;
    duration: number;
    success: boolean;
    failures: TestFailure[];
}

export class TestResultParser {
    
    /**
     * Clean ANSI escape sequences from output
     */
    private static cleanAnsiCodes(text: string): string {
        // Remove ANSI escape sequences (colors, formatting)
        return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
                  .replace(/\[[0-9]+m/g, '')  // Additional pattern for sequences like [1m
                  .replace(/\[22m/g, '')      // Specific pattern we're seeing
                  .replace(/\r/g, '');        // Remove carriage returns
    }
    
    /**
     * Parse Jest test output into structured result
     */
    static parseJestOutput(output: string, project: string): TestSummary {
        // Clean ANSI escape sequences first
        const cleanOutput = this.cleanAnsiCodes(output);
        const lines = cleanOutput.split('\n');
        let passed = 0;
        let failed = 0;
        let skipped = 0;
        let duration = 0;
        const failures: TestFailure[] = [];
        
        // Check for compilation failures first - more comprehensive detection
        const hasCompilationFailure = cleanOutput.includes('Test suite failed to run') || 
                                    cleanOutput.includes('FAIL ') ||
                                    cleanOutput.includes('Cannot find module') ||
                                    cleanOutput.includes('SyntaxError') ||
                                    cleanOutput.includes('TypeError') ||
                                    cleanOutput.includes('error TS') ||
                                    cleanOutput.includes('Your test suite must contain at least') ||
                                    cleanOutput.includes('No tests found') ||
                                    cleanOutput.includes('Test run failed');
        
        // Extract summary line (e.g., "Tests: 1 failed, 2 passed, 3 total")
        let foundSummary = false;
        for (const line of lines) {
            const summaryMatch = line.match(/Tests:\s+(.+)/);
            if (summaryMatch) {
                foundSummary = true;
                const summaryText = summaryMatch[1];
                
                const failedMatch = summaryText.match(/(\d+)\s+failed/);
                if (failedMatch) failed = parseInt(failedMatch[1]);
                
                const passedMatch = summaryText.match(/(\d+)\s+passed/);
                if (passedMatch) passed = parseInt(passedMatch[1]);
                
                const skippedMatch = summaryText.match(/(\d+)\s+skipped/);
                if (skippedMatch) skipped = parseInt(skippedMatch[1]);
                
                break;
            }
        }
        
        // If no summary found but we have compilation failures, mark as failed
        if (!foundSummary && hasCompilationFailure) {
            failed = 1;
            passed = 0;
            skipped = 0;
        }
        
        // Extract time (e.g., "Time: 2.345 s") 
        for (const line of lines) {
            const timeMatch = line.match(/Time:\s+([\d.]+)\s*s/);
            if (timeMatch) {
                duration = parseFloat(timeMatch[1]);
                break;
            }
        }
        
        // Extract failed test details
        failures.push(...this.extractJestFailures(lines));
        
        // If we have compilation failures but no test failures extracted, create one
        if (hasCompilationFailure && failures.length === 0) {
            failures.push({
                test: 'Test Suite Compilation',
                suite: project,
                error: this.extractCompilationError(cleanOutput),
                file: undefined,
                line: undefined
            });
        }
        
        const total = passed + failed + skipped;
        
        // Ensure consistency - if we have failures, mark as not successful
        const success = failed === 0 && failures.length === 0 && !hasCompilationFailure;
        
        return {
            project,
            passed,
            failed: Math.max(failed, failures.length > 0 ? 1 : 0),
            skipped,
            total: hasCompilationFailure ? Math.max(total, 1) : total, // Ensure at least 1 only if compilation failed
            duration,
            success,
            failures
        };
    }
    
    /**
     * Parse Nx test output
     */
    static parseNxOutput(output: string, project: string): TestSummary {
        // Nx wraps Jest, so we can use Jest parsing
        return this.parseJestOutput(output, project);
    }
    
    /**
     * Extract compilation error details
     */
    private static extractCompilationError(output: string): string {
        const lines = output.split('\n');
        const errorLines: string[] = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Capture key error patterns
            if (trimmedLine.includes('Test suite failed to run') ||
                trimmedLine.includes('FAIL ') ||
                trimmedLine.includes('Cannot find module') ||
                trimmedLine.includes('SyntaxError') ||
                trimmedLine.includes('TypeError') ||
                trimmedLine.includes('error TS') ||
                trimmedLine.includes('Module not found') ||
                trimmedLine.includes('Unexpected token') ||
                trimmedLine.includes('Your test suite must contain at least') ||
                trimmedLine.includes('No tests found') ||
                trimmedLine.includes('Test run failed')) {
                errorLines.push(trimmedLine);
            }
        }
        
        // If we found "test suite must contain at least", provide a helpful message
        if (output.includes('Your test suite must contain at least')) {
            return 'Test suite compilation failed: No valid test cases found.\n' +
                   'This usually means:\n' +
                   '• Test files have syntax errors preventing execution\n' +
                   '• Test suites are empty or malformed\n' +
                   '• Import/export issues in test files\n' +
                   'Check the test files for compilation errors.';
        }
        
        return errorLines.slice(0, 5).join('\n') || 'Unknown compilation error';
    }

    /**
     * Extract detailed failure information from Jest output
     */
    private static extractJestFailures(lines: string[]): TestFailure[] {
        const failures: TestFailure[] = [];
        let currentFailure: Partial<TestFailure> | null = null;
        let inFailureSection = false;
        let collectingError = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detect FAIL lines for test suites
            if (line.startsWith('FAIL ') || line.includes('Test suite failed to run')) {
                inFailureSection = true;
                
                // Extract file name from FAIL line
                const failMatch = line.match(/FAIL\s+(.+\.spec\.ts)/);
                if (failMatch) {
                    if (currentFailure && currentFailure.test) {
                        failures.push(currentFailure as TestFailure);
                    }
                    currentFailure = {
                        suite: failMatch[1],
                        test: 'Test Suite Failed',
                        error: '',
                        file: failMatch[1]
                    };
                }
            }
            
            // Detect individual test failures
            if (line.includes('● ')) {
                collectingError = true;
                
                // Extract test suite and test name
                const failMatch = line.match(/● (.+) › (.+)/);
                if (failMatch) {
                    if (currentFailure && currentFailure.test && currentFailure.test !== 'Test Suite Failed') {
                        failures.push(currentFailure as TestFailure);
                    }
                    currentFailure = {
                        suite: failMatch[1].trim(),
                        test: failMatch[2].trim(),
                        error: ''
                    };
                } else {
                    // Single line format
                    const singleMatch = line.match(/● (.+)/);
                    if (singleMatch) {
                        if (currentFailure && currentFailure.test && currentFailure.test !== 'Test Suite Failed') {
                            failures.push(currentFailure as TestFailure);
                        }
                        currentFailure = {
                            suite: '',
                            test: singleMatch[1].trim(),
                            error: ''
                        };
                    }
                }
            }
            
            // Collect error details
            if ((inFailureSection || collectingError) && currentFailure && line.trim()) {
                if (line.includes('at ') && line.includes(':')) {
                    // Extract file and line number
                    const locationMatch = line.match(/at .+ \((.+):(\d+):\d+\)/);
                    if (locationMatch) {
                        currentFailure.file = locationMatch[1];
                        currentFailure.line = parseInt(locationMatch[2]);
                    }
                } else if (!line.startsWith('●') && 
                          !line.startsWith('FAIL') && 
                          !line.startsWith('Test Suites:') &&
                          !line.startsWith('Tests:') &&
                          !line.startsWith('Time:') &&
                          line.trim() !== '') {
                    // Add to error message
                    const cleanLine = line.trim();
                    if (cleanLine && !cleanLine.match(/^\s*at\s+/) && (currentFailure.error || '').length < 500) {
                        currentFailure.error = (currentFailure.error || '') + (currentFailure.error ? '\n' : '') + cleanLine;
                    }
                }
            }
            
            // End of failure section
            if ((inFailureSection || collectingError) && 
                (line.includes('Test Suites:') || line.includes('Tests:') || line.includes('Time:'))) {
                inFailureSection = false;
                collectingError = false;
                if (currentFailure && currentFailure.test) {
                    failures.push(currentFailure as TestFailure);
                    currentFailure = null;
                }
            }
        }
        
        // Add last failure if exists
        if (currentFailure && currentFailure.test) {
            failures.push(currentFailure as TestFailure);
        }
        
        return failures;
    }
    
    /**
     * Format test summary for display
     */
    static formatSummary(result: TestSummary): string {
        const { project, passed, failed, skipped, total, duration, success } = result;
        
        if (success) {
            return `✅ ${project}: All ${total} tests passed (${duration.toFixed(1)}s)`;
        } else {
            const parts = [];
            if (failed > 0) parts.push(`${failed} failed`);
            if (passed > 0) parts.push(`${passed} passed`);
            if (skipped > 0) parts.push(`${skipped} skipped`);
            
            return `❌ ${project}: ${parts.join(', ')} (${duration.toFixed(1)}s)`;
        }
    }
    
    /**
     * Format failure details for display
     */
    static formatFailures(failures: TestFailure[]): string {
        if (failures.length === 0) return '';
        
        return failures.map(failure => {
            const location = failure.file 
                ? ` (${failure.file}${failure.line ? `:${failure.line}` : ''})`
                : '';
            const suite = failure.suite ? `${failure.suite} › ` : '';
            return `   ❌ ${suite}${failure.test}${location}`;
        }).join('\n');
    }
    
    /**
     * Extract test names for re-running failed tests
     */
    static getFailedTestPatterns(failures: TestFailure[]): string[] {
        return failures.map(failure => {
            // Create a pattern that Jest can use with --testNamePattern
            const escapedTest = failure.test.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return failure.suite 
                ? `${failure.suite}.*${escapedTest}`
                : escapedTest;
        });
    }
    
    /**
     * Check if output indicates specific error types
     */
    static detectErrorType(output: string): 'timeout' | 'dependency' | 'syntax' | 'config' | 'unknown' {
        const lowerOutput = output.toLowerCase();
        
        if (lowerOutput.includes('timeout') || lowerOutput.includes('timed out')) {
            return 'timeout';
        }
        
        if (lowerOutput.includes('cannot find module') || lowerOutput.includes('module not found')) {
            return 'dependency';
        }
        
        if (lowerOutput.includes('syntaxerror') || lowerOutput.includes('unexpected token')) {
            return 'syntax';
        }
        
        if (lowerOutput.includes('jest config') || lowerOutput.includes('configuration')) {
            return 'config';
        }
        
        return 'unknown';
    }
    
    /**
     * Parse execution time from various test runner outputs
     */
    static extractDuration(output: string): number {
        const patterns = [
            /Time:\s+([\d.]+)\s*s/,           // Jest format
            /Ran for ([\d.]+)s/,              // Nx format
            /Done in ([\d.]+)s/,              // General format
            /Finished in ([\d.]+)s/           // Alternative format
        ];
        
        for (const pattern of patterns) {
            const match = output.match(pattern);
            if (match) {
                return parseFloat(match[1]);
            }
        }
        
        return 0;
    }
}