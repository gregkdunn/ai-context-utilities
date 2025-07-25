/**
 * Simple Performance Tracker
 * Lightweight tracking for core functionality without complex analytics
 */

import * as vscode from 'vscode';

interface SimpleMetric {
    operation: string;
    duration: number;
    timestamp: number;
    success: boolean;
}

/**
 * Lightweight performance tracking for core operations
 */
export class SimplePerformanceTracker {
    private metrics: SimpleMetric[] = [];
    private readonly MAX_METRICS = 50; // Keep only recent metrics

    constructor(private outputChannel: vscode.OutputChannel) {}

    /**
     * Track command execution time
     */
    async trackCommand<T>(
        operation: string,
        command: () => Promise<T>
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
            this.recordMetric(operation, duration, success);
        }
    }

    /**
     * Record a simple metric
     */
    private recordMetric(operation: string, duration: number, success: boolean): void {
        const metric: SimpleMetric = {
            operation,
            duration,
            timestamp: Date.now(),
            success
        };

        this.metrics.push(metric);

        // Keep only recent metrics
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics = this.metrics.slice(-this.MAX_METRICS);
        }

        // Log slow operations only
        if (duration > 3000) { // 3 seconds
            this.outputChannel.appendLine(
                `⚠️ Slow operation: ${operation} took ${duration}ms`
            );
        }
    }

    /**
     * Get simple performance summary for status bar
     */
    getStatusSummary(): string {
        if (this.metrics.length === 0) {
            return 'Ready';
        }

        const recentMetrics = this.metrics.slice(-10);
        const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
        const successRate = recentMetrics.filter(m => m.success).length / recentMetrics.length;

        return `${Math.round(avgDuration)}ms avg, ${Math.round(successRate * 100)}% success`;
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics = [];
        this.outputChannel.appendLine('🗑️ Performance metrics cleared');
    }

    /**
     * Dispose method for compatibility
     */
    dispose(): void {
        // SimplePerformanceTracker doesn't need disposal
        // Method exists for interface compatibility
    }
}