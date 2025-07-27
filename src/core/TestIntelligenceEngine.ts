/**
 * Test Intelligence Engine
 * The ACTUAL brain of AI Debug Context - learns from every test run
 * Phase 2.0.3 - Real intelligence, not just script execution
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface TestMetadata {
    testId: string;
    fileName: string;
    testName: string;
    duration: number;
    memoryUsage?: number;
    cpuUsage?: number;
    timestamp: number;
}

export interface TestExecution {
    id: string;
    testId: string;
    result: 'pass' | 'fail' | 'skip';
    duration: number;
    errorMessage?: string;
    errorStack?: string;
    gitCommit?: string;
    changedFiles?: string[];
    timestamp: number;
}

export interface TestPattern {
    type: 'flaky' | 'slow' | 'memory_leak' | 'always_fails' | 'cascading_failure';
    confidence: number; // 0-1
    evidence: string[];
    suggestion: string;
}

export interface TestInsight {
    testId: string;
    patterns: TestPattern[];
    averageDuration: number;
    failureRate: number;
    lastFailures: TestExecution[];
    correlatedTests: string[]; // Tests that fail together
    recommendedAction?: 'fix' | 'skip' | 'isolate' | 'optimize';
}

export interface TestPrediction {
    testId: string;
    willPass: boolean;
    confidence: number;
    reasoning: string;
    suggestedOrder: number; // Run order optimization
}

/**
 * Machine learning-inspired test intelligence system
 */
export class TestIntelligenceEngine {
    private testHistory: Map<string, TestExecution[]> = new Map();
    private testMetadata: Map<string, TestMetadata> = new Map();
    private correlationMatrix: Map<string, Map<string, number>> = new Map();
    private readonly dataPath: string;
    private readonly maxHistoryPerTest = 100;

    constructor(
        private workspaceRoot: string,
        private outputChannel: vscode.OutputChannel
    ) {
        this.dataPath = path.join(workspaceRoot, '.vscode', 'ai-debug-intelligence');
        this.loadHistoricalData();
    }

    /**
     * Learn from a test execution
     */
    async learnFromExecution(
        testName: string,
        fileName: string,
        result: 'pass' | 'fail' | 'skip',
        duration: number,
        errorDetails?: { message: string; stack: string },
        changedFiles?: string[]
    ): Promise<void> {
        const testId = this.generateTestId(fileName, testName);
        
        // Record execution
        const execution: TestExecution = {
            id: crypto.randomUUID(),
            testId,
            result,
            duration,
            errorMessage: errorDetails?.message,
            errorStack: errorDetails?.stack,
            gitCommit: await this.getCurrentGitCommit(),
            changedFiles,
            timestamp: Date.now()
        };

        // Update history
        const history = this.testHistory.get(testId) || [];
        history.unshift(execution);
        if (history.length > this.maxHistoryPerTest) {
            history.pop();
        }
        this.testHistory.set(testId, history);

        // Update metadata
        const metadata = this.testMetadata.get(testId) || {
            testId,
            fileName,
            testName,
            duration,
            timestamp: Date.now()
        };
        metadata.duration = duration;
        metadata.timestamp = Date.now();
        this.testMetadata.set(testId, metadata);

        // Update correlations
        if (result === 'fail') {
            this.updateFailureCorrelations(testId);
        }

        // Persist learning
        await this.saveHistoricalData();
    }

    /**
     * Get intelligent insights about a test
     */
    getTestInsights(testName: string, fileName: string): TestInsight | null {
        const testId = this.generateTestId(fileName, testName);
        const history = this.testHistory.get(testId);
        
        if (!history || history.length < 3) {
            return null; // Not enough data
        }

        const patterns = this.detectPatterns(history);
        const failureRate = history.filter(h => h.result === 'fail').length / history.length;
        const averageDuration = history.reduce((sum, h) => sum + h.duration, 0) / history.length;
        const lastFailures = history.filter(h => h.result === 'fail').slice(0, 5);
        const correlatedTests = this.getCorrelatedTests(testId);

        let recommendedAction: TestInsight['recommendedAction'];
        if (failureRate > 0.8) {
            recommendedAction = 'fix'; // Always fails
        } else if (patterns.some(p => p.type === 'flaky' && p.confidence > 0.7)) {
            recommendedAction = 'isolate'; // Flaky test
        } else if (patterns.some(p => p.type === 'slow' && p.confidence > 0.8)) {
            recommendedAction = 'optimize'; // Slow test
        } else if (failureRate > 0.5) {
            recommendedAction = 'skip'; // Frequently fails
        }

        return {
            testId,
            patterns,
            averageDuration,
            failureRate,
            lastFailures,
            correlatedTests,
            recommendedAction
        };
    }

