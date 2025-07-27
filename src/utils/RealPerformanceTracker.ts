/**
 * Real Performance Tracking System
 * Replaces the fake performance tracking with actual metrics
 * Phase 2.0.2 - Real performance insights
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface PerformanceMetric {
    operation: string;
    startTime: number;
    endTime: number;
    duration: number;
    success: boolean;
    metadata?: Record<string, any>;
    memoryUsage?: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
}

export interface PerformanceStats {
    totalOperations: number;
    totalDuration: number;
    averageDuration: number;
    successRate: number;
    operationBreakdown: Record<string, {
        count: number;
        totalDuration: number;
        averageDuration: number;
        successRate: number;
        fastest: number;
        slowest: number;
    }>;
    memoryTrends: {
        peak: number;
        average: number;
        current: number;
    };
    recentOperations: PerformanceMetric[];
}

export interface PerformanceAlert {
    type: 'slow_operation' | 'memory_spike' | 'high_failure_rate' | 'performance_degradation';
    message: string;
    severity: 'low' | 'medium' | 'high';
    metric: PerformanceMetric;
    suggestion?: string;
}

/**
 * Real performance tracking with actionable insights
 */
export class RealPerformanceTracker {
    private metrics: PerformanceMetric[] = [];
    private activeOperations = new Map<string, { startTime: number; cpuUsage: NodeJS.CpuUsage }>();
    private maxMetrics = 1000; // Keep last 1000 operations
    private alertThresholds = {
        slowOperation: 5000, // 5 seconds
        memorySpike: 100 * 1024 * 1024, // 100MB
        failureRate: 0.3, // 30%
        degradationRatio: 2.0 // 2x slower than average
    };

    constructor(
        private outputChannel: vscode.OutputChannel,
        private workspaceRoot: string
    ) {
        this.loadMetrics();
        
        // Save metrics periodically
        setInterval(() => this.saveMetrics(), 30000); // Every 30 seconds
    }

    /**
     * Track an operation with comprehensive metrics
     */
    async trackCommand<T>(operation: string, command: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
        const operationId = `${operation}-${Date.now()}`;
        const startTime = Date.now();
        const startCpuUsage = process.cpuUsage();
        const startMemory = process.memoryUsage();

        this.activeOperations.set(operationId, { startTime, cpuUsage: startCpuUsage });

        let success = false;
        let result: T;
        let endMemory: NodeJS.MemoryUsage;

        try {
            result = await command();
            success = true;
            return result;
        } catch (error) {
            this.outputChannel.appendLine(`❌ Operation failed: ${operation} - ${error}`);
            throw error;
        } finally {
            const endTime = Date.now();
            const duration = endTime - startTime;
            endMemory = process.memoryUsage();
            const cpuUsage = process.cpuUsage(startCpuUsage);

            this.activeOperations.delete(operationId);

            const metric: PerformanceMetric = {
                operation,
                startTime,
                endTime,
                duration,
                success,
                metadata,
                memoryUsage: endMemory,
                cpuUsage
            };

            this.recordMetric(metric);
            
            // Check for performance alerts
            const alerts = this.checkForAlerts(metric);
            for (const alert of alerts) {
                this.handleAlert(alert);
            }

            // Log performance info
            this.logOperationResult(metric);
        }
    }

    /**
     * Record a performance metric
     */
    private recordMetric(metric: PerformanceMetric): void {
        this.metrics.push(metric);

        // Keep only the most recent metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }
    }

