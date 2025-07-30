/**
 * Native Test Runner - Replaces shell script dependencies
 * Phase 2.0.3 - Real TypeScript implementation, not shell script wrapper
 */

import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { TestIntelligenceEngine } from '../core/TestIntelligenceEngine';
import { RealTimeTestMonitor } from './RealTimeTestMonitor';
import { TestAnalysisHelper } from './TestAnalysisHelper';
import { TestResultParser, TestFailure } from '../utils/testResultParser';

export interface NativeTestResult {
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    duration: number;
    testFiles: string[];
    failures: TestFailure[];
    predictions?: {
        accurateFailures: number;
        totalPredictions: number;
        accuracy: number;
    };
}

export interface TestExecutionOptions {
    maxConcurrency?: number;
    timeout?: number;
    verbose?: boolean;
    failFast?: boolean;
    useIntelligence?: boolean;
}

/**
 * Native test runner that replaces shell script dependencies with real TypeScript intelligence
 */
export class NativeTestRunner {
    private currentProcess: ChildProcess | null = null;
    private abortController = new AbortController();

    constructor(
        private workspaceRoot: string,
        private outputChannel: vscode.OutputChannel,
        private testIntelligence: TestIntelligenceEngine,
        private realTimeMonitor: RealTimeTestMonitor,
        private testAnalysisHelper: TestAnalysisHelper
    ) {}

    /**
     * Run affected tests using git diff and intelligent selection
     */
    async runAffectedTests(options: TestExecutionOptions = {}): Promise<NativeTestResult> {
        const startTime = Date.now();
        this.outputChannel.appendLine('🚀 Running affected tests with native intelligence...');

        try {
            // Get changed files using git
            const changedFiles = await this.getChangedFiles();
            this.outputChannel.appendLine(`📂 Found ${changedFiles.length} changed files`);

            // Find affected test files
            const affectedTestFiles = await this.findAffectedTestFiles(changedFiles);
            
            if (affectedTestFiles.length === 0) {
                this.outputChannel.appendLine('✅ No test files affected by changes');
                return {
                    success: true,
                    exitCode: 0,
                    stdout: 'No tests affected',
                    stderr: '',
                    duration: Date.now() - startTime,
                    testFiles: [],
                    failures: []
                };
            }

            // Use intelligence to optimize test order if enabled
            let optimizedTestFiles = affectedTestFiles;
            let predictions;
            
            if (options.useIntelligence !== false) {
                const testMetadata = affectedTestFiles.map(file => ({
                    testName: this.extractTestName(file),
                    fileName: file
                }));
                
                // Use files in the order they were found (no complex prediction system)
                optimizedTestFiles = affectedTestFiles;
                
                predictions = {
                    accurateFailures: 0,
                    totalPredictions: 0,
                    accuracy: 0
                };
                
                this.outputChannel.appendLine(`📋 Running ${affectedTestFiles.length} test files in standard order`);
            }

            // Execute tests
            const result = await this.executeTestFiles(optimizedTestFiles, options);
            
            // Calculate prediction accuracy if we had predictions
            if (predictions && result.failures.length > 0) {
                const actualFailures = result.failures.map(f => f.test);
                const predictedFailures = predictions.totalPredictions > 0 ? 
                    await this.getPredictedFailureNames(optimizedTestFiles) : [];
                
                const correctPredictions = actualFailures.filter(failure => 
                    predictedFailures.some(predicted => failure.includes(predicted))
                ).length;
                
                predictions.accurateFailures = correctPredictions;
                predictions.accuracy = predictions.totalPredictions > 0 ? 
                    correctPredictions / predictions.totalPredictions : 0;
                
                this.outputChannel.appendLine(`🎯 Prediction accuracy: ${(predictions.accuracy * 100).toFixed(0)}% (${correctPredictions}/${predictions.totalPredictions})`);
            }

            return {
                ...result,
                predictions
            };

        } catch (error) {
            this.outputChannel.appendLine(`❌ Affected test execution failed: ${error}`);
            return {
                success: false,
                exitCode: 1,
                stdout: '',
                stderr: String(error),
                duration: Date.now() - startTime,
                testFiles: [],
                failures: []
            };
        }
    }

