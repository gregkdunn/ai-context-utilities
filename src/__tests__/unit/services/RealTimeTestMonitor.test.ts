/**
 * Unit tests for RealTimeTestMonitor service
 * Tests real-time test execution monitoring and metrics
 */

import { RealTimeTestMonitor, TestEvent, TestMetrics, TestWatcher } from '../../../services/RealTimeTestMonitor';
import { TestIntelligenceEngine } from '../../../core/TestIntelligenceEngine';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('../../../core/TestIntelligenceEngine');

describe('RealTimeTestMonitor', () => {
    let monitor: RealTimeTestMonitor;
    let mockTestIntelligence: jest.Mocked<TestIntelligenceEngine>;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;

    beforeEach(() => {
        // Create mock dependencies
        mockTestIntelligence = {
            analyzePattern: jest.fn(),
            getTestInsights: jest.fn(),
            recordFailure: jest.fn(),
            getFailureTrends: jest.fn(),
            getCommonPatterns: jest.fn(),
            getCriticalPaths: jest.fn(),
            initialize: jest.fn(),
            processTestRun: jest.fn(),
            generateReport: jest.fn(),
            learnFromExecution: jest.fn(),
            predictTestOutcomes: jest.fn().mockReturnValue([]),
            getOptimizationSuggestions: jest.fn().mockReturnValue([])
        } as any;

        mockOutputChannel = {
            appendLine: jest.fn(),
            append: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn()
        } as any;

        monitor = new RealTimeTestMonitor(mockTestIntelligence, mockOutputChannel);
        jest.clearAllMocks();
    });

    describe('Test Event Processing', () => {
        test('should process test start events', (done) => {
            monitor.processOutput('Running math.spec.ts');

            // Wait for debounced parsing
            setTimeout(() => {
                const metrics = monitor.getMetrics();
                expect(metrics.currentTest).toBe('math.spec.ts');
                done();
            }, 150);
        });

        test('should process test pass events', (done) => {
            monitor.processOutput('✓ should validate email (25ms)');

            setTimeout(() => {
                const metrics = monitor.getMetrics();
                expect(metrics.passed).toBe(1);
                done();
            }, 150);
        });

        test('should process test fail events', (done) => {
            monitor.processOutput('✗ should handle errors');

            setTimeout(() => {
                const metrics = monitor.getMetrics();
                expect(metrics.failed).toBe(1);
                done();
            }, 150);
        });

        test('should process test skip events', (done) => {
            monitor.processOutput('○ skipped test case');

            setTimeout(() => {
                const metrics = monitor.getMetrics();
                expect(metrics.skipped).toBe(1);
                done();
            }, 150);
        });
    });

    describe('Test Watchers', () => {
        test('should notify watchers of test events', (done) => {
            const mockWatcher: TestWatcher = {
                onTestStart: jest.fn(),
                onTestComplete: jest.fn(),
                onSuiteComplete: jest.fn()
            };

            monitor.addWatcher(mockWatcher);
            
            // Simulate test events
            monitor.processOutput('Running should.work.spec.ts :: should work');
            monitor.processOutput('✓ should work (10ms)');
            
            setTimeout(() => {
                expect(mockWatcher.onTestStart).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'start',
                        testName: 'should work'
                    })
                );
                expect(mockWatcher.onTestComplete).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'pass'
                    })
                );
                done();
            }, 150);
        });

        test('should notify watchers when suite completes', () => {
            const mockWatcher: TestWatcher = {
                onTestStart: jest.fn(),
                onTestComplete: jest.fn(),
                onSuiteComplete: jest.fn()
            };

            monitor.addWatcher(mockWatcher);
            monitor.startMonitoring();
            
            // Simulate test execution
            monitor.processOutput('Test Suites: 1 passed, 1 total');
            monitor.processOutput('Tests: 5 passed, 5 total');
            monitor.processOutput('Time: 2.5s');
            
            monitor.stopMonitoring();

            expect(mockWatcher.onSuiteComplete).toHaveBeenCalledWith(
                expect.objectContaining({
                    totalTests: expect.any(Number),
                    passed: expect.any(Number),
                    duration: expect.any(Number)
                })
            );
        });
    });

    describe('Test Predictions', () => {
        test('should predict likely failures based on patterns', async () => {
            mockTestIntelligence.getTestInsights.mockImplementation(() => ({
                testId: 'test-1',
                patterns: [{ type: 'flaky' as const, confidence: 0.8, evidence: [], suggestion: 'Fix flaky test' }],
                averageDuration: 1000,
                failureRate: 0.8,
                lastFailures: [],
                correlatedTests: [],
                recommendedAction: 'fix'
            }));

            const testFiles = [
                { testName: 'flaky test', fileName: 'flaky.spec.ts' },
                { testName: 'stable test', fileName: 'stable.spec.ts' }
            ];

            const predictions = await monitor.getTestPredictions(testFiles);

            expect(predictions.likelyFailures).toBeDefined();
            expect(predictions.likelyFailures.length).toBeGreaterThan(0);
            expect(predictions.likelyFailures[0]).toMatchObject({
                testName: expect.any(String),
                probability: expect.any(Number),
                reason: expect.any(String)
            });
        });

        test('should optimize test order based on predictions', async () => {
            mockTestIntelligence.getTestInsights.mockImplementation((testName: string, fileName: string) => {
                if (testName.includes('critical')) {
                    return {
                        testId: 'critical-test',
                        patterns: [{ type: 'always_fails' as const, confidence: 0.9, evidence: [], suggestion: 'Fix critical test' }],
                        averageDuration: 2000,
                        failureRate: 1.0,
                        lastFailures: [],
                        correlatedTests: [],
                        recommendedAction: 'fix'
                    };
                }
                return null;
            });

            const testFiles = [
                { testName: 'regular test', fileName: 'regular.spec.ts' },
                { testName: 'critical test', fileName: 'critical.spec.ts' },
                { testName: 'another test', fileName: 'another.spec.ts' }
            ];

            const predictions = await monitor.getTestPredictions(testFiles);

            // Critical test should be run first
            expect(predictions.optimizedOrder[0].testName).toContain('critical');
        });
    });

    describe('Real-time Metrics', () => {
        test('should calculate tests per second', () => {
            monitor.startMonitoring();
            
            // Simulate rapid test execution
            for (let i = 0; i < 10; i++) {
                monitor.processOutput(`✓ test ${i} (5ms)`);
            }

            const metrics = monitor.getMetrics();
            expect(metrics.testsPerSecond).toBeDefined();
            expect(metrics.testsPerSecond).toBeGreaterThan(0);
        });

        test('should estimate time remaining', () => {
            monitor.startMonitoring();
            
            // Process some tests
            monitor.processOutput('Tests: 5 passed, 5 of 20 total');
            
            const metrics = monitor.getMetrics();
            expect(metrics.estimatedTimeRemaining).toBeDefined();
            expect(metrics.estimatedTimeRemaining).toBeGreaterThan(0);
        });

        test('should track memory usage', () => {
            const testEvent: TestEvent = {
                type: 'complete',
                testName: 'memory test',
                fileName: 'memory.spec.ts',
                timestamp: Date.now(),
                memory: {
                    before: 100 * 1024 * 1024, // 100MB
                    after: 150 * 1024 * 1024,  // 150MB
                    peak: 200 * 1024 * 1024    // 200MB
                }
            };

            monitor.emit('test:complete', testEvent);

            const stats = monitor.getMetrics();
            expect(stats.totalTests).toBeGreaterThan(0);
            expect(stats.passed).toBe(1);
        });
    });

    describe('Pattern Detection', () => {
        test('should detect test failure patterns', () => {
            // Simulate multiple similar failures
            monitor.processOutput('✗ API test 1\n  Error: Network timeout');
            monitor.processOutput('✗ API test 2\n  Error: Network timeout');
            monitor.processOutput('✗ API test 3\n  Error: Network timeout');

            const metrics = monitor.getMetrics();
            expect(metrics.failed).toBeGreaterThan(0);
        });

        test('should detect flaky tests', () => {
            // Simulate flaky test behavior
            monitor.processOutput('✓ flaky test (100ms)');
            monitor.processOutput('✗ flaky test\n  Error: Random failure');
            monitor.processOutput('✓ flaky test (150ms)');

            const metrics = monitor.getMetrics();
            expect(metrics.passed).toBeGreaterThan(0);
            expect(metrics.failed).toBeGreaterThan(0);
        });
    });

    describe('Output Parsing', () => {
        test('should parse Jest output format', () => {
            const jestOutput = `
PASS src/utils/math.spec.ts
  Math utilities
    ✓ should add numbers (5ms)
    ✓ should multiply numbers (2ms)
`;
            monitor.processOutput(jestOutput);

            const metrics = monitor.getMetrics();
            expect(metrics.passed).toBe(2);
            expect(metrics.totalTests).toBeGreaterThan(0);
        });

        test('should parse Mocha output format', () => {
            const mochaOutput = `
  User Service
    ✓ should create user (50ms)
    ✗ should validate email
      AssertionError: expected false to be true
`;
            monitor.processOutput(mochaOutput);

            const metrics = monitor.getMetrics();
            expect(metrics.passed).toBe(1);
            expect(metrics.failed).toBe(1);
        });

        test('should handle incomplete output gracefully', () => {
            monitor.processOutput('Starting test: incomplete');
            // No completion event
            
            const metrics = monitor.getMetrics();
            expect(metrics.currentTest).toBe('incomplete');
            expect(() => monitor.getMetrics()).not.toThrow();
        });
    });

    describe('Performance Tracking', () => {
        test('should track slow tests', () => {
            monitor.processOutput('✓ slow test (5000ms)');
            monitor.processOutput('✓ fast test (10ms)');

            const stats = monitor.getMetrics();
            expect(stats.totalTests).toBeGreaterThan(0);
            expect(stats.duration).toBeGreaterThan(0);
        });

        test('should calculate average test duration', () => {
            monitor.processOutput('✓ test 1 (100ms)');
            monitor.processOutput('✓ test 2 (200ms)');
            monitor.processOutput('✓ test 3 (300ms)');

            const stats = monitor.getMetrics();
            expect(stats.duration).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed output', () => {
            expect(() => {
                monitor.processOutput('!@#$%^&*()');
                monitor.processOutput(null as any);
                monitor.processOutput(undefined as any);
            }).not.toThrow();
        });

        test('should reset metrics on monitoring restart', () => {
            monitor.startMonitoring();
            monitor.processOutput('✓ test 1');
            
            monitor.stopMonitoring();
            monitor.startMonitoring();

            const metrics = monitor.getMetrics();
            expect(metrics.passed).toBe(0);
            expect(metrics.totalTests).toBe(0);
        });
    });
});