    /**
     * Get comprehensive performance statistics
     */
    getPerformanceStats(): PerformanceStats {
        if (this.metrics.length === 0) {
            return this.getEmptyStats();
        }

        const totalOperations = this.metrics.length;
        const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
        const successfulOperations = this.metrics.filter(m => m.success).length;
        const averageDuration = totalDuration / totalOperations;
        const successRate = successfulOperations / totalOperations;

        // Operation breakdown
        const operationBreakdown: Record<string, any> = {};
        for (const metric of this.metrics) {
            if (!operationBreakdown[metric.operation]) {
                operationBreakdown[metric.operation] = {
                    count: 0,
                    totalDuration: 0,
                    durations: [],
                    successes: 0
                };
            }

            const breakdown = operationBreakdown[metric.operation];
            breakdown.count++;
            breakdown.totalDuration += metric.duration;
            breakdown.durations.push(metric.duration);
            if (metric.success) breakdown.successes++;
        }

        // Calculate averages, min/max for each operation
        for (const [op, data] of Object.entries(operationBreakdown)) {
            const breakdown = data as any;
            breakdown.averageDuration = breakdown.totalDuration / breakdown.count;
            breakdown.successRate = breakdown.successes / breakdown.count;
            breakdown.fastest = Math.min(...breakdown.durations);
            breakdown.slowest = Math.max(...breakdown.durations);
            delete breakdown.durations;
            delete breakdown.successes;
        }

        // Memory trends
        const memoryMetrics = this.metrics.filter(m => m.memoryUsage).map(m => m.memoryUsage!.heapUsed);
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryTrends = {
            peak: memoryMetrics.length > 0 ? Math.max(...memoryMetrics) : currentMemory,
            average: memoryMetrics.length > 0 ? memoryMetrics.reduce((sum, m) => sum + m, 0) / memoryMetrics.length : currentMemory,
            current: currentMemory
        };

        return {
            totalOperations,
            totalDuration,
            averageDuration,
            successRate,
            operationBreakdown,
            memoryTrends,
            recentOperations: this.metrics.slice(-10) // Last 10 operations
        };
    }

    /**
     * Check for performance alerts
     */
    private checkForAlerts(metric: PerformanceMetric): PerformanceAlert[] {
        const alerts: PerformanceAlert[] = [];

        // Slow operation alert
        if (metric.duration > this.alertThresholds.slowOperation) {
            alerts.push({
                type: 'slow_operation',
                message: `Operation '${metric.operation}' took ${(metric.duration / 1000).toFixed(1)}s`,
                severity: metric.duration > this.alertThresholds.slowOperation * 2 ? 'high' : 'medium',
                metric,
                suggestion: 'Consider optimizing this operation or adding progress indicators'
            });
        }

        // Memory spike alert
        if (metric.memoryUsage && metric.memoryUsage.heapUsed > this.alertThresholds.memorySpike) {
            alerts.push({
                type: 'memory_spike',
                message: `High memory usage: ${(metric.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`,
                severity: 'medium',
                metric,
                suggestion: 'Check for memory leaks or large data structures'
            });
        }

        // Performance degradation alert
        const recentSameOperations = this.metrics
            .filter(m => m.operation === metric.operation)
            .slice(-10);
        
        if (recentSameOperations.length >= 5) {
            const avgDuration = recentSameOperations
                .slice(0, -1)
                .reduce((sum, m) => sum + m.duration, 0) / (recentSameOperations.length - 1);
            
            if (metric.duration > avgDuration * this.alertThresholds.degradationRatio) {
                alerts.push({
                    type: 'performance_degradation',
                    message: `Operation '${metric.operation}' is ${(metric.duration / avgDuration).toFixed(1)}x slower than average`,
                    severity: 'medium',
                    metric,
                    suggestion: 'Performance may be degrading - investigate recent changes'
                });
            }
        }

        return alerts;
    }

    /**
     * Handle performance alerts
     */
    private handleAlert(alert: PerformanceAlert): void {
        const icon = alert.severity === 'high' ? '🚨' : 
                    alert.severity === 'medium' ? '⚠️' : 'ℹ️';
        
        this.outputChannel.appendLine(`${icon} Performance Alert: ${alert.message}`);
        
        if (alert.suggestion) {
            this.outputChannel.appendLine(`   💡 Suggestion: ${alert.suggestion}`);
        }

        // Show user notification for high severity alerts
        if (alert.severity === 'high') {
            vscode.window.showWarningMessage(
                `Performance Issue: ${alert.message}`,
                'View Details'
            ).then(selection => {
                if (selection === 'View Details') {
                    this.showPerformanceReport();
                }
            });
        }
    }

