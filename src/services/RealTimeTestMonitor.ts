/**
 * Real-Time Test Monitor
 * Actually tracks what's happening during test execution
 * Phase 2.0.3 - Real monitoring, not just output parsing
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { TestIntelligenceEngine } from '../core/TestIntelligenceEngine';

export interface TestEvent {
    type: 'start' | 'pass' | 'fail' | 'skip' | 'complete';
    testName: string;
    fileName: string;
    duration?: number;
    error?: {
        message: string;
        stack: string;
        type: string;
    };
    memory?: {
        before: number;
        after: number;
        peak: number;
    };
    timestamp: number;
}

export interface TestMetrics {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    startTime: number;
    endTime?: number;
    currentTest?: string;
    testsPerSecond?: number;
    estimatedTimeRemaining?: number;
}

export interface TestWatcher {
    onTestStart: (test: TestEvent) => void;
    onTestComplete: (test: TestEvent) => void;
    onSuiteComplete: (metrics: TestMetrics) => void;
}

/**
 * Real-time test execution monitoring
 */
export class RealTimeTestMonitor extends EventEmitter {
    private currentMetrics: TestMetrics = {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        startTime: Date.now()
    };

    private testStartTimes = new Map<string, number>();
    private outputBuffer = '';
    private parseTimeout?: NodeJS.Timeout;
    private watchers: TestWatcher[] = [];

    constructor(
        private testIntelligence: TestIntelligenceEngine,
        private outputChannel: vscode.OutputChannel
    ) {
        super();
    }

    /**
     * Register a test watcher
     */
    addWatcher(watcher: TestWatcher): void {
        this.watchers.push(watcher);
    }

    /**
     * Start monitoring test execution
     */
    startMonitoring(): void {
        this.currentMetrics = {
            totalTests: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            startTime: Date.now()
        };
        this.testStartTimes.clear();
        this.outputBuffer = '';

        this.emit('monitoring:started');
    }

    /**
     * Process test output in real-time
     */
    processOutput(output: string): void {
        this.outputBuffer += output;

        // Debounce parsing for efficiency
        if (this.parseTimeout) {
            clearTimeout(this.parseTimeout);
        }

        this.parseTimeout = setTimeout(() => {
            this.parseTestOutput();
            this.outputBuffer = '';
        }, 100);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        if (this.parseTimeout) {
            clearTimeout(this.parseTimeout);
            this.parseTestOutput();
        }

        this.currentMetrics.endTime = Date.now();
        this.currentMetrics.duration = this.currentMetrics.endTime - this.currentMetrics.startTime;

        // Notify watchers
        for (const watcher of this.watchers) {
            watcher.onSuiteComplete(this.currentMetrics);
        }

        this.emit('monitoring:stopped', this.currentMetrics);
    }

    /**
     * Parse test output for real-time updates
     */
    private parseTestOutput(): void {
        const lines = this.outputBuffer.split('\n');

        for (const line of lines) {
            const cleanLine = this.stripAnsi(line);

            // Detect test start
            const testStartMatch = cleanLine.match(/(?:RUNS?|Running|Executing)\s+(.+\.(?:spec|test)\.(?:ts|js))\s*(?:::\s*(.+))?/);
            if (testStartMatch) {
                const fileName = testStartMatch[1];
                const testName = testStartMatch[2] || fileName;
                this.handleTestStart(testName, fileName);
                continue;
            }

            // Detect test completion
            const passMatch = cleanLine.match(/(?:✓|PASS|✅)\s+(.+?)\s*(?:\((\d+)(?:\s*m?s)?\))?/);
            if (passMatch) {
                const testName = passMatch[1].trim();
                const duration = this.parseDuration(passMatch[2]);
                this.handleTestComplete(testName, 'pass', duration);
                continue;
            }

            const failMatch = cleanLine.match(/(?:✗|FAIL|❌|✖)\s+(.+?)(?:\s*\((\d+)(?:\s*m?s)?\))?/);
            if (failMatch) {
                const testName = failMatch[1].trim();
                const duration = this.parseDuration(failMatch[2]);
                this.handleTestComplete(testName, 'fail', duration);
                continue;
            }

            // Detect skipped tests
            const skipMatch = cleanLine.match(/(?:○|SKIP|⊘)\s+(.+)/);
            if (skipMatch) {
                const testName = skipMatch[1].trim();
                this.handleTestComplete(testName, 'skip');
                continue;
            }

            // Detect test suite summary
            const summaryMatch = cleanLine.match(/Tests?:\s*(\d+)\s*(?:passed|total)(?:,\s*(\d+)\s*failed)?(?:,\s*(\d+)\s*skipped)?/i);
            if (summaryMatch) {
                const passed = parseInt(summaryMatch[1]) || 0;
                const failed = parseInt(summaryMatch[2]) || 0;
                const skipped = parseInt(summaryMatch[3]) || 0;
                this.updateMetrics({ passed, failed, skipped, totalTests: passed + failed + skipped });
            }

            // Detect Jest/Vitest style progress
            const progressMatch = cleanLine.match(/(\d+)\/(\d+)\s+(?:tests?|specs?)/);
            if (progressMatch) {
                const completed = parseInt(progressMatch[1]);
                const total = parseInt(progressMatch[2]);
                this.updateProgress(completed, total);
            }
        }
    }