    /**
     * Predict test outcomes before running
     */
    predictTestOutcomes(
        testsToRun: Array<{ testName: string; fileName: string }>,
        changedFiles: string[]
    ): TestPrediction[] {
        const predictions: TestPrediction[] = [];

        for (const test of testsToRun) {
            const testId = this.generateTestId(test.fileName, test.testName);
            const history = this.testHistory.get(testId) || [];
            
            if (history.length < 2) {
                // Not enough data, assume it will pass
                predictions.push({
                    testId,
                    willPass: true,
                    confidence: 0.3,
                    reasoning: 'Insufficient historical data',
                    suggestedOrder: 999
                });
                continue;
            }

            // Analyze recent history
            const recentHistory = history.slice(0, 10);
            const recentFailures = recentHistory.filter(h => h.result === 'fail').length;
            const failureRate = recentFailures / recentHistory.length;

            // Check if changed files correlate with past failures
            let fileCorrelation = 0;
            for (const execution of history) {
                if (execution.result === 'fail' && execution.changedFiles) {
                    const overlap = changedFiles.filter(f => 
                        execution.changedFiles!.includes(f)
                    ).length;
                    if (overlap > 0) {
                        fileCorrelation += overlap / execution.changedFiles.length;
                    }
                }
            }

            // Make prediction
            const willPass = failureRate < 0.3 && fileCorrelation < 0.5;
            const confidence = Math.min(0.9, Math.max(0.1, 
                (history.length / 20) * (1 - Math.abs(0.5 - failureRate))
            ));

            let reasoning = '';
            if (failureRate > 0.7) {
                reasoning = `Frequently fails (${(failureRate * 100).toFixed(0)}% failure rate)`;
            } else if (fileCorrelation > 0.7) {
                reasoning = 'Changed files strongly correlate with past failures';
            } else if (failureRate < 0.1) {
                reasoning = `Rarely fails (${(failureRate * 100).toFixed(0)}% failure rate)`;
            } else {
                reasoning = `Mixed results with ${(failureRate * 100).toFixed(0)}% failure rate`;
            }

            // Suggest run order (run likely failures first for faster feedback)
            const suggestedOrder = willPass ? 900 + confidence * 100 : 100 - confidence * 100;

            predictions.push({
                testId,
                willPass,
                confidence,
                reasoning,
                suggestedOrder
            });
        }

        // Sort by suggested order
        return predictions.sort((a, b) => a.suggestedOrder - b.suggestedOrder);
    }

    /**
     * Get test optimization suggestions
     */
    getOptimizationSuggestions(): Array<{
        category: 'performance' | 'reliability' | 'coverage' | 'architecture';
        title: string;
        description: string;
        impact: 'high' | 'medium' | 'low';
        tests: string[];
    }> {
        const suggestions: Array<any> = [];

        // Find slow tests
        const slowTests: Array<[string, number]> = [];
        for (const [testId, metadata] of this.testMetadata) {
            const history = this.testHistory.get(testId) || [];
            if (history.length > 0) {
                const avgDuration = history.reduce((sum, h) => sum + h.duration, 0) / history.length;
                if (avgDuration > 5000) { // > 5 seconds
                    slowTests.push([testId, avgDuration]);
                }
            }
        }

        if (slowTests.length > 0) {
            slowTests.sort((a, b) => b[1] - a[1]);
            suggestions.push({
                category: 'performance',
                title: 'Optimize Slow Tests',
                description: `${slowTests.length} tests take over 5 seconds on average. The slowest takes ${(slowTests[0][1] / 1000).toFixed(1)}s.`,
                impact: 'high',
                tests: slowTests.slice(0, 5).map(([id]) => this.testMetadata.get(id)?.testName || id)
            });
        }

        // Find flaky tests
        const flakyTests: string[] = [];
        for (const [testId, history] of this.testHistory) {
            const patterns = this.detectPatterns(history);
            if (patterns.some(p => p.type === 'flaky' && p.confidence > 0.7)) {
                flakyTests.push(testId);
            }
        }

        if (flakyTests.length > 0) {
            suggestions.push({
                category: 'reliability',
                title: 'Fix Flaky Tests',
                description: `${flakyTests.length} tests show flaky behavior, causing unreliable CI/CD pipelines.`,
                impact: 'high',
                tests: flakyTests.slice(0, 5).map(id => this.testMetadata.get(id)?.testName || id)
            });
        }

        // Find cascading failures
        const cascadingGroups: string[][] = [];
        for (const [testId, correlations] of this.correlationMatrix) {
            const stronglyCorrelated = Array.from(correlations.entries())
                .filter(([_, score]) => score > 0.8)
                .map(([id]) => id);
            
            if (stronglyCorrelated.length > 2) {
                cascadingGroups.push([testId, ...stronglyCorrelated]);
            }
        }

        if (cascadingGroups.length > 0) {
            suggestions.push({
                category: 'architecture',
                title: 'Decouple Test Dependencies',
                description: `${cascadingGroups.length} groups of tests fail together, indicating tight coupling.`,
                impact: 'medium',
                tests: cascadingGroups[0].slice(0, 5).map(id => this.testMetadata.get(id)?.testName || id)
            });
        }

        return suggestions;
    }

