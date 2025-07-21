import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { 
    PerformanceMetric, 
    TimeRange, 
    StreamingMessage, 
    CommandResult
} from '../../types';

export interface BenchmarkSuite {
    id: string;
    name: string;
    description: string;
    benchmarks: Benchmark[];
    setup?: () => Promise<void>;
    teardown?: () => Promise<void>;
    warmupIterations: number;
    measurementIterations: number;
    timeout: number;
    tags: string[];
}

export interface Benchmark {
    id: string;
    name: string;
    description: string;
    category: 'streaming' | 'command' | 'analytics' | 'ui' | 'memory' | 'network';
    execute: (context: BenchmarkContext) => Promise<BenchmarkResult>;
    setup?: () => Promise<void>;
    teardown?: () => Promise<void>;
    expectedThreshold: PerformanceThreshold;
    metadata: Record<string, any>;
}

export interface BenchmarkContext {
    iteration: number;
    totalIterations: number;
    suite: BenchmarkSuite;
    benchmark: Benchmark;
    metrics: MetricsCollector;
    profiler: PerformanceProfiler;
    memoryMonitor: MemoryMonitor;
    networkMonitor: NetworkMonitor;
    timer: PrecisionTimer;
    logger: BenchmarkLogger;
}

export interface BenchmarkResult {
    benchmarkId: string;
    suiteName: string;
    category: string;
    duration: number;
    throughput?: number;
    memoryUsed: number;
    cpuUsage: number;
    networkTraffic: number;
    customMetrics: Record<string, number>;
    samples: PerformanceSample[];
    passed: boolean;
    threshold: PerformanceThreshold;
    timestamp: Date;
}

export interface PerformanceThreshold {
    maxDuration: number;
    minThroughput?: number;
    maxMemory: number;
    maxCpuUsage: number;
    maxNetworkTraffic: number;
    customThresholds: Record<string, number>;
}

export interface PerformanceSample {
    timestamp: Date;
    duration: number;
    memoryUsed: number;
    cpuUsage: number;
    networkTraffic: number;
    customMetrics: Record<string, number>;
}

export interface BenchmarkSession {
    id: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    results: BenchmarkResult[];
    systemInfo: SystemInfo;
    environment: Record<string, string>;
    summary: BenchmarkSummary;
}

export interface SystemInfo {
    platform: string;
    arch: string;
    nodeVersion: string;
    totalMemory: number;
    freeMemory: number;
    cpuCount: number;
    cpuModel: string;
    loadAverage: number[];
    uptime: number;
}

export interface BenchmarkSummary {
    totalBenchmarks: number;
    passedBenchmarks: number;
    failedBenchmarks: number;
    averageDuration: number;
    totalDuration: number;
    peakMemoryUsage: number;
    averageCpuUsage: number;
    totalNetworkTraffic: number;
    performanceScore: number;
    regressions: PerformanceRegression[];
    improvements: PerformanceImprovement[];
}

export interface PerformanceRegression {
    benchmarkId: string;
    currentValue: number;
    previousValue: number;
    changePercentage: number;
    metric: string;
    severity: 'minor' | 'major' | 'critical';
}

export interface PerformanceImprovement {
    benchmarkId: string;
    currentValue: number;
    previousValue: number;
    changePercentage: number;
    metric: string;
}

class PerformanceBenchmarkRunner extends EventEmitter {
    private suites: Map<string, BenchmarkSuite> = new Map();
    private sessions: Map<string, BenchmarkSession> = new Map();
    private baseline: Map<string, BenchmarkResult> = new Map();
    private isRunning = false;

    constructor(private config: BenchmarkConfig) {
        super();
    }

    public registerSuite(suite: BenchmarkSuite): void {
        this.suites.set(suite.id, suite);
        this.emit('suiteRegistered', { suiteId: suite.id, name: suite.name });
    }