    /**
     * Handle test start event
     */
    private handleTestStart(testName: string, fileName: string): void {
        const testId = `${fileName}::${testName}`;
        this.testStartTimes.set(testId, Date.now());

        const event: TestEvent = {
            type: 'start',
            testName,
            fileName,
            timestamp: Date.now()
        };

        this.currentMetrics.currentTest = testName;

        // Notify watchers
        for (const watcher of this.watchers) {
            watcher.onTestStart(event);
        }

        this.emit('test:start', event);

        // Update status
        this.updateStatus(`Running: ${testName}`);
    }

    /**
     * Handle test completion event
     */
    private handleTestComplete(
        testName: string, 
        result: 'pass' | 'fail' | 'skip',
        duration?: number
    ): void {
        // Try to find the start time
        let testId: string | undefined;
        let fileName = 'unknown';
        
        for (const [id, startTime] of this.testStartTimes) {
            if (id.includes(testName)) {
                testId = id;
                fileName = id.split('::')[0];
                if (!duration) {
                    duration = Date.now() - startTime;
                }
                break;
            }
        }

        const event: TestEvent = {
            type: result,
            testName,
            fileName,
            duration,
            timestamp: Date.now()
        };

        // Update metrics
        switch (result) {
            case 'pass':
                this.currentMetrics.passed++;
                break;
            case 'fail':
                this.currentMetrics.failed++;
                break;
            case 'skip':
                this.currentMetrics.skipped++;
                break;
        }

        // Learn from this execution
        if (duration) {
            this.testIntelligence.learnFromExecution(
                testName,
                fileName,
                result,
                duration
            );
        }

        // Notify watchers
        for (const watcher of this.watchers) {
            watcher.onTestComplete(event);
        }

        this.emit('test:complete', event);

        // Update status
        const icon = result === 'pass' ? '✅' : result === 'fail' ? '❌' : '⊘';
        this.updateStatus(`${icon} ${testName} (${this.formatDuration(duration)})`);

        // Clean up
        if (testId) {
            this.testStartTimes.delete(testId);
        }
    }

    /**
     * Update progress metrics
     */
    private updateProgress(completed: number, total: number): void {
        this.currentMetrics.totalTests = total;
        
        // Calculate tests per second
        const elapsed = Date.now() - this.currentMetrics.startTime;
        if (elapsed > 0 && completed > 0) {
            this.currentMetrics.testsPerSecond = (completed / elapsed) * 1000;
            
            // Estimate time remaining
            const remaining = total - completed;
            if (this.currentMetrics.testsPerSecond > 0) {
                this.currentMetrics.estimatedTimeRemaining = remaining / this.currentMetrics.testsPerSecond * 1000;
            }
        }

        this.emit('progress:update', {
            completed,
            total,
            percentage: (completed / total) * 100,
            estimatedTimeRemaining: this.currentMetrics.estimatedTimeRemaining
        });
    }

    /**
     * Update metrics
     */
    private updateMetrics(updates: Partial<TestMetrics>): void {
        Object.assign(this.currentMetrics, updates);
        this.emit('metrics:update', this.currentMetrics);
    }

    /**
     * Update status in output channel
     */
    private updateStatus(message: string): void {
        this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
    }

    /**
     * Parse duration string to milliseconds
     */
    private parseDuration(durationStr?: string): number | undefined {
        if (!durationStr) return undefined;
        
        const value = parseInt(durationStr);
        if (durationStr.includes('s') && !durationStr.includes('ms')) {
            return value * 1000; // Convert seconds to ms
        }
        return value;
    }

