/**
 * Unit tests for PerformanceMonitor
 */

import * as vscode from 'vscode';
import { PerformanceMonitor } from '../PerformanceMonitor';

// Mock vscode
jest.mock('vscode', () => ({
    OutputChannel: jest.fn()
}));

describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;
    let mockOutputChannel: any;

    beforeEach(() => {
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn()
        };
        monitor = new PerformanceMonitor(mockOutputChannel);
        jest.clearAllMocks();
    });

    afterEach(() => {
        monitor.dispose();
    });

    describe('constructor', () => {
        it('should create performance monitor instance', () => {
            expect(monitor).toBeInstanceOf(PerformanceMonitor);
        });
    });

    describe('trackCommand', () => {
        it('should track async command performance', async () => {
            const command = async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'result';
            };

            const result = await monitor.trackCommand('test-command', command);
            expect(result).toBe('result');
        });

        it('should handle command errors', async () => {
            const command = async () => {
                throw new Error('Test error');
            };

            await expect(monitor.trackCommand('test-command', command)).rejects.toThrow('Test error');
        });
    });

    describe('track', () => {
        it('should track sync operation performance', () => {
            const operation = () => 'sync-result';

            const result = monitor.track('test-sync', operation);
            expect(result).toBe('sync-result');
        });

        it('should handle sync operation errors', () => {
            const operation = () => {
                throw new Error('Sync error');
            };

            expect(() => monitor.track('test-sync', operation)).toThrow('Sync error');
        });
    });

    describe('recordMetric', () => {
        it('should record performance metric', () => {
            monitor.recordMetric('test-metric', 100, true, { test: 'data' });
            
            const report = monitor.generateReport();
            expect(report.metrics.length).toBeGreaterThan(0);
        });
    });

    describe('getOperationStats', () => {
        it('should return operation statistics', () => {
            monitor.recordMetric('test-op', 100, true);
            monitor.recordMetric('test-op', 200, true);
            
            const stats = monitor.getOperationStats('test-op');
            expect(stats.count).toBe(2);
            expect(stats.averageDuration).toBe(150);
        });

        it('should handle missing operation', () => {
            const stats = monitor.getOperationStats('missing-op');
            expect(stats.count).toBe(0);
        });
    });

    describe('generateReport', () => {
        it('should generate performance report', () => {
            const report = monitor.generateReport();
            
            expect(report).toBeDefined();
            expect(report.summary).toBeDefined();
            expect(report.metrics).toBeInstanceOf(Array);
            expect(report.memoryUsage).toBeInstanceOf(Array);
            expect(report.recommendations).toBeInstanceOf(Array);
        });
    });

    describe('clearMetrics', () => {
        it('should clear all metrics', () => {
            monitor.clearMetrics();
            const report = monitor.generateReport();
            
            expect(report.metrics).toHaveLength(0);
        });
    });

    describe('dispose', () => {
        it('should dispose resources', () => {
            expect(() => monitor.dispose()).not.toThrow();
        });
    });
});