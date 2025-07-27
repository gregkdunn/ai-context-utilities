/**
 * Unit tests for TestIntelligenceEngine
 * Tests the core intelligence system for test analysis and predictions
 */

import { TestIntelligenceEngine, TestMetadata, TestExecution, TestPattern, TestInsight } from '../../../core/TestIntelligenceEngine';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        access: jest.fn()
    },
    existsSync: jest.fn()
}));

describe('TestIntelligenceEngine', () => {
    let engine: TestIntelligenceEngine;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;
    const workspaceRoot = '/test/workspace';

    beforeEach(() => {
        // Create mock output channel
        mockOutputChannel = {
            appendLine: jest.fn(),
            append: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn()
        } as any;

        engine = new TestIntelligenceEngine(workspaceRoot, mockOutputChannel);
        jest.clearAllMocks();
    });

    describe('Test Learning', () => {
        test('should learn from test execution', async () => {
            const execution: TestExecution = {
                id: 'exec-1',
                testId: 'test-1',
                result: 'fail',
                duration: 1500,
                errorMessage: 'TypeError: Cannot read property',
                timestamp: Date.now(),
                gitCommit: 'abc123',
                changedFiles: ['src/component.ts']
            };

            await engine.learnFromExecution(execution);

            const insights = await engine.getTestInsights('test-1');
            expect(insights).toBeDefined();
            expect(insights!.lastFailures).toContain(execution);
        });

        test('should maintain execution history', async () => {
            const executions: TestExecution[] = [];
            
            // Add multiple executions
            for (let i = 0; i < 5; i++) {
                const execution: TestExecution = {
                    id: `exec-${i}`,
                    testId: 'test-history',
                    result: i % 2 === 0 ? 'pass' : 'fail',
                    duration: 1000 + i * 100,
                    timestamp: Date.now() + i * 1000
                };
                executions.push(execution);
                await engine.learnFromExecution(execution);
            }

            const insights = await engine.getTestInsights('test-history');
            expect(insights!.lastFailures).toHaveLength(2); // Only failed executions
            expect(insights!.failureRate).toBe(0.4); // 2 out of 5
        });

        test('should limit history per test', async () => {
            const testId = 'test-with-long-history';
            
            // Add more executions than the limit
            for (let i = 0; i < 150; i++) {
                const execution: TestExecution = {
                    id: `exec-${i}`,
                    testId,
                    result: 'pass',
                    duration: 100,
                    timestamp: Date.now() + i
                };
                await engine.learnFromExecution(execution);
            }

            const history = engine['testHistory'].get(testId);
            expect(history!.length).toBeLessThanOrEqual(100); // maxHistoryPerTest
        });
    });

    describe('Pattern Detection', () => {
        test('should detect flaky test patterns', async () => {
            const testId = 'flaky-test';
            
            // Simulate flaky test pattern: pass, fail, pass, fail
            const results = ['pass', 'fail', 'pass', 'fail', 'pass', 'fail'];
            for (let i = 0; i < results.length; i++) {
                await engine.learnFromExecution({
                    id: `exec-${i}`,
                    testId,
                    result: results[i] as 'pass' | 'fail',
                    duration: 1000,
                    timestamp: Date.now() + i * 1000
                });
            }

            const insights = await engine.getTestInsights(testId);
            const flakyPattern = insights!.patterns.find(p => p.type === 'flaky');
            
            expect(flakyPattern).toBeDefined();
            expect(flakyPattern!.confidence).toBeGreaterThan(0.5);
        });

        test('should detect slow test patterns', async () => {
            const testId = 'slow-test';
            
            // Simulate slow test pattern
            for (let i = 0; i < 5; i++) {
                await engine.learnFromExecution({
                    id: `exec-${i}`,
                    testId,
                    result: 'pass',
                    duration: 5000 + i * 1000, // Consistently slow
                    timestamp: Date.now() + i * 1000
                });
            }

            const insights = await engine.getTestInsights(testId);
            const slowPattern = insights!.patterns.find(p => p.type === 'slow');
            
            expect(slowPattern).toBeDefined();
            expect(insights!.averageDuration).toBeGreaterThan(5000);
        });

        test('should detect always-failing tests', async () => {
            const testId = 'always-fails';
            
            // Simulate always failing test
            for (let i = 0; i < 10; i++) {
                await engine.learnFromExecution({
                    id: `exec-${i}`,
                    testId,
                    result: 'fail',
                    duration: 100,
                    errorMessage: 'Consistent error',
                    timestamp: Date.now() + i * 1000
                });
            }

            const insights = await engine.getTestInsights(testId);
            const alwaysFailsPattern = insights!.patterns.find(p => p.type === 'always_fails');
            
            expect(alwaysFailsPattern).toBeDefined();
            expect(insights!.failureRate).toBe(1);
            expect(insights!.recommendedAction).toBe('fix');
        });

        test('should detect cascading failure patterns', async () => {
            const testIds = ['test-a', 'test-b', 'test-c'];
            const timestamp = Date.now();
            
            // Simulate cascading failures - all tests fail at the same time
            for (const testId of testIds) {
                await engine.learnFromExecution({
                    id: `exec-${testId}`,
                    testId,
                    result: 'fail',
                    duration: 100,
                    timestamp: timestamp + 1000, // Same time window
                    errorMessage: 'Database connection failed'
                });
            }

            const insightsA = await engine.getTestInsights('test-a');
            expect(insightsA!.correlatedTests).toContain('test-b');
            expect(insightsA!.correlatedTests).toContain('test-c');
        });
    });

    describe('Test Predictions', () => {
        test('should predict test outcomes based on history', async () => {
            const testId = 'predictable-test';
            
            // Create a pattern: fails after every 3 passes
            const pattern = ['pass', 'pass', 'pass', 'fail'];
            for (let cycle = 0; cycle < 3; cycle++) {
                for (let i = 0; i < pattern.length; i++) {
                    await engine.learnFromExecution({
                        id: `exec-${cycle}-${i}`,
                        testId,
                        result: pattern[i] as 'pass' | 'fail',
                        duration: 100,
                        timestamp: Date.now() + cycle * 4000 + i * 1000
                    });
                }
            }

            const predictions = await engine.predictOutcomes([testId]);
            expect(predictions).toHaveLength(1);
            expect(predictions[0].confidence).toBeGreaterThan(0);
        });

        test('should predict based on file changes', async () => {
            const testId = 'file-dependent-test';
            
            // Test fails when specific file is changed
            await engine.learnFromExecution({
                id: 'exec-1',
                testId,
                result: 'fail',
                duration: 100,
                timestamp: Date.now(),
                changedFiles: ['src/critical-component.ts']
            });

            await engine.learnFromExecution({
                id: 'exec-2',
                testId,
                result: 'pass',
                duration: 100,
                timestamp: Date.now() + 1000,
                changedFiles: ['src/other-file.ts']
            });

            const predictions = await engine.predictOutcomes(
                [testId],
                ['src/critical-component.ts']
            );
            
            expect(predictions[0].willPass).toBe(false);
            expect(predictions[0].reasoning).toContain('critical-component.ts');
        });

        test('should optimize test execution order', async () => {
            const testIds = ['fast-test', 'slow-test', 'flaky-test'];
            
            // Set up different test characteristics
            await engine.learnFromExecution({
                id: 'exec-fast',
                testId: 'fast-test',
                result: 'pass',
                duration: 100,
                timestamp: Date.now()
            });

            await engine.learnFromExecution({
                id: 'exec-slow',
                testId: 'slow-test',
                result: 'pass',
                duration: 5000,
                timestamp: Date.now()
            });

            // Flaky test with failures
            await engine.learnFromExecution({
                id: 'exec-flaky-1',
                testId: 'flaky-test',
                result: 'fail',
                duration: 1000,
                timestamp: Date.now()
            });

            const predictions = await engine.predictOutcomes(testIds);
            const optimizedOrder = predictions
                .sort((a, b) => a.suggestedOrder - b.suggestedOrder)
                .map(p => p.testId);

            // Flaky/failing tests should run first for fast feedback
            expect(optimizedOrder[0]).toBe('flaky-test');
        });
    });

    describe('Test Correlation', () => {
        test('should track test correlations', async () => {
            const timestamp = Date.now();
            
            // Tests that often fail together
            const correlatedTests = ['auth-test', 'user-test', 'profile-test'];
            
            // Simulate multiple sessions where these tests fail together
            for (let session = 0; session < 5; session++) {
                const sessionTime = timestamp + session * 10000;
                
                for (const testId of correlatedTests) {
                    await engine.learnFromExecution({
                        id: `${testId}-${session}`,
                        testId,
                        result: 'fail',
                        duration: 100,
                        timestamp: sessionTime + Math.random() * 1000,
                        errorMessage: 'Authentication service down'
                    });
                }
            }

            const authInsights = await engine.getTestInsights('auth-test');
            expect(authInsights!.correlatedTests).toContain('user-test');
            expect(authInsights!.correlatedTests).toContain('profile-test');
        });

        test('should calculate correlation strength', () => {
            const correlation = engine['calculateCorrelation']([1, 1, 0, 0], [1, 1, 0, 1]);
            expect(correlation).toBeGreaterThan(0);
            expect(correlation).toBeLessThanOrEqual(1);
        });
    });

    describe('Data Persistence', () => {
        test('should save intelligence data', async () => {
            await engine.learnFromExecution({
                id: 'exec-persist',
                testId: 'persist-test',
                result: 'pass',
                duration: 100,
                timestamp: Date.now()
            });

            await engine.saveIntelligenceData();

            expect(fs.promises.writeFile).toHaveBeenCalled();
            expect(fs.promises.mkdir).toHaveBeenCalledWith(
                expect.stringContaining('.vscode/ai-debug-intelligence'),
                { recursive: true }
            );
        });

        test('should load historical data on initialization', async () => {
            const mockData = {
                testHistory: {
                    'test-1': [{
                        id: 'exec-1',
                        testId: 'test-1',
                        result: 'pass',
                        duration: 100,
                        timestamp: Date.now()
                    }]
                },
                testMetadata: {
                    'test-1': {
                        testId: 'test-1',
                        fileName: 'test.spec.ts',
                        testName: 'should work',
                        duration: 100,
                        timestamp: Date.now()
                    }
                }
            };

            (fs.promises.readFile as jest.Mock).mockResolvedValue(
                JSON.stringify(mockData)
            );

            await engine['loadHistoricalData']();

            const insights = await engine.getTestInsights('test-1');
            expect(insights).toBeDefined();
        });

        test('should handle corrupted data gracefully', async () => {
            (fs.promises.readFile as jest.Mock).mockResolvedValue('invalid json');

            expect(() => engine['loadHistoricalData']()).not.toThrow();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Failed to load historical data')
            );
        });
    });

    describe('Performance Analysis', () => {
        test('should identify performance regressions', async () => {
            const testId = 'performance-test';
            
            // Simulate performance regression
            const baseDurations = [100, 110, 95, 105, 100]; // Baseline
            const regressedDurations = [500, 520, 480, 510, 505]; // Regression
            
            let timestamp = Date.now();
            
            // Add baseline executions
            for (const duration of baseDurations) {
                await engine.learnFromExecution({
                    id: `baseline-${timestamp}`,
                    testId,
                    result: 'pass',
                    duration,
                    timestamp: timestamp++
                });
            }
            
            // Add regressed executions
            for (const duration of regressedDurations) {
                await engine.learnFromExecution({
                    id: `regressed-${timestamp}`,
                    testId,
                    result: 'pass',
                    duration,
                    timestamp: timestamp++
                });
            }

            const regressions = await engine.detectPerformanceRegressions();
            expect(regressions).toContain(testId);
        });

        test('should calculate test efficiency scores', async () => {
            const testId = 'efficiency-test';
            
            await engine.learnFromExecution({
                id: 'exec-efficient',
                testId,
                result: 'pass',
                duration: 50,
                timestamp: Date.now()
            });

            const score = await engine.calculateEfficiencyScore(testId);
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(1);
        });
    });

    describe('Insights Generation', () => {
        test('should generate comprehensive test insights', async () => {
            const testId = 'insight-test';
            
            // Create varied execution history
            const executions = [
                { result: 'pass', duration: 100 },
                { result: 'fail', duration: 150 },
                { result: 'pass', duration: 110 },
                { result: 'fail', duration: 200 }
            ];

            for (let i = 0; i < executions.length; i++) {
                await engine.learnFromExecution({
                    id: `exec-${i}`,
                    testId,
                    result: executions[i].result as 'pass' | 'fail',
                    duration: executions[i].duration,
                    timestamp: Date.now() + i * 1000
                });
            }

            const insights = await engine.getTestInsights(testId);
            
            expect(insights!.averageDuration).toBe(140); // (100+150+110+200)/4
            expect(insights!.failureRate).toBe(0.5); // 2 failures out of 4
            expect(insights!.patterns).toBeDefined();
            expect(insights!.lastFailures).toHaveLength(2);
        });

        test('should recommend actions based on patterns', async () => {
            const testId = 'action-test';
            
            // Simulate a test that always fails
            for (let i = 0; i < 10; i++) {
                await engine.learnFromExecution({
                    id: `exec-${i}`,
                    testId,
                    result: 'fail',
                    duration: 100,
                    timestamp: Date.now() + i * 1000
                });
            }

            const insights = await engine.getTestInsights(testId);
            expect(insights!.recommendedAction).toBe('fix');
        });
    });
});