    /**
     * Detect patterns in test history
     */
    private detectPatterns(history: TestExecution[]): TestPattern[] {
        const patterns: TestPattern[] = [];

        // Flaky test detection
        let passFailAlternations = 0;
        for (let i = 1; i < history.length; i++) {
            if (history[i].result !== history[i-1].result && 
                history[i].result !== 'skip' && 
                history[i-1].result !== 'skip') {
                passFailAlternations++;
            }
        }

        if (passFailAlternations > history.length * 0.3) {
            patterns.push({
                type: 'flaky',
                confidence: Math.min(0.95, passFailAlternations / (history.length * 0.5)),
                evidence: [`Alternates between pass/fail ${passFailAlternations} times in ${history.length} runs`],
                suggestion: 'This test appears flaky. Check for timing issues, external dependencies, or race conditions.'
            });
        }

        // Slow test detection
        const durations = history.map(h => h.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const p95Duration = durations.sort((a, b) => b - a)[Math.floor(durations.length * 0.05)];

        if (avgDuration > 5000) { // > 5 seconds average
            patterns.push({
                type: 'slow',
                confidence: Math.min(0.9, avgDuration / 10000),
                evidence: [`Average duration: ${(avgDuration / 1000).toFixed(1)}s, P95: ${(p95Duration / 1000).toFixed(1)}s`],
                suggestion: 'This test is slow. Consider mocking external dependencies or splitting into smaller tests.'
            });
        }

        // Memory leak detection (if we had memory data)
        // This would analyze memory usage trends

        // Always fails detection
        const failureRate = history.filter(h => h.result === 'fail').length / history.length;
        if (failureRate > 0.9) {
            patterns.push({
                type: 'always_fails',
                confidence: failureRate,
                evidence: [`Fails ${(failureRate * 100).toFixed(0)}% of the time`],
                suggestion: 'This test consistently fails. It should be fixed or removed.'
            });
        }

        return patterns;
    }

    /**
     * Update failure correlations
     */
    private updateFailureCorrelations(failedTestId: string): void {
        // Find other tests that failed in the same time window
        const failureTime = Date.now();
        const timeWindow = 5 * 60 * 1000; // 5 minutes

        for (const [testId, history] of this.testHistory) {
            if (testId === failedTestId) continue;

            const recentFailure = history.find(h => 
                h.result === 'fail' && 
                Math.abs(h.timestamp - failureTime) < timeWindow
            );

            if (recentFailure) {
                // Update correlation score
                const correlations = this.correlationMatrix.get(failedTestId) || new Map();
                const currentScore = correlations.get(testId) || 0;
                correlations.set(testId, Math.min(1, currentScore + 0.1));
                this.correlationMatrix.set(failedTestId, correlations);
            }
        }
    }

    /**
     * Get tests that correlate with failures
     */
    private getCorrelatedTests(testId: string): string[] {
        const correlations = this.correlationMatrix.get(testId);
        if (!correlations) return [];

        return Array.from(correlations.entries())
            .filter(([_, score]) => score > 0.5)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id]) => this.testMetadata.get(id)?.testName || id);
    }

    /**
     * Generate consistent test ID
     */
    private generateTestId(fileName: string, testName: string): string {
        return crypto.createHash('md5')
            .update(`${fileName}::${testName}`)
            .digest('hex');
    }

    /**
     * Get current git commit
     */
    private async getCurrentGitCommit(): Promise<string | undefined> {
        try {
            const { execSync } = require('child_process');
            return execSync('git rev-parse HEAD', { 
                cwd: this.workspaceRoot,
                encoding: 'utf8' 
            }).trim();
        } catch {
            return undefined;
        }
    }

    /**
     * Load historical data from disk
     */
    private async loadHistoricalData(): Promise<void> {
        try {
            await fs.promises.mkdir(this.dataPath, { recursive: true });

            // Load test history
            const historyPath = path.join(this.dataPath, 'test-history.json');
            if (fs.existsSync(historyPath)) {
                const data = JSON.parse(await fs.promises.readFile(historyPath, 'utf8'));
                this.testHistory = new Map(data.history || []);
                this.testMetadata = new Map(data.metadata || []);
                this.correlationMatrix = new Map(
                    (data.correlations || []).map(([k, v]: [string, any]) => [k, new Map(v)])
                );
            }

            this.outputChannel.appendLine(`📚 Loaded test intelligence data: ${this.testHistory.size} tests tracked`);
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to load test intelligence data: ${error}`);
        }
    }

    /**
     * Save historical data to disk
     */
    private async saveHistoricalData(): Promise<void> {
        try {
            const historyPath = path.join(this.dataPath, 'test-history.json');
            const data = {
                version: '1.0.0',
                timestamp: Date.now(),
                history: Array.from(this.testHistory.entries()),
                metadata: Array.from(this.testMetadata.entries()),
                correlations: Array.from(this.correlationMatrix.entries())
                    .map(([k, v]) => [k, Array.from(v.entries())])
            };

            await fs.promises.writeFile(historyPath, JSON.stringify(data, null, 2));
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to save test intelligence data: ${error}`);
        }
    }

    /**
     * Get dashboard data for visualization
     */
    getDashboardData(): {
        totalTests: number;
        totalExecutions: number;
        averageFailureRate: number;
        slowestTests: Array<{ name: string; duration: number }>;
        flakyTests: Array<{ name: string; flakiness: number }>;
        recentTrends: Array<{ date: string; passed: number; failed: number }>;
    } {
        let totalExecutions = 0;
        let totalFailures = 0;
        const slowestTests: Array<{ name: string; duration: number }> = [];
        const flakyTests: Array<{ name: string; flakiness: number }> = [];

        for (const [testId, history] of this.testHistory) {
            if (history.length === 0) continue;

            totalExecutions += history.length;
            totalFailures += history.filter(h => h.result === 'fail').length;

            const metadata = this.testMetadata.get(testId);
            if (metadata) {
                const avgDuration = history.reduce((sum, h) => sum + h.duration, 0) / history.length;
                slowestTests.push({ name: metadata.testName, duration: avgDuration });

                const patterns = this.detectPatterns(history);
                const flakyPattern = patterns.find(p => p.type === 'flaky');
                if (flakyPattern) {
                    flakyTests.push({ name: metadata.testName, flakiness: flakyPattern.confidence });
                }
            }
        }

        // Sort and limit
        slowestTests.sort((a, b) => b.duration - a.duration);
        flakyTests.sort((a, b) => b.flakiness - a.flakiness);

        // Calculate recent trends (last 7 days)
        const recentTrends: Array<{ date: string; passed: number; failed: number }> = [];
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        for (let i = 6; i >= 0; i--) {
            const dayStart = now - (i + 1) * dayMs;
            const dayEnd = now - i * dayMs;
            let passed = 0;
            let failed = 0;

            for (const [_, history] of this.testHistory) {
                for (const execution of history) {
                    if (execution.timestamp >= dayStart && execution.timestamp < dayEnd) {
                        if (execution.result === 'pass') passed++;
                        else if (execution.result === 'fail') failed++;
                    }
                }
            }

            const date = new Date(dayEnd).toLocaleDateString();
            recentTrends.push({ date, passed, failed });
        }

        return {
            totalTests: this.testHistory.size,
            totalExecutions,
            averageFailureRate: totalExecutions > 0 ? totalFailures / totalExecutions : 0,
            slowestTests: slowestTests.slice(0, 10),
            flakyTests: flakyTests.slice(0, 10),
            recentTrends
        };
    }

    /**
     * Clear all historical data
     */
    async clearHistory(): Promise<void> {
        this.testHistory.clear();
        this.testMetadata.clear();
        this.correlationMatrix.clear();
        
        try {
            const historyPath = path.join(this.dataPath, 'test-history.json');
            if (fs.existsSync(historyPath)) {
                await fs.promises.unlink(historyPath);
            }
            this.outputChannel.appendLine('🧹 Test intelligence data cleared');
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to clear test intelligence data: ${error}`);
        }
    }

    /**
     * Export insights for external analysis
     */
    async exportInsights(): Promise<string> {
        const insights = {
            exportDate: new Date().toISOString(),
            totalTests: this.testHistory.size,
            insights: [] as any[]
        };

        for (const [testId, metadata] of this.testMetadata) {
            const testInsight = this.getTestInsights(metadata.testName, metadata.fileName);
            if (testInsight) {
                insights.insights.push({
                    testName: metadata.testName,
                    fileName: metadata.fileName,
                    ...testInsight
                });
            }
        }

        const exportPath = path.join(this.dataPath, `test-insights-${Date.now()}.json`);
        await fs.promises.writeFile(exportPath, JSON.stringify(insights, null, 2));
        
        return exportPath;
    }
}