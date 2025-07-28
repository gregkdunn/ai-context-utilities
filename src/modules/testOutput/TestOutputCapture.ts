/**
 * Test Output Capture Module
 * Captures test output and saves to .github/instructions/ai_debug_context/test-output.txt
 * Part of Phase 2.0 - Git Diff & Post-Test Intelligence
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface TestOutputOptions {
    workspaceRoot: string;
    outputChannel: vscode.OutputChannel;
}

/**
 * Service for capturing test output and saving to instructions directory
 */
export class TestOutputCapture {
    private readonly instructionsPath: string;
    private readonly outputFilePath: string;
    private currentOutput: string[] = [];
    private isCapturing: boolean = false;

    constructor(private options: TestOutputOptions) {
        this.instructionsPath = path.join(
            this.options.workspaceRoot,
            '.github',
            'instructions',
            'ai-utilities-context'
        );
        this.outputFilePath = path.join(this.instructionsPath, 'test-output.txt');
    }

    /**
     * Start capturing test output
     */
    startCapture(testCommand: string, project?: string): void {
        this.currentOutput = [];
        this.isCapturing = true;
        
        const timestamp = new Date().toISOString();
        this.currentOutput.push('# Test Output');
        this.currentOutput.push(`# Generated: ${timestamp}`);
        this.currentOutput.push(`# Command: ${testCommand}`);
        if (project) {
            this.currentOutput.push(`# Project: ${project}`);
        }
        this.currentOutput.push('#' + '='.repeat(60));
        this.currentOutput.push('');
    }

    /**
     * Append output line during capture
     */
    appendOutput(line: string): void {
        if (this.isCapturing) {
            // Strip ANSI color codes
            const cleanLine = this.stripAnsi(line);
            this.currentOutput.push(cleanLine);
        }
    }

    /**
     * Stop capturing and save to file (Phase 2.1 - Legacy nxTest.zsh format)
     */
    async stopCapture(exitCode: number, summary?: any): Promise<boolean> {
        if (!this.isCapturing) {
            return false;
        }

        this.isCapturing = false;

        try {
            // Create AI-optimized output in legacy nxTest.zsh format
            const formattedOutput = this.createAIOptimizedOutput(exitCode, summary);

            // Ensure directory exists
            await this.ensureDirectoryExists();

            // Write formatted output to file
            await fs.promises.writeFile(this.outputFilePath, formattedOutput);

            this.options.outputChannel.appendLine(
                `✅ Test output saved to ${this.getRelativePath(this.outputFilePath)}`
            );
            return true;

        } catch (error) {
            this.options.outputChannel.appendLine(`❌ Failed to save test output: ${error}`);
            return false;
        }
    }