    /**
     * Format duration for display
     */
    private formatDuration(duration?: number): string {
        if (!duration) return '';
        
        if (duration < 1000) {
            return `${duration}ms`;
        } else if (duration < 60000) {
            return `${(duration / 1000).toFixed(1)}s`;
        } else {
            const minutes = Math.floor(duration / 60000);
            const seconds = ((duration % 60000) / 1000).toFixed(0);
            return `${minutes}m ${seconds}s`;
        }
    }

    /**
     * Strip ANSI escape sequences
     */
    private stripAnsi(text: string): string {
        return text.replace(/\u001b\[[0-9;]*m/g, '');
    }

    /**
     * Get current metrics
     */
    getMetrics(): TestMetrics {
        return { ...this.currentMetrics };
    }

    /**
     * Get test predictions for upcoming tests
     */
    async getTestPredictions(testsToRun: Array<{ testName: string; fileName: string }>): Promise<{
        likelyFailures: Array<{ testName: string; confidence: number; reason: string }>;
        estimatedDuration: number;
        optimizedOrder: Array<{ testName: string; fileName: string }>;
    }> {
        const predictions = this.testIntelligence.predictTestOutcomes(testsToRun, []);
        
        const likelyFailures = predictions
            .filter(p => !p.willPass && p.confidence > 0.6)
            .map(p => {
                const metadata = testsToRun.find(t => 
                    `${t.fileName}::${t.testName}` === p.testId
                );
                return {
                    testName: metadata?.testName || p.testId,
                    confidence: p.confidence,
                    reason: p.reasoning
                };
            });

        // Estimate total duration based on historical data
        let estimatedDuration = 0;
        for (const test of testsToRun) {
            const insights = this.testIntelligence.getTestInsights(test.testName, test.fileName);
            estimatedDuration += insights?.averageDuration || 1000; // Default 1s if no data
        }

        // Get optimized test order
        const optimizedOrder = predictions
            .sort((a, b) => a.suggestedOrder - b.suggestedOrder)
            .map(p => {
                const metadata = testsToRun.find(t => 
                    `${t.fileName}::${t.testName}` === p.testId
                );
                return metadata || { testName: p.testId, fileName: 'unknown' };
            })
            .filter(t => t.fileName !== 'unknown');

        return {
            likelyFailures,
            estimatedDuration,
            optimizedOrder
        };
    }

    /**
     * Generate real-time dashboard HTML
     */
    generateDashboardHtml(): string {
        const metrics = this.getMetrics();
        const progress = metrics.totalTests > 0 
            ? ((metrics.passed + metrics.failed + metrics.skipped) / metrics.totalTests) * 100
            : 0;

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Execution Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1e1e1e;
            color: #cccccc;
        }
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: #2d2d2d;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border: 1px solid #3e3e3e;
        }
        .metric-value {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }
        .metric-label {
            font-size: 14px;
            color: #999;
            text-transform: uppercase;
        }
        .pass { color: #4ec9b0; }
        .fail { color: #f48771; }
        .skip { color: #dcdcaa; }
        .progress-bar {
            width: 100%;
            height: 30px;
            background: #2d2d2d;
            border-radius: 15px;
            overflow: hidden;
            margin: 30px 0;
            border: 1px solid #3e3e3e;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4ec9b0, #3ba395);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .current-test {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #4ec9b0;
        }
        .eta {
            text-align: center;
            font-size: 18px;
            color: #999;
            margin: 20px 0;
        }
    </style>
    <script>
        // Auto-refresh every second
        setTimeout(() => location.reload(), 1000);
    </script>
</head>
<body>
    <div class="dashboard">
        <h1>Test Execution Dashboard</h1>
        
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%">
                ${progress.toFixed(1)}%
            </div>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Total Tests</div>
                <div class="metric-value">${metrics.totalTests || '?'}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Passed</div>
                <div class="metric-value pass">${metrics.passed}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Failed</div>
                <div class="metric-value fail">${metrics.failed}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Skipped</div>
                <div class="metric-value skip">${metrics.skipped}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Tests/Second</div>
                <div class="metric-value">${metrics.testsPerSecond?.toFixed(1) || '?'}</div>
            </div>
        </div>

        ${metrics.currentTest ? `
        <div class="current-test">
            <strong>Currently Running:</strong> ${metrics.currentTest}
        </div>
        ` : ''}

        ${metrics.estimatedTimeRemaining ? `
        <div class="eta">
            Estimated time remaining: ${this.formatDuration(metrics.estimatedTimeRemaining)}
        </div>
        ` : ''}
    </div>
</body>
</html>
        `;
    }
}