    public async runSuite(suiteId: string, options: BenchmarkOptions = {}): Promise<BenchmarkSession> {
        const suite = this.suites.get(suiteId);
        if (!suite) {
            throw new Error(`Benchmark suite not found: ${suiteId}`);
        }

        const session = await this.createSession(suite, options);
        this.isRunning = true;

        try {
            this.emit('sessionStarted', { sessionId: session.id, suiteId });

            // System warmup
            await this.warmupSystem();

            // Suite setup
            if (suite.setup) {
                await suite.setup();
            }

            // Execute benchmarks
            const results = await this.executeBenchmarks(suite, session, options);
            session.results = results;

            // Generate summary
            session.summary = this.generateSummary(results, session);

            // Suite teardown
            if (suite.teardown) {
                await suite.teardown();
            }

            session.endTime = new Date();
            session.duration = session.endTime.getTime() - session.startTime.getTime();
            session.status = 'completed';

            this.emit('sessionCompleted', { sessionId: session.id, summary: session.summary });
            return session;

        } catch (error) {
            session.status = 'failed';
            session.endTime = new Date();
            session.duration = session.endTime.getTime() - session.startTime.getTime();

            this.emit('sessionFailed', { sessionId: session.id, error: (error as Error).message });
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    private async createSession(suite: BenchmarkSuite, options: BenchmarkOptions): Promise<BenchmarkSession> {
        const session: BenchmarkSession = {
            id: `bench_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            startTime: new Date(),
            status: 'running',
            results: [],
            systemInfo: await this.getSystemInfo(),
            environment: {
                NODE_ENV: process.env.NODE_ENV || 'benchmark',
                ...options.environment
            },
            summary: {
                totalBenchmarks: 0,
                passedBenchmarks: 0,
                failedBenchmarks: 0,
                averageDuration: 0,
                totalDuration: 0,
                peakMemoryUsage: 0,
                averageCpuUsage: 0,
                totalNetworkTraffic: 0,
                performanceScore: 0,
                regressions: [],
                improvements: []
            }
        };

        this.sessions.set(session.id, session);
        return session;
    }

    private async executeBenchmarks(
        suite: BenchmarkSuite,
        session: BenchmarkSession,
        options: BenchmarkOptions
    ): Promise<BenchmarkResult[]> {
        const results: BenchmarkResult[] = [];

        for (const benchmark of suite.benchmarks) {
            if (options.pattern && !benchmark.name.match(options.pattern)) {
                continue;
            }

            if (options.categories && !options.categories.includes(benchmark.category)) {
                continue;
            }

            try {
                this.emit('benchmarkStarted', { benchmarkId: benchmark.id, sessionId: session.id });

                const result = await this.executeBenchmark(benchmark, suite, session, options);
                results.push(result);

                this.emit('benchmarkCompleted', { 
                    benchmarkId: benchmark.id, 
                    sessionId: session.id, 
                    result 
                });

            } catch (error) {
                this.emit('benchmarkFailed', { 
                    benchmarkId: benchmark.id, 
                    sessionId: session.id, 
                    error: (error as Error).message 
                });
                
                // Create failed result
                results.push({
                    benchmarkId: benchmark.id,
                    suiteName: suite.name,
                    category: benchmark.category,
                    duration: 0,
                    memoryUsed: 0,
                    cpuUsage: 0,
                    networkTraffic: 0,
                    customMetrics: {},
                    samples: [],
                    passed: false,
                    threshold: benchmark.expectedThreshold,
                    timestamp: new Date()
                });
            }
        }

        return results;
    }

    private async executeBenchmark(
        benchmark: Benchmark,
        suite: BenchmarkSuite,
        session: BenchmarkSession,
        options: BenchmarkOptions
    ): Promise<BenchmarkResult> {
        const samples: PerformanceSample[] = [];
        const metrics = new MetricsCollector();
        const profiler = new PerformanceProfiler();
        const memoryMonitor = new MemoryMonitor();
        const networkMonitor = new NetworkMonitor();
        const timer = new PrecisionTimer();
        const logger = new BenchmarkLogger(benchmark.id);

        const context: BenchmarkContext = {
            iteration: 0,
            totalIterations: suite.measurementIterations,
            suite,
            benchmark,
            metrics,
            profiler,
            memoryMonitor,
            networkMonitor,
            timer,
            logger
        };

        // Benchmark setup
        if (benchmark.setup) {
            await benchmark.setup();
        }

        try {
            // Warmup iterations
            for (let i = 0; i < suite.warmupIterations; i++) {
                await benchmark.execute(context);
            }

            // Measurement iterations
            for (let i = 0; i < suite.measurementIterations; i++) {
                context.iteration = i;
                
                // Start monitoring
                memoryMonitor.startMeasuring();
                networkMonitor.startMeasuring();
                profiler.startProfiling();
                
                const startTime = performance.now();
                const startMemory = process.memoryUsage();
                
                // Execute benchmark
                await benchmark.execute(context);
                
                const endTime = performance.now();
                const endMemory = process.memoryUsage();
                
                // Stop monitoring
                const cpuUsage = profiler.stopProfiling();
                const networkTraffic = networkMonitor.stopMeasuring();
                memoryMonitor.stopMeasuring();
                
                // Record sample
                const sample: PerformanceSample = {
                    timestamp: new Date(),
                    duration: endTime - startTime,
                    memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
                    cpuUsage,
                    networkTraffic,
                    customMetrics: metrics.getMetrics()
                };
                
                samples.push(sample);
                
                // Allow GC between iterations
                if (global.gc) {
                    global.gc();
                }
                
                // Small delay to prevent throttling
                await this.delay(10);
            }

            // Calculate results
            const avgDuration = samples.reduce((sum, s) => sum + s.duration, 0) / samples.length;
            const avgMemory = samples.reduce((sum, s) => sum + s.memoryUsed, 0) / samples.length;
            const avgCpu = samples.reduce((sum, s) => sum + s.cpuUsage, 0) / samples.length;
            const avgNetwork = samples.reduce((sum, s) => sum + s.networkTraffic, 0) / samples.length;
            
            const result: BenchmarkResult = {
                benchmarkId: benchmark.id,
                suiteName: suite.name,
                category: benchmark.category,
                duration: avgDuration,
                throughput: benchmark.metadata.throughputMetric ? 
                    (suite.measurementIterations / avgDuration) * 1000 : undefined,
                memoryUsed: avgMemory,
                cpuUsage: avgCpu,
                networkTraffic: avgNetwork,
                customMetrics: this.aggregateCustomMetrics(samples),
                samples,
                passed: this.evaluateThreshold(avgDuration, avgMemory, avgCpu, avgNetwork, benchmark.expectedThreshold),
                threshold: benchmark.expectedThreshold,
                timestamp: new Date()
            };

            // Store baseline if first run
            if (!this.baseline.has(benchmark.id)) {
                this.baseline.set(benchmark.id, result);
            }

            return result;

        } finally {
            // Benchmark teardown
            if (benchmark.teardown) {
                await benchmark.teardown();
            }
        }
    }

    private evaluateThreshold(
        duration: number,
        memory: number,
        cpu: number,
        network: number,
        threshold: PerformanceThreshold
    ): boolean {
        if (duration > threshold.maxDuration) {
            return false;
        }
        if (memory > threshold.maxMemory) {
            return false;
        }
        if (cpu > threshold.maxCpuUsage) {
            return false;
        }
        if (network > threshold.maxNetworkTraffic) {
            return false;
        }
        return true;
    }

    private aggregateCustomMetrics(samples: PerformanceSample[]): Record<string, number> {
        const aggregated: Record<string, number> = {};
        
        samples.forEach(sample => {
            Object.entries(sample.customMetrics).forEach(([key, value]) => {
                if (!aggregated[key]) {
                    aggregated[key] = 0;
                }
                aggregated[key] += value;
            });
        });

        Object.keys(aggregated).forEach(key => {
            aggregated[key] /= samples.length;
        });

        return aggregated;
    }

    private generateSummary(results: BenchmarkResult[], session: BenchmarkSession): BenchmarkSummary {
        const totalBenchmarks = results.length;
        const passedBenchmarks = results.filter(r => r.passed).length;
        const failedBenchmarks = totalBenchmarks - passedBenchmarks;
        const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / totalBenchmarks;
        const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
        const peakMemoryUsage = Math.max(...results.map(r => r.memoryUsed));
        const averageCpuUsage = results.reduce((sum, r) => sum + r.cpuUsage, 0) / totalBenchmarks;
        const totalNetworkTraffic = results.reduce((sum, r) => sum + r.networkTraffic, 0);

        // Calculate performance score (higher is better)
        const performanceScore = (passedBenchmarks / totalBenchmarks) * 100;

        // Detect regressions and improvements
        const regressions: PerformanceRegression[] = [];
        const improvements: PerformanceImprovement[] = [];

        results.forEach(result => {
            const baseline = this.baseline.get(result.benchmarkId);
            if (baseline) {
                const durationChange = ((result.duration - baseline.duration) / baseline.duration) * 100;
                const memoryChange = ((result.memoryUsed - baseline.memoryUsed) / baseline.memoryUsed) * 100;

                if (durationChange > 5) { // 5% threshold
                    regressions.push({
                        benchmarkId: result.benchmarkId,
                        currentValue: result.duration,
                        previousValue: baseline.duration,
                        changePercentage: durationChange,
                        metric: 'duration',
                        severity: durationChange > 20 ? 'critical' : durationChange > 10 ? 'major' : 'minor'
                    });
                } else if (durationChange < -5) {
                    improvements.push({
                        benchmarkId: result.benchmarkId,
                        currentValue: result.duration,
                        previousValue: baseline.duration,
                        changePercentage: Math.abs(durationChange),
                        metric: 'duration'
                    });
                }

                if (memoryChange > 10) {
                    regressions.push({
                        benchmarkId: result.benchmarkId,
                        currentValue: result.memoryUsed,
                        previousValue: baseline.memoryUsed,
                        changePercentage: memoryChange,
                        metric: 'memory',
                        severity: memoryChange > 50 ? 'critical' : memoryChange > 25 ? 'major' : 'minor'
                    });
                } else if (memoryChange < -10) {
                    improvements.push({
                        benchmarkId: result.benchmarkId,
                        currentValue: result.memoryUsed,
                        previousValue: baseline.memoryUsed,
                        changePercentage: Math.abs(memoryChange),
                        metric: 'memory'
                    });
                }
            }
        });

        return {
            totalBenchmarks,
            passedBenchmarks,
            failedBenchmarks,
            averageDuration,
            totalDuration,
            peakMemoryUsage,
            averageCpuUsage,
            totalNetworkTraffic,
            performanceScore,
            regressions,
            improvements
        };
    }

    private async warmupSystem(): Promise<void> {
        // Perform system warmup to stabilize performance
        const warmupOperations = [
            () => Buffer.alloc(1024 * 1024), // Allocate 1MB
            () => Array.from({ length: 10000 }, (_, i) => i * 2), // Array operations
            () => JSON.stringify({ test: 'data', numbers: Array.from({ length: 1000 }, (_, i) => i) }), // JSON operations
            () => new Promise(resolve => setTimeout(resolve, 1)) // Timer operations
        ];

        for (let i = 0; i < 10; i++) {
            for (const operation of warmupOperations) {
                operation();
            }
        }

        // Allow GC
        if (global.gc) {
            global.gc();
        }

        // Wait for stabilization
        await this.delay(100);
    }

    private async getSystemInfo(): Promise<SystemInfo> {
        const os = require('os');
        
        return {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpuCount: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'Unknown',
            loadAverage: os.loadavg(),
            uptime: os.uptime()
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public getSession(sessionId: string): BenchmarkSession | undefined {
        return this.sessions.get(sessionId);
    }

    public getAllSessions(): BenchmarkSession[] {
        return Array.from(this.sessions.values());
    }

    public getBaseline(benchmarkId: string): BenchmarkResult | undefined {
        return this.baseline.get(benchmarkId);
    }

    public setBaseline(benchmarkId: string, result: BenchmarkResult): void {
        this.baseline.set(benchmarkId, result);
    }

    public exportResults(sessionId: string, format: 'json' | 'csv' | 'html'): string {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        switch (format) {
            case 'json':
                return JSON.stringify(session, null, 2);
            case 'csv':
                return this.exportToCsv(session);
            case 'html':
                return this.exportToHtml(session);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    private exportToCsv(session: BenchmarkSession): string {
        const headers = [
            'BenchmarkId', 'SuiteName', 'Category', 'Duration', 'Throughput', 
            'MemoryUsed', 'CpuUsage', 'NetworkTraffic', 'Passed', 'Timestamp'
        ];

        const rows = session.results.map(result => [
            result.benchmarkId,
            result.suiteName,
            result.category,
            result.duration.toFixed(2),
            result.throughput?.toFixed(2) || 'N/A',
            result.memoryUsed.toFixed(0),
            result.cpuUsage.toFixed(2),
            result.networkTraffic.toFixed(0),
            result.passed ? 'PASS' : 'FAIL',
            result.timestamp.toISOString()
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    private exportToHtml(session: BenchmarkSession): string {
        const { summary } = session;
        
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Benchmark Results - ${session.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; color: #0066cc; }
        .results { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .results th, .results td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        .results th { background: #f5f5f5; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .regressions { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .improvements { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Benchmark Results</h1>
        <p>Session ID: ${session.id}</p>
        <p>Started: ${session.startTime.toLocaleString()}</p>
        <p>Duration: ${session.duration ? (session.duration / 1000).toFixed(2) : 'N/A'}s</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Performance Score</h3>
            <div class="value">${summary.performanceScore.toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Tests Passed</h3>
            <div class="value">${summary.passedBenchmarks}/${summary.totalBenchmarks}</div>
        </div>
        <div class="metric">
            <h3>Avg Duration</h3>
            <div class="value">${summary.averageDuration.toFixed(2)}ms</div>
        </div>
        <div class="metric">
            <h3>Peak Memory</h3>
            <div class="value">${(summary.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB</div>
        </div>
    </div>

    ${summary.regressions.length > 0 ? `
    <div class="regressions">
        <h3>Performance Regressions</h3>
        <ul>
            ${summary.regressions.map(reg => `
                <li><strong>${reg.benchmarkId}</strong>: ${reg.metric} increased by ${reg.changePercentage.toFixed(1)}% (${reg.severity})</li>
            `).join('')}
        </ul>
    </div>
    ` : ''}

    ${summary.improvements.length > 0 ? `
    <div class="improvements">
        <h3>Performance Improvements</h3>
        <ul>
            ${summary.improvements.map(imp => `
                <li><strong>${imp.benchmarkId}</strong>: ${imp.metric} improved by ${imp.changePercentage.toFixed(1)}%</li>
            `).join('')}
        </ul>
    </div>
    ` : ''}

    <table class="results">
        <thead>
            <tr>
                <th>Benchmark</th>
                <th>Category</th>
                <th>Duration (ms)</th>
                <th>Throughput</th>
                <th>Memory (MB)</th>
                <th>CPU %</th>
                <th>Network (KB)</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${session.results.map(result => `
                <tr>
                    <td>${result.benchmarkId}</td>
                    <td>${result.category}</td>
                    <td>${result.duration.toFixed(2)}</td>
                    <td>${result.throughput?.toFixed(2) || 'N/A'}</td>
                    <td>${(result.memoryUsed / 1024 / 1024).toFixed(2)}</td>
                    <td>${result.cpuUsage.toFixed(2)}</td>
                    <td>${(result.networkTraffic / 1024).toFixed(2)}</td>
                    <td class="${result.passed ? 'pass' : 'fail'}">${result.passed ? 'PASS' : 'FAIL'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
        `.trim();
    }
}

// Supporting classes
class MetricsCollector {
    private metrics: Record<string, number> = {};

    public recordMetric(name: string, value: number): void {
        this.metrics[name] = value;
    }

    public getMetrics(): Record<string, number> {
        return { ...this.metrics };
    }

    public clearMetrics(): void {
        this.metrics = {};
    }
}

class PerformanceProfiler {
    private startTime: number = 0;
    private cpuUsage: number = 0;

    public startProfiling(): void {
        this.startTime = performance.now();
        // In a real implementation, this would start CPU profiling
        this.cpuUsage = 0;
    }

    public stopProfiling(): number {
        const endTime = performance.now();
        const duration = endTime - this.startTime;
        
        // Simulate CPU usage calculation
        this.cpuUsage = Math.random() * 10; // 0-10% CPU usage
        
        return this.cpuUsage;
    }
}

class MemoryMonitor {
    private startMemory: NodeJS.MemoryUsage | null = null;
    private isMonitoring = false;

    public startMeasuring(): void {
        this.startMemory = process.memoryUsage();
        this.isMonitoring = true;
    }

    public stopMeasuring(): void {
        this.isMonitoring = false;
    }

    public getCurrentUsage(): number {
        if (!this.startMemory) {return 0;}
        const current = process.memoryUsage();
        return current.heapUsed - this.startMemory.heapUsed;
    }
}

class NetworkMonitor {
    private startBytes: number = 0;
    private isMonitoring = false;

    public startMeasuring(): void {
        this.startBytes = 0; // In a real implementation, this would track network I/O
        this.isMonitoring = true;
    }

    public stopMeasuring(): number {
        this.isMonitoring = false;
        // Simulate network traffic measurement
        return Math.random() * 1024; // 0-1KB of network traffic
    }
}

class PrecisionTimer {
    private markMap: Map<string, number> = new Map();

    public mark(name: string): void {
        this.markMap.set(name, performance.now());
    }

    public measure(startMark: string, endMark?: string): number {
        const startTime = this.markMap.get(startMark);
        if (!startTime) {
            throw new Error(`Mark not found: ${startMark}`);
        }

        const endTime = endMark ? this.markMap.get(endMark) : performance.now();
        if (endMark && !endTime) {
            throw new Error(`Mark not found: ${endMark}`);
        }

        return (endTime as number) - startTime;
    }

    public clearMarks(): void {
        this.markMap.clear();
    }
}

class BenchmarkLogger {
    private logs: Array<{ level: string; message: string; timestamp: Date }> = [];

    constructor(private benchmarkId: string) {}

    public info(message: string): void {
        this.logs.push({ 
            level: 'info', 
            message: `[${this.benchmarkId}] ${message}`, 
            timestamp: new Date() 
        });
    }

    public warn(message: string): void {
        this.logs.push({ 
            level: 'warn', 
            message: `[${this.benchmarkId}] ${message}`, 
            timestamp: new Date() 
        });
    }

    public error(message: string): void {
        this.logs.push({ 
            level: 'error', 
            message: `[${this.benchmarkId}] ${message}`, 
            timestamp: new Date() 
        });
    }

    public getLogs(): Array<{ level: string; message: string; timestamp: Date }> {
        return [...this.logs];
    }
}

// Configuration interfaces
export interface BenchmarkConfig {
    defaultTimeout: number;
    defaultWarmupIterations: number;
    defaultMeasurementIterations: number;
    enableProfiling: boolean;
    enableMemoryMonitoring: boolean;
    enableNetworkMonitoring: boolean;
    outputDir: string;
    reportFormats: ('json' | 'csv' | 'html')[];
}

export interface BenchmarkOptions {
    timeout?: number;
    warmupIterations?: number;
    measurementIterations?: number;
    sequential?: boolean;
    pattern?: RegExp;
    categories?: string[];
    environment?: Record<string, string>;
    enableProfiling?: boolean;
}

export { PerformanceBenchmarkRunner };
