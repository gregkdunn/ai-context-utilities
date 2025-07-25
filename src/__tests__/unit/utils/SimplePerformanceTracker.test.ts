/**
 * SimplePerformanceTracker Test Suite
 * Tests for lightweight performance tracking
 */

import { SimplePerformanceTracker } from '../../../utils/SimplePerformanceTracker';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        }))
    }
}));

describe('SimplePerformanceTracker', () => {
    let tracker: SimplePerformanceTracker;
    let mockOutputChannel: any;

    beforeEach(() => {
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        };
        tracker = new SimplePerformanceTracker(mockOutputChannel);
    });

    describe('trackCommand', () => {
        test('should track command execution successfully', async () => {
            const result = await tracker.trackCommand('test-command', async () => {
                return 'success';
            });

            expect(result).toBe('success');
        });

        test('should track command execution with error', async () => {
            await expect(tracker.trackCommand('test-command', async () => {
                throw new Error('Test error');
            })).rejects.toThrow('Test error');
        });

        test('should log slow operations', async () => {
            jest.useFakeTimers();
            
            const slowOperation = tracker.trackCommand('slow-command', async () => {
                jest.advanceTimersByTime(5000); // 5 seconds
                return 'done';
            });

            jest.runAllTimers();
            await slowOperation;

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('⚠️ Slow operation: slow-command took')
            );

            jest.useRealTimers();
        });
    });

    describe('getStatusSummary', () => {
        test('should return "Ready" when no metrics recorded', () => {
            const summary = tracker.getStatusSummary();
            expect(summary).toBe('Ready');
        });

        test('should return metrics summary when operations recorded', async () => {
            // Record some operations
            await tracker.trackCommand('op1', async () => 'done');
            await tracker.trackCommand('op2', async () => 'done');

            const summary = tracker.getStatusSummary();
            expect(summary).toMatch(/\d+ms avg, \d+% success/);
        });
    });

    describe('clearMetrics', () => {
        test('should clear all metrics', async () => {
            // Record operation
            await tracker.trackCommand('test', async () => 'done');

            // Clear metrics
            tracker.clearMetrics();

            const summary = tracker.getStatusSummary();
            expect(summary).toBe('Ready');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('🗑️ Performance metrics cleared');
        });
    });

    describe('dispose', () => {
        test('should dispose without error', () => {
            expect(() => tracker.dispose()).not.toThrow();
        });
    });
});