    /**
     * Create AI-optimized output matching legacy nxTest.zsh format
     * 
     * This method is the core of Phase 2.1 legacy format matching. It transforms
     * raw Jest test output into the exact format expected by the legacy nxTest.zsh
     * script, ensuring 100% compatibility while adding modern intelligence.
     * 
     * The format follows this structure:
     * 1. Header with command and status
     * 2. Executive summary with test counts
     * 3. Failure analysis (if tests failed)
     * 4. Test results summary with file-level results
     * 5. Performance insights for slow tests
     * 
     * @param exitCode - Test process exit code (0 = success, non-zero = failure)
     * @param summary - Optional additional test summary data
     * @returns Formatted test output string matching legacy nxTest.zsh format
     */
    private createAIOptimizedOutput(exitCode: number, summary?: any): string {
        const rawOutput = this.currentOutput.join('\n');
        const command = this.extractCommand();
        const project = this.extractProject();
        
        // Extract test statistics from raw output using intelligent parsing
        // This replicates the exact logic from the legacy nxTest.zsh script
        const stats = this.extractTestStatistics(rawOutput);
        
        const sections = [
            '=================================================================',
            '🤖 TEST ANALYSIS REPORT',
            '=================================================================',
            '',
            `COMMAND: ${command}`,
            `EXIT CODE: ${exitCode}`,
            `STATUS: ${exitCode === 0 ? '✅ PASSED' : '❌ FAILED'}`,
            '',
            '=================================================================',
            '📊 EXECUTIVE SUMMARY',
            '=================================================================',
            stats.testSuites || 'Test Suites: Information not available',
            stats.tests || 'Tests: Information not available',
            stats.time || 'Time: Information not available',
            `Test Suites: ${stats.passedSuites} passed, ${stats.failedSuites} failed`,
            ''
        ];

        // Add failure analysis section for failing tests (legacy nxTest.zsh compatibility)
        // This section provides AI-optimized failure information that exactly matches
        // the structure and content expected by AI debugging workflows
        if (exitCode !== 0) {
            sections.push(
                '==================================================================',
                '💥 FAILURE ANALYSIS',
                '=================================================================='
            );

            // Extract compilation errors using pattern matching
            // Detects TypeScript compilation errors, module resolution issues, etc.
            const compilationErrors = this.extractCompilationErrors(rawOutput);
            if (compilationErrors.length > 0) {
                sections.push(
                    '',
                    '🔥 COMPILATION/RUNTIME ERRORS:',
                    '--------------------------------',
                    ...compilationErrors
                );
            }

            // Extract individual test failures with error messages
            // Parses Jest test failure output to provide structured failure information
            const testFailures = this.extractTestFailures(rawOutput);
            if (testFailures.length > 0) {
                sections.push(
                    '',
                    '🧪 TEST FAILURES:',
                    '-----------------',
                    ...testFailures
                );
            }

            sections.push('');
        }

        // Add test results summary
        sections.push(
            '==================================================================',
            '🧪 TEST RESULTS SUMMARY',
            '==================================================================',
            ''
        );

        // Extract and format test suite results
        const suiteResults = this.extractSuiteResults(rawOutput);
        sections.push(...suiteResults);

        // Add performance insights
        if (stats.time) {
            sections.push(
                '',
                '==================================================================',
                '⚡ PERFORMANCE INSIGHTS',
                '==================================================================',
                stats.time
            );

            // Extract slow tests if available
            const slowTests = this.extractSlowTests(rawOutput);
            if (slowTests.length > 0) {
                sections.push(
                    '',
                    'Slow tests (>1s):',
                    ...slowTests
                );
            }
        }

        return sections.join('\n');
    }

    /**
     * Extract command from captured output
     */
    private extractCommand(): string {
        for (const line of this.currentOutput) {
            if (line.startsWith('# Command:')) {
                return line.replace('# Command: ', '');
            }
        }
        return 'yarn nx test';
    }

    /**
     * Extract project from captured output
     */
    private extractProject(): string {
        for (const line of this.currentOutput) {
            if (line.startsWith('# Project:')) {
                return line.replace('# Project: ', '');
            }
        }
        return 'unknown';
    }

    /**
     * Extract test statistics from raw output
     */
    private extractTestStatistics(output: string): {
        testSuites: string;
        tests: string;
        time: string;
        passedSuites: number;
        failedSuites: number;
    } {
        const lines = output.split('\n');
        let testSuites = '';
        let tests = '';
        let time = '';
        let passedSuites = 0;
        let failedSuites = 0;

        for (const line of lines) {
            if (line.includes('Test Suites:') && line.includes('total')) {
                testSuites = line.trim();
            }
            if (line.includes('Tests:') && line.includes('total')) {
                tests = line.trim();
            }
            if (line.includes('Time:') && line.includes('s')) {
                time = line.trim();
            }
            if (line.includes('PASS') && line.includes('.spec.ts')) {
                passedSuites++;
            }
            if (line.includes('FAIL') && line.includes('.spec.ts')) {
                failedSuites++;
            }
        }

        return { testSuites, tests, time, passedSuites, failedSuites };
    }

