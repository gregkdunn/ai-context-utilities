/**
 * Performance Monitor
 * Tracks extension performance metrics and provides insights
 * Part of Phase 1.9.1 performance optimizations
 */

import * as vscode from 'vscode';

interface PerformanceMetric {
    operation: string;
    duration: number;
    timestamp: number;
    success: boolean;
    metadata?: Record<string, any>;
}

interface MemoryUsage {
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
}

export interface PerformanceReport {
    summary: {
        totalOperations: number;
        averageDuration: number;
        successRate: number;
        slowestOperation: string;
        fastestOperation: string;
    };
    metrics: PerformanceMetric[];
    memoryUsage: MemoryUsage[];
    recommendations: string[];
}

/**
 * Performance monitoring and reporting service
 */
export class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private memorySnapshots: MemoryUsage[] = [];
    private readonly MAX_METRICS = 1000;
    private readonly MAX_MEMORY_SNAPSHOTS = 100;
    private memoryMonitorInterval?: NodeJS.Timeout;

    constructor(private outputChannel: vscode.OutputChannel) {
        this.startMemoryMonitoring();
    }

    /**
     * Track command execution time
     */
    async trackCommand<T>(
        operation: string,
        command: () => Promise<T>,
        metadata?: Record<string, any>
    ): Promise<T> {
        const startTime = Date.now();
        let success = false;
        let result: T;

        try {
            result = await command();
            success = true;
            return result;
        } catch (error) {
            throw error;
        } finally {
            const duration = Date.now() - startTime;
            this.recordMetric(operation, duration, success, metadata);
        }
    }

    /**
     * Track synchronous operation
     */
    track<T>(
        operation: string,
        fn: () => T,
        metadata?: Record<string, any>
    ): T {
        const startTime = Date.now();
        let success = false;
        let result: T;

        try {
            result = fn();
            success = true;
            return result;
        } catch (error) {
            throw error;
        } finally {
            const duration = Date.now() - startTime;
            this.recordMetric(operation, duration, success, metadata);
        }
    }

    /**
     * Record a performance metric
     */
    recordMetric(
        operation: string,
        duration: number,
        success: boolean = true,
        metadata?: Record<string, any>
    ): void {
        const metric: PerformanceMetric = {
            operation,
            duration,
            timestamp: Date.now(),
            success,
            metadata
        };

        this.metrics.push(metric);

        // Trim metrics if too many
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics = this.metrics.slice(-this.MAX_METRICS);
        }

        // Log slow operations
        if (duration > 2000) { // 2 seconds
            this.outputChannel.appendLine(
                `⚠️ Slow operation detected: ${operation} took ${duration}ms`
            );
        }
    }

    /**
     * Get performance statistics for an operation
     */
    getOperationStats(operation: string): {
        count: number;
        averageDuration: number;
        minDuration: number;
        maxDuration: number;
        successRate: number;
    } {
        const operationMetrics = this.metrics.filter(m => m.operation === operation);
        
        if (operationMetrics.length === 0) {
            return {
                count: 0,
                averageDuration: 0,
                minDuration: 0,
                maxDuration: 0,
                successRate: 0
            };
        }

        const durations = operationMetrics.map(m => m.duration);
        const successCount = operationMetrics.filter(m => m.success).length;

        return {
            count: operationMetrics.length,
            averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
            minDuration: Math.min(...durations),
            maxDuration: Math.max(...durations),
            successRate: successCount / operationMetrics.length
        };
    }

    /**
     * Generate comprehensive performance report
     */
    generateReport(): PerformanceReport {
        const allOperations = [...new Set(this.metrics.map(m => m.operation))];
        const operationStats = allOperations.map(op => ({
            operation: op,
            ...this.getOperationStats(op)
        }));

        const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
        const averageDuration = this.metrics.length > 0 ? totalDuration / this.metrics.length : 0;
        const successCount = this.metrics.filter(m => m.success).length;
        const successRate = this.metrics.length > 0 ? successCount / this.metrics.length : 0;

        const slowestOp = operationStats.reduce((slowest, current) => 
            current.averageDuration > slowest.averageDuration ? current : slowest,
            operationStats[0] || { operation: 'none', averageDuration: 0 }
        );

        const fastestOp = operationStats.reduce((fastest, current) => 
            current.averageDuration < fastest.averageDuration ? current : fastest,
            operationStats[0] || { operation: 'none', averageDuration: 0 }
        );

        return {
            summary: {
                totalOperations: this.metrics.length,
                averageDuration,
                successRate,
                slowestOperation: slowestOp.operation,
                fastestOperation: fastestOp.operation
            },
            metrics: this.metrics.slice(-50), // Last 50 metrics
            memoryUsage: this.memorySnapshots.slice(-20), // Last 20 snapshots
            recommendations: this.generateRecommendations(operationStats)
        };
    }

    /**
     * Start memory monitoring
     */
    private startMemoryMonitoring(): void {
        this.takeMemorySnapshot(); // Initial snapshot
        
        this.memoryMonitorInterval = setInterval(() => {
            this.takeMemorySnapshot();
        }, 30000); // Every 30 seconds
    }

    /**
     * Take memory snapshot
     */
    private takeMemorySnapshot(): void {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            
            const snapshot: MemoryUsage = {
                timestamp: Date.now(),
                heapUsed: usage.heapUsed,
                heapTotal: usage.heapTotal,
                external: usage.external,
                arrayBuffers: usage.arrayBuffers
            };

            this.memorySnapshots.push(snapshot);

            // Trim snapshots
            if (this.memorySnapshots.length > this.MAX_MEMORY_SNAPSHOTS) {
                this.memorySnapshots = this.memorySnapshots.slice(-this.MAX_MEMORY_SNAPSHOTS);
            }

            // Check for memory leaks
            if (usage.heapUsed > 100 * 1024 * 1024) { // 100MB
                this.outputChannel.appendLine(
                    `⚠️ High memory usage detected: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`
                );
            }
        }
    }

    /**
     * Generate performance recommendations
     */
    private generateRecommendations(operationStats: any[]): string[] {
        const recommendations: string[] = [];

        // Check for slow operations
        const slowOperations = operationStats.filter(op => op.averageDuration > 1000);
        if (slowOperations.length > 0) {
            recommendations.push(
                `Consider optimizing these slow operations: ${slowOperations.map(op => op.operation).join(', ')}`
            );
        }

        // Check for high failure rates
        const failingOperations = operationStats.filter(op => op.successRate < 0.8);
        if (failingOperations.length > 0) {
            recommendations.push(
                `Improve error handling for: ${failingOperations.map(op => op.operation).join(', ')}`
            );
        }

        // Check memory usage trend
        if (this.memorySnapshots.length > 5) {
            const recent = this.memorySnapshots.slice(-5);
            const trend = recent[recent.length - 1].heapUsed - recent[0].heapUsed;
            
            if (trend > 10 * 1024 * 1024) { // 10MB increase
                recommendations.push('Memory usage is increasing - check for potential leaks');
            }
        }

        // Check for frequent operations
        const frequentOperations = operationStats.filter(op => op.count > 50);
        if (frequentOperations.length > 0) {
            recommendations.push(
                `Consider caching for frequent operations: ${frequentOperations.map(op => op.operation).join(', ')}`
            );
        }

        return recommendations;
    }

    /**
     * Display performance report
     */
    displayReport(): void {
        const report = this.generateReport();
        
        this.outputChannel.appendLine('\n' + '='.repeat(60));
        this.outputChannel.appendLine('📊 PERFORMANCE REPORT');
        this.outputChannel.appendLine('='.repeat(60));
        
        this.outputChannel.appendLine(`Total Operations: ${report.summary.totalOperations}`);
        this.outputChannel.appendLine(`Average Duration: ${Math.round(report.summary.averageDuration)}ms`);
        this.outputChannel.appendLine(`Success Rate: ${Math.round(report.summary.successRate * 100)}%`);
        this.outputChannel.appendLine(`Slowest Operation: ${report.summary.slowestOperation}`);
        this.outputChannel.appendLine(`Fastest Operation: ${report.summary.fastestOperation}`);
        
        if (report.memoryUsage.length > 0) {
            const latestMemory = report.memoryUsage[report.memoryUsage.length - 1];
            this.outputChannel.appendLine(
                `Current Memory: ${Math.round(latestMemory.heapUsed / 1024 / 1024)}MB`
            );
        }

        if (report.recommendations.length > 0) {
            this.outputChannel.appendLine('\n📋 Recommendations:');
            report.recommendations.forEach(rec => {
                this.outputChannel.appendLine(`   • ${rec}`);
            });
        }
        
        this.outputChannel.appendLine('='.repeat(60));
    }

    /**
     * Clear metrics (useful for testing)
     */
    clearMetrics(): void {
        this.metrics = [];
        this.memorySnapshots = [];
        this.outputChannel.appendLine('🗑️ Performance metrics cleared');
    }

    /**
     * Dispose performance monitor
     */
    dispose(): void {
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
        }
    }
}