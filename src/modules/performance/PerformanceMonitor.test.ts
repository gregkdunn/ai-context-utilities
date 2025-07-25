/**
 * PerformanceMonitor Test Suite
 * Tests for performance monitoring and reporting functionality
 */

import { PerformanceMonitor, PerformanceReport } from './PerformanceMonitor';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn()
    }
}));

describe('PerformanceMonitor', () => {
    let performanceMonitor: PerformanceMonitor;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;

    beforeEach(() => {
        // Create mock output channel
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            clear: jest.fn(),
            replace: jest.fn(),
            append: jest.fn(),
            name: 'Test Channel'
        };

        // Create performance monitor with mocked dependencies
        performanceMonitor = new PerformanceMonitor(mockOutputChannel);
        
        // Clear any initial memory monitoring setup
        performanceMonitor.clearMetrics();
    });

    afterEach(() => {
        performanceMonitor.dispose();
        jest.clearAllMocks();
    });

    describe('Constructor and Initialization', () => {
        it('should initialize with empty metrics', () => {
            const report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(0);
            expect(report.metrics).toHaveLength(0);
        });

        it('should start memory monitoring on initialization', () => {
            // Memory monitoring starts automatically, just verify it doesn't crash
            expect(performanceMonitor).toBeDefined();
        });
    });

    describe('Metric Recording', () => {
        it('should record a performance metric', () => {
            performanceMonitor.recordMetric('test-operation', 150, true, { type: 'unit-test' });
            
            const report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(1);
            expect(report.metrics).toHaveLength(1);
            
            const metric = report.metrics[0];
            expect(metric.operation).toBe('test-operation');
            expect(metric.duration).toBe(150);
            expect(metric.success).toBe(true);
            expect(metric.metadata).toEqual({ type: 'unit-test' });
        });

        it('should handle failed operations', () => {
            performanceMonitor.recordMetric('failed-operation', 500, false);
            
            const report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(1);
            expect(report.summary.successRate).toBe(0);
        });

        it('should limit metrics to MAX_METRICS', () => {
            // Record more than MAX_METRICS (1000) metrics
            for (let i = 0; i < 1050; i++) {
                performanceMonitor.recordMetric(`operation-${i}`, 100, true);
            }
            
            const report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(1000); // Should be capped
        });

        it('should log slow operations', () => {
            performanceMonitor.recordMetric('slow-operation', 3000, true); // 3 seconds
            
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('⚠️ Slow operation detected: slow-operation took 3000ms')
            );
        });
    });

    describe('Async Command Tracking', () => {
        it('should track successful async command execution', async () => {
            const mockCommand = jest.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve('success'), 10))
            );
            
            const result = await performanceMonitor.trackCommand('async-test', mockCommand);
            
            expect(result).toBe('success');
            expect(mockCommand).toHaveBeenCalledTimes(1);
            
            const report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(1);
            expect(report.summary.successRate).toBe(1);
            
            const metric = report.metrics[0];
            expect(metric.operation).toBe('async-test');
            expect(metric.success).toBe(true);
            expect(metric.duration).toBeGreaterThanOrEqual(0);
        });

        it('should track failed async command execution', async () => {
            const mockCommand = jest.fn().mockRejectedValue(new Error('Test error'));
            
            await expect(
                performanceMonitor.trackCommand('failing-test', mockCommand)
            ).rejects.toThrow('Test error');
            
            const report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(1);
            expect(report.summary.successRate).toBe(0);
            
            const metric = report.metrics[0];
            expect(metric.operation).toBe('failing-test');
            expect(metric.success).toBe(false);
        });

        it('should track command with metadata', async () => {
            const mockCommand = jest.fn().mockResolvedValue('result');
            const metadata = { project: 'test-project', type: 'integration' };
            
            await performanceMonitor.trackCommand('metadata-test', mockCommand, metadata);
            
            const report = performanceMonitor.generateReport();
            const metric = report.metrics[0];
            expect(metric.metadata).toEqual(metadata);
        });
    });

    describe('Synchronous Tracking', () => {
        it('should track successful synchronous operations', () => {
            const mockFn = jest.fn().mockReturnValue('sync-result');
            
            const result = performanceMonitor.track('sync-test', mockFn);
            
            expect(result).toBe('sync-result');
            expect(mockFn).toHaveBeenCalledTimes(1);
            
            const report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(1);
            expect(report.summary.successRate).toBe(1);
        });

        it('should track failed synchronous operations', () => {
            const mockFn = jest.fn().mockImplementation(() => {
                throw new Error('Sync error');
            });
            
            expect(() => {
                performanceMonitor.track('sync-failing-test', mockFn);
            }).toThrow('Sync error');
            
            const report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(1);
            expect(report.summary.successRate).toBe(0);
        });
    });

    describe('Operation Statistics', () => {
        beforeEach(() => {
            // Record test data
            performanceMonitor.recordMetric('fast-op', 50, true);
            performanceMonitor.recordMetric('fast-op', 60, true);
            performanceMonitor.recordMetric('slow-op', 1000, true);
            performanceMonitor.recordMetric('slow-op', 1200, false);
            performanceMonitor.recordMetric('medium-op', 300, true);
        });

        it('should calculate operation statistics correctly', () => {
            const fastOpStats = performanceMonitor.getOperationStats('fast-op');
            
            expect(fastOpStats.count).toBe(2);
            expect(fastOpStats.averageDuration).toBe(55); // (50 + 60) / 2
            expect(fastOpStats.minDuration).toBe(50);
            expect(fastOpStats.maxDuration).toBe(60);
            expect(fastOpStats.successRate).toBe(1); // 100%
        });

        it('should handle mixed success/failure rates', () => {
            const slowOpStats = performanceMonitor.getOperationStats('slow-op');
            
            expect(slowOpStats.count).toBe(2);
            expect(slowOpStats.averageDuration).toBe(1100); // (1000 + 1200) / 2
            expect(slowOpStats.successRate).toBe(0.5); // 50%
        });

        it('should return zeros for non-existent operations', () => {
            const nonExistentStats = performanceMonitor.getOperationStats('non-existent');
            
            expect(nonExistentStats.count).toBe(0);
            expect(nonExistentStats.averageDuration).toBe(0);
            expect(nonExistentStats.minDuration).toBe(0);
            expect(nonExistentStats.maxDuration).toBe(0);
            expect(nonExistentStats.successRate).toBe(0);
        });
    });

    describe('Performance Reports', () => {
        beforeEach(() => {
            // Record varied test data for comprehensive reporting
            performanceMonitor.recordMetric('quick-test', 25, true);
            performanceMonitor.recordMetric('medium-test', 150, true);
            performanceMonitor.recordMetric('slow-test', 2000, false);
            performanceMonitor.recordMetric('quick-test', 30, true);
            performanceMonitor.recordMetric('medium-test', 180, true);
        });

        it('should generate comprehensive performance report', () => {
            const report = performanceMonitor.generateReport();
            
            expect(report.summary.totalOperations).toBe(5);
            expect(report.summary.averageDuration).toBeCloseTo((25 + 150 + 2000 + 30 + 180) / 5);
            expect(report.summary.successRate).toBe(0.8); // 4/5 successful
            expect(report.summary.slowestOperation).toBe('slow-test');
            expect(report.summary.fastestOperation).toBe('quick-test');
        });

        it('should include recent metrics in report', () => {
            const report = performanceMonitor.generateReport();
            
            expect(report.metrics).toHaveLength(5); // Should include all recent metrics
            expect(report.metrics.every(m => m.timestamp > 0)).toBe(true);
        });

        it('should limit metrics in report to last 50', () => {
            // Record many metrics
            for (let i = 0; i < 100; i++) {
                performanceMonitor.recordMetric(`bulk-test-${i}`, 100, true);
            }
            
            const report = performanceMonitor.generateReport();
            expect(report.metrics).toHaveLength(50); // Should be limited to last 50
        });
    });

    describe('Recommendations Generation', () => {
        it('should recommend optimization for slow operations', () => {
            performanceMonitor.recordMetric('very-slow-op', 5000, true); // 5 seconds
            
            const report = performanceMonitor.generateReport();
            expect(report.recommendations.some(rec => 
                rec.includes('Consider optimizing these slow operations: very-slow-op')
            )).toBe(true);
        });

        it('should recommend improving error handling for failing operations', () => {
            // Record operations with high failure rate
            for (let i = 0; i < 10; i++) {
                performanceMonitor.recordMetric('failing-op', 100, i < 3); // 30% success rate
            }
            
            const report = performanceMonitor.generateReport();
            expect(report.recommendations.some(rec => 
                rec.includes('Improve error handling for: failing-op')
            )).toBe(true);
        });

        it('should recommend caching for frequent operations', () => {
            // Record many operations of the same type
            for (let i = 0; i < 60; i++) {
                performanceMonitor.recordMetric('frequent-op', 50, true);
            }
            
            const report = performanceMonitor.generateReport();
            expect(report.recommendations.some(rec => 
                rec.includes('Consider caching for frequent operations: frequent-op')
            )).toBe(true);
        });

        it('should provide no recommendations when performance is good', () => {
            performanceMonitor.recordMetric('good-op', 100, true);
            
            const report = performanceMonitor.generateReport();
            expect(report.recommendations).toHaveLength(0);
        });
    });

    describe('Report Display', () => {
        it('should display performance report to output channel', () => {
            performanceMonitor.recordMetric('display-test', 150, true);
            
            performanceMonitor.displayReport();
            
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('📊 PERFORMANCE REPORT')
            );
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Total Operations: 1')
            );
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Success Rate: 100%')
            );
        });

        it('should display memory usage in report when available', () => {
            // Mock process.memoryUsage for memory snapshots
            const originalProcess = global.process;
            (global as any).process = {
                ...originalProcess,
                memoryUsage: jest.fn().mockReturnValue({
                    heapUsed: 50 * 1024 * 1024, // 50MB
                    heapTotal: 100 * 1024 * 1024,
                    external: 10 * 1024 * 1024,
                    arrayBuffers: 5 * 1024 * 1024
                })
            };
            
            // Manually trigger memory snapshot
            performanceMonitor['takeMemorySnapshot']();
            
            performanceMonitor.displayReport();
            
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Current Memory: 50MB')
            );
            
            // Restore original process
            global.process = originalProcess;
        });
    });

    describe('Memory Management', () => {
        it('should clear metrics and memory snapshots', () => {
            performanceMonitor.recordMetric('test-clear', 100, true);
            
            let report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(1);
            
            performanceMonitor.clearMetrics();
            
            report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(0);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '🗑️ Performance metrics cleared'
            );
        });

        it('should handle disposal properly', () => {
            expect(() => {
                performanceMonitor.dispose();
            }).not.toThrow();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty operation names', () => {
            performanceMonitor.recordMetric('', 100, true);
            
            const report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(1);
        });

        it('should handle negative durations', () => {
            performanceMonitor.recordMetric('negative-duration', -50, true);
            
            const report = performanceMonitor.generateReport();
            expect(report.summary.totalOperations).toBe(1);
            expect(report.metrics[0].duration).toBe(-50);
        });

        it('should handle zero duration operations', () => {
            performanceMonitor.recordMetric('instant-op', 0, true);
            
            const stats = performanceMonitor.getOperationStats('instant-op');
            expect(stats.averageDuration).toBe(0);
            expect(stats.minDuration).toBe(0);
            expect(stats.maxDuration).toBe(0);
        });

        it('should handle operations with same name but different cases', () => {
            performanceMonitor.recordMetric('Test-Op', 100, true);
            performanceMonitor.recordMetric('test-op', 200, true);
            
            // Should treat as different operations
            const upperStats = performanceMonitor.getOperationStats('Test-Op');
            const lowerStats = performanceMonitor.getOperationStats('test-op');
            
            expect(upperStats.count).toBe(1);
            expect(lowerStats.count).toBe(1);
        });
    });

    describe('Memory Monitoring', () => {
        it('should handle missing process.memoryUsage gracefully', () => {
            const originalProcess = global.process;
            (global as any).process = { ...originalProcess, memoryUsage: undefined };
            
            expect(() => {
                performanceMonitor['takeMemorySnapshot']();
            }).not.toThrow();
            
            global.process = originalProcess;
        });

        it('should warn about high memory usage', () => {
            const originalProcess = global.process;
            (global as any).process = {
                ...originalProcess,
                memoryUsage: jest.fn().mockReturnValue({
                    heapUsed: 150 * 1024 * 1024, // 150MB (above 100MB threshold)
                    heapTotal: 200 * 1024 * 1024,
                    external: 10 * 1024 * 1024,
                    arrayBuffers: 5 * 1024 * 1024
                })
            };
            
            performanceMonitor['takeMemorySnapshot']();
            
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('⚠️ High memory usage detected: 150MB')
            );
            
            global.process = originalProcess;
        });
    });
});