    /**
     * Run tests in parallel with intelligent chunking
     */
    async runParallelTests(testFiles: string[], options: TestExecutionOptions = {}): Promise<NativeTestResult> {
        const startTime = Date.now();
        const maxConcurrency = options.maxConcurrency || Math.min(4, testFiles.length);
        
        this.outputChannel.appendLine(`🔀 Running ${testFiles.length} test files in parallel (max ${maxConcurrency} concurrent)`);

        // Start monitoring
        this.realTimeMonitor.startMonitoring();

        try {
            // Chunk test files for parallel execution
            const chunks = this.chunkArray(testFiles, maxConcurrency);
            const results: NativeTestResult[] = [];

            // Execute chunks in parallel
            const chunkPromises = chunks.map(async (chunk, index) => {
                this.outputChannel.appendLine(`🧩 Starting chunk ${index + 1}/${chunks.length} with ${chunk.length} files`);
                return this.executeTestFiles(chunk, { ...options, verbose: false });
            });

            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);

            // Combine results
            const combinedResult = this.combineResults(results, testFiles, Date.now() - startTime);
            
            return combinedResult;

        } catch (error) {
            this.outputChannel.appendLine(`❌ Parallel test execution failed: ${error}`);
            return {
                success: false,
                exitCode: 1,
                stdout: '',
                stderr: String(error),
                duration: Date.now() - startTime,
                testFiles,
                failures: []
            };
        } finally {
            this.realTimeMonitor.stopMonitoring();
        }
    }

    /**
     * Execute a set of test files sequentially
     */
    private async executeTestFiles(testFiles: string[], options: TestExecutionOptions = {}): Promise<NativeTestResult> {
        const startTime = Date.now();
        let allStdout = '';
        let allStderr = '';
        let hasFailures = false;
        const allFailures: TestFailure[] = [];

        for (const testFile of testFiles) {
            if (this.abortController.signal.aborted) {
                break;
            }

            this.outputChannel.appendLine(`🧪 Running: ${testFile}`);
            
            try {
                const result = await this.runSingleTestFile(testFile, options);
                allStdout += result.stdout + '\n';
                allStderr += result.stderr + '\n';
                
                if (result.exitCode !== 0) {
                    hasFailures = true;
                    
                    // Parse failures from this file
                    const testSummary = TestResultParser.parseJestOutput(result.stdout + result.stderr, testFile);
                    allFailures.push(...testSummary.failures);
                    
                    if (options.failFast) {
                        this.outputChannel.appendLine('🛑 Fail-fast enabled, stopping on first failure');
                        break;
                    }
                }
                
            } catch (error) {
                this.outputChannel.appendLine(`❌ Failed to run ${testFile}: ${error}`);
                hasFailures = true;
                allStderr += `Error running ${testFile}: ${error}\n`;
                
                if (options.failFast) {
                    break;
                }
            }
        }

        return {
            success: !hasFailures,
            exitCode: hasFailures ? 1 : 0,
            stdout: allStdout,
            stderr: allStderr,
            duration: Date.now() - startTime,
            testFiles,
            failures: allFailures
        };
    }

    /**
     * Run a single test file
     */
    private async runSingleTestFile(testFile: string, options: TestExecutionOptions = {}): Promise<{
        exitCode: number;
        stdout: string;
        stderr: string;
    }> {
        return new Promise((resolve, reject) => {
            // Determine test command based on file extension and framework
            const command = this.getTestCommandForFile(testFile);
            const args = [testFile];
            
            if (options.verbose) {
                args.push('--verbose');
            }

            this.currentProcess = spawn(command, args, {
                cwd: this.workspaceRoot,
                stdio: ['ignore', 'pipe', 'pipe'],
                signal: this.abortController.signal
            });

            let stdout = '';
            let stderr = '';

            this.currentProcess.stdout?.on('data', (data) => {
                const text = data.toString();
                stdout += text;
                this.realTimeMonitor.processOutput(text);
            });

            this.currentProcess.stderr?.on('data', (data) => {
                const text = data.toString();
                stderr += text;
                this.realTimeMonitor.processOutput(text);
            });

            this.currentProcess.on('close', (code) => {
                this.currentProcess = null;
                resolve({
                    exitCode: code || 0,
                    stdout,
                    stderr
                });
            });

            this.currentProcess.on('error', (error) => {
                this.currentProcess = null;
                reject(error);
            });

            // Timeout handling
            if (options.timeout) {
                setTimeout(() => {
                    if (this.currentProcess) {
                        this.currentProcess.kill('SIGTERM');
                        reject(new Error(`Test execution timed out after ${options.timeout}ms`));
                    }
                }, options.timeout);
            }
        });
    }

    /**
     * Get changed files using git
     */
    private async getChangedFiles(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const gitProcess = spawn('git', ['diff', '--name-only', 'HEAD~1', 'HEAD'], {
                cwd: this.workspaceRoot,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            gitProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            gitProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            gitProcess.on('close', (code) => {
                if (code === 0) {
                    const files = stdout.split('\n').filter(f => f.trim().length > 0);
                    resolve(files);
                } else {
                    // Fallback to staged changes if no commits
                    const stagedProcess = spawn('git', ['diff', '--name-only', '--staged'], {
                        cwd: this.workspaceRoot,
                        stdio: ['ignore', 'pipe', 'pipe']
                    });
                    
                    let stagedStdout = '';
                    stagedProcess.stdout?.on('data', (data) => {
                        stagedStdout += data.toString();
                    });
                    
                    stagedProcess.on('close', (stagedCode) => {
                        if (stagedCode === 0) {
                            const files = stagedStdout.split('\n').filter(f => f.trim().length > 0);
                            resolve(files);
                        } else {
                            resolve([]); // No changes
                        }
                    });
                }
            });

            gitProcess.on('error', () => {
                resolve([]); // Fallback to empty if git fails
            });
        });
    }

    /**
     * Find test files affected by changed files
     */
    private async findAffectedTestFiles(changedFiles: string[]): Promise<string[]> {
        const testFiles: Set<string> = new Set();

        for (const file of changedFiles) {
            // Direct test files
            if (this.isTestFile(file)) {
                testFiles.add(file);
                continue;
            }

            // Find corresponding test files for source files
            const correspondingTests = await this.findCorrespondingTestFiles(file);
            correspondingTests.forEach(test => testFiles.add(test));
        }

        return Array.from(testFiles);
    }

    /**
     * Check if a file is a test file
     */
    private isTestFile(file: string): boolean {
        return /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(file);
    }

    /**
     * Find test files that correspond to a source file
     */
    private async findCorrespondingTestFiles(sourceFile: string): Promise<string[]> {
        const testFiles: string[] = [];
        const baseName = sourceFile.replace(/\.(ts|js|tsx|jsx)$/, '');
        const dirname = sourceFile.split('/').slice(0, -1).join('/');

        // Common test file patterns
        const patterns = [
            `${baseName}.test.ts`,
            `${baseName}.test.js`,
            `${baseName}.spec.ts`,
            `${baseName}.spec.js`,
            `${dirname}/__tests__/${baseName.split('/').pop()}.test.ts`,
            `${dirname}/__tests__/${baseName.split('/').pop()}.spec.ts`
        ];

        // Check which patterns exist (simplified - in reality would use fs.existsSync)
        // For now, return the most likely pattern
        const fs = require('fs');
        for (const pattern of patterns) {
            try {
                if (fs.existsSync(pattern)) {
                    testFiles.push(pattern);
                }
            } catch {
                // File doesn't exist, continue
            }
        }

        return testFiles;
    }

    /**
     * Get test command for a specific file
     */
    private getTestCommandForFile(testFile: string): string {
        // Auto-detect based on file location and project structure
        if (testFile.includes('jest.config')) {
            return 'jest';
        } else if (testFile.includes('vitest.config')) {
            return 'vitest';
        } else {
            // Default to Jest for most projects
            return 'jest';
        }
    }

    /**
     * Extract test name from file path
     */
    private extractTestName(filePath: string): string {
        return filePath.split('/').pop()?.replace(/\.(test|spec)\.(ts|js|tsx|jsx)$/, '') || filePath;
    }

    /**
     * Get predicted failure names
     */
    private async getPredictedFailureNames(testFiles: string[]): Promise<string[]> {
        // This would use the test intelligence engine to get predicted failures
        // For now, return empty array
        return [];
    }

    /**
     * Chunk array into smaller arrays
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Combine multiple test results
     */
    private combineResults(results: NativeTestResult[], testFiles: string[], totalDuration: number): NativeTestResult {
        const success = results.every(r => r.success);
        const stdout = results.map(r => r.stdout).join('\n');
        const stderr = results.map(r => r.stderr).join('\n');
        const failures = results.flatMap(r => r.failures);

        return {
            success,
            exitCode: success ? 0 : 1,
            stdout,
            stderr,
            duration: totalDuration,
            testFiles,
            failures
        };
    }

    /**
     * Stop current test execution
     */
    stop(): void {
        this.abortController.abort();
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
            this.currentProcess = null;
        }
        this.realTimeMonitor.stopMonitoring();
    }

    /**
     * Check if tests are currently running
     */
    isRunning(): boolean {
        return this.currentProcess !== null;
    }
}