    /**
     * Extract compilation errors from output
     */
    private extractCompilationErrors(output: string): string[] {
        const errors: string[] = [];
        const lines = output.split('\n');
        let inErrorSection = false;

        for (const line of lines) {
            if (line.includes('Test suite failed to run')) {
                inErrorSection = true;
                continue;
            }
            
            if (inErrorSection) {
                if (line.includes('error TS') || 
                    line.includes('Property') && line.includes('does not exist') ||
                    line.includes('Cannot find') ||
                    line.includes('Type') && line.includes('is not assignable')) {
                    errors.push(`  • ${line.trim()}`);
                }
                
                // Stop at empty line or next section
                if (line.trim() === '' && errors.length > 0) {
                    break;
                }
            }
        }

        return errors;
    }

    /**
     * Extract test failures from output
     */
    private extractTestFailures(output: string): string[] {
        const failures: string[] = [];
        const lines = output.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Look for test failure patterns
            if (line.includes('●') && line.includes('›')) {
                failures.push(`  • ${line.trim()}`);
                
                // Try to get the next line with failure reason
                if (i + 1 < lines.length && lines[i + 1].trim()) {
                    failures.push(`    ${lines[i + 1].trim()}`);
                    failures.push('');
                }
            }
            
            // Look for expect failures
            if (line.includes('expect') && (line.includes('toEqual') || line.includes('toBe'))) {
                failures.push(`    ${line.trim()}`);
            }
        }

        return failures;
    }

    /**
     * Extract test suite results
     */
    private extractSuiteResults(output: string): string[] {
        const results: string[] = [];
        const lines = output.split('\n');

        for (const line of lines) {
            if (line.includes('PASS') && line.includes('.spec.ts')) {
                const suite = line.replace(/.*PASS\s+[^\s]+\s+/, '').replace(/\([0-9.]+ s\)/, '').trim();
                results.push(`✅ ${suite}`);
            }
            if (line.includes('FAIL') && line.includes('.spec.ts')) {
                const suite = line.replace(/.*FAIL\s+[^\s]+\s+/, '').replace(/\([0-9.]+ s\)/, '').trim();
                results.push(`❌ ${suite}`);
            }
        }

        return results.length > 0 ? results : ['No test suite results found'];
    }

    /**
     * Extract slow tests from output
     */
    private extractSlowTests(output: string): string[] {
        const slowTests: string[] = [];
        const lines = output.split('\n');

        for (const line of lines) {
            // Look for tests that took more than 1 second
            const timeMatch = line.match(/\(([0-9.]+) s\)/);
            if (timeMatch && parseFloat(timeMatch[1]) > 1.0) {
                const testName = line.replace(/\([0-9.]+ s\)/, '').trim();
                slowTests.push(`• ${testName}: ${timeMatch[1]}s`);
            }
        }

        return slowTests;
    }

    /**
     * Strip ANSI escape codes from string
     */
    private stripAnsi(str: string): string {
        // eslint-disable-next-line no-control-regex
        return str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '');
    }

    /**
     * Ensure the instructions directory exists
     */
    private async ensureDirectoryExists(): Promise<void> {
        try {
            await fs.promises.mkdir(this.instructionsPath, { recursive: true });
        } catch (error: any) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Get relative path for display
     */
    private getRelativePath(fullPath: string): string {
        return path.relative(this.options.workspaceRoot, fullPath);
    }

    /**
     * Check if output file exists
     */
    async outputExists(): Promise<boolean> {
        try {
            await fs.promises.access(this.outputFilePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get the output file path
     */
    getOutputFilePath(): string {
        return this.outputFilePath;
    }

    /**
     * Clear the output file
     */
    async clearOutput(): Promise<void> {
        try {
            if (await this.outputExists()) {
                await fs.promises.unlink(this.outputFilePath);
                this.options.outputChannel.appendLine('🗑️  Test output cleared');
            }
        } catch (error) {
            this.options.outputChannel.appendLine(`⚠️  Failed to clear output: ${error}`);
        }
    }

    /**
     * Get captured output as string (for preview)
     */
    getCapturedOutput(): string {
        return this.currentOutput.join('\n');
    }
}