    /**
     * Log operation result with appropriate detail level
     */
    private logOperationResult(metric: PerformanceMetric): void {
        const duration = metric.duration;
        const icon = metric.success ? '✅' : '❌';
        const timing = duration > 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;
        
        if (duration > 2000 || !metric.success) {
            // Log slow or failed operations with more detail
            this.outputChannel.appendLine(`${icon} ${metric.operation} (${timing})`);
            
            if (metric.memoryUsage) {
                const memMB = (metric.memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
                this.outputChannel.appendLine(`   📊 Memory: ${memMB}MB heap used`);
            }
            
            if (metric.metadata) {
                const metadataStr = Object.entries(metric.metadata)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ');
                this.outputChannel.appendLine(`   📝 ${metadataStr}`);
            }
        } else {
            // Brief log for fast successful operations
            this.outputChannel.appendLine(`${icon} ${metric.operation} (${timing})`);
        }
    }

    /**
     * Show comprehensive performance report
     */
    showPerformanceReport(): void {
        const stats = this.getPerformanceStats();
        
        this.outputChannel.show();
        this.outputChannel.appendLine('\n' + '='.repeat(60));
        this.outputChannel.appendLine('📊 PERFORMANCE REPORT');
        this.outputChannel.appendLine('='.repeat(60));
        
        this.outputChannel.appendLine(`Total Operations: ${stats.totalOperations}`);
        this.outputChannel.appendLine(`Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
        this.outputChannel.appendLine(`Average Duration: ${stats.averageDuration.toFixed(0)}ms`);
        this.outputChannel.appendLine(`Total Time: ${(stats.totalDuration / 1000).toFixed(1)}s`);
        
        this.outputChannel.appendLine('\n🧠 Memory Usage:');
        this.outputChannel.appendLine(`  Current: ${(stats.memoryTrends.current / 1024 / 1024).toFixed(1)}MB`);
        this.outputChannel.appendLine(`  Average: ${(stats.memoryTrends.average / 1024 / 1024).toFixed(1)}MB`);
        this.outputChannel.appendLine(`  Peak: ${(stats.memoryTrends.peak / 1024 / 1024).toFixed(1)}MB`);
        
        this.outputChannel.appendLine('\n⚡ Operation Breakdown:');
        const sortedOps = Object.entries(stats.operationBreakdown)
            .sort(([,a], [,b]) => b.totalDuration - a.totalDuration)
            .slice(0, 10);
        
        for (const [operation, data] of sortedOps) {
            const avgMs = data.averageDuration.toFixed(0);
            const successPct = (data.successRate * 100).toFixed(0);
            this.outputChannel.appendLine(`  ${operation}: ${data.count}x, avg ${avgMs}ms, ${successPct}% success`);
        }
        
        this.outputChannel.appendLine('\n' + '='.repeat(60));
    }

    /**
     * Clear all performance metrics
     */
    clearMetrics(): void {
        this.metrics = [];
        this.saveMetrics();
        this.outputChannel.appendLine('🧹 Performance metrics cleared');
    }

    /**
     * Save metrics to disk
     */
    private saveMetrics(): void {
        try {
            const metricsPath = path.join(this.workspaceRoot, '.vscode', 'performance-metrics.json');
            const dir = path.dirname(metricsPath);
            
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Save only recent metrics to avoid large files
            const recentMetrics = this.metrics.slice(-200);
            fs.writeFileSync(metricsPath, JSON.stringify({
                metrics: recentMetrics,
                lastUpdated: Date.now(),
                version: '2.0.2'
            }, null, 2));
        } catch (error) {
            console.warn('Failed to save performance metrics:', error);
        }
    }

    /**
     * Load metrics from disk
     */
    private loadMetrics(): void {
        try {
            const metricsPath = path.join(this.workspaceRoot, '.vscode', 'performance-metrics.json');
            
            if (fs.existsSync(metricsPath)) {
                const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
                if (data.metrics && Array.isArray(data.metrics)) {
                    this.metrics = data.metrics;
                }
            }
        } catch (error) {
            console.warn('Failed to load performance metrics:', error);
            this.metrics = [];
        }
    }

    /**
     * Get empty stats structure
     */
    private getEmptyStats(): PerformanceStats {
        return {
            totalOperations: 0,
            totalDuration: 0,
            averageDuration: 0,
            successRate: 0,
            operationBreakdown: {},
            memoryTrends: {
                peak: 0,
                average: 0,
                current: process.memoryUsage().heapUsed
            },
            recentOperations: []
        };
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        this.saveMetrics();
        this.activeOperations.clear();
        this.metrics = [];
    }
}