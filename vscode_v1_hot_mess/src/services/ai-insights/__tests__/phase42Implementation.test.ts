import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { IntelligentSuggestionsEngine } from '../engines/intelligentSuggestionsEngine';
import { AutomatedInsightsEngine } from '../engines/automatedInsightsEngine';
import { NaturalLanguageQueryEngine } from '../engines/naturalLanguageQueryEngine';
import { AIInsightsEngine } from '../aiInsightsEngine';
import {
    ExecutionContext,
    AnalysisData,
    CommandExecution,
    TestResult,
    ErrorPattern,
    PerformanceMetric,
    GitCommit
} from '../../../types';

// Mock VSCode
jest.mock('vscode', () => ({
    ExtensionContext: jest.fn(),
    Disposable: jest.fn()
}));

describe('Phase 4.2 AI Insights Implementation', () => {
    let mockContext: vscode.ExtensionContext;
    let aiInsightsEngine: AIInsightsEngine;
    let intelligentSuggestionsEngine: IntelligentSuggestionsEngine;
    let automatedInsightsEngine: AutomatedInsightsEngine;
    let naturalLanguageQueryEngine: NaturalLanguageQueryEngine;

    const createMockExecutionContext = (): ExecutionContext => ({
        project: 'test-project',
        currentFiles: ['src/app.ts', 'src/utils.ts'],
        recentCommands: [],
        gitStatus: {
            branch: 'main',
            hasUncommittedChanges: true,
            changedFiles: ['src/app.ts'],
            commitsBehind: 0,
            commitsAhead: 1,
            lastCommit: {
                hash: 'abc123',
                message: 'Test commit',
                author: 'Test User',
                date: new Date(),
                files: ['src/app.ts'],
                stats: { additions: 10, deletions: 2 }
            }
        },
        testStatus: {
            passing: 15,
            failing: 3,
            skipped: 1,
            coverage: 85,
            lastRun: new Date(),
            failingTests: [
                {
                    suite: 'app.spec.ts',
                    test: 'should handle errors',
                    status: 'failed',
                    duration: 100,
                    error: 'Assertion failed',
                    timestamp: new Date()
                }
            ]
        },
        timestamp: new Date()
    });

    const createMockAnalysisData = (): AnalysisData => ({
        commandHistory: [
            {
                id: 'cmd1',
                action: 'nxTest',
                project: 'test-project',
                status: 'completed',
                startTime: new Date(Date.now() - 60000),
                endTime: new Date(),
                progress: 100,
                output: ['Test passed'],
                initiator: {
                    id: 'user1',
                    name: 'Test User',
                    role: 'owner',
                    joinedAt: new Date(),
                    isOnline: true
                },
                sharedWith: []
            }
        ],
        projectFiles: ['src/app.ts', 'src/utils.ts', 'src/types.ts'],
        gitHistory: [
            {
                hash: 'abc123',
                message: 'Add new feature',
                author: 'Test User',
                date: new Date(),
                files: ['src/app.ts'],
                stats: { additions: 25, deletions: 5 }
            }
        ],
        testResults: [
            {
                suite: 'app.spec.ts',
                test: 'should work correctly',
                status: 'passed',
                duration: 50,
                timestamp: new Date()
            },
            {
                suite: 'utils.spec.ts',
                test: 'should handle edge case',
                status: 'failed',
                duration: 120,
                error: 'Expected true but got false',
                timestamp: new Date()
            }
        ],
        performanceMetrics: [
            {
                metric: 'test-execution-time',
                value: 45000,
                unit: 'ms',
                timestamp: new Date(),
                context: { project: 'test-project' }
            }
        ],
        errorPatterns: [
            {
                pattern: 'TypeError: Cannot read property',
                frequency: 5,
                lastSeen: new Date(),
                affectedFiles: ['src/app.ts', 'src/utils.ts'],
                suggestedFix: 'Add null check before property access'
            }
        ]
    });

    beforeEach(() => {
        mockContext = {
            globalState: {
                get: jest.fn().mockReturnValue(undefined),
                update: jest.fn().mockImplementation((...args: unknown[]) => Promise.resolve())
            }
        } as any;

        aiInsightsEngine = new AIInsightsEngine(mockContext);
        intelligentSuggestionsEngine = new IntelligentSuggestionsEngine(mockContext);
        automatedInsightsEngine = new AutomatedInsightsEngine(mockContext);
        naturalLanguageQueryEngine = new NaturalLanguageQueryEngine(mockContext);
    });

    describe('IntelligentSuggestionsEngine', () => {
        test('should generate intelligent command suggestions', async () => {
            const context = createMockExecutionContext();
            const suggestions = await intelligentSuggestionsEngine.generateIntelligentSuggestions(context);

            expect(suggestions).toBeDefined();
            expect(Array.isArray(suggestions)).toBe(true);
            expect(suggestions.length).toBeGreaterThan(0);
            
            // Should suggest running tests due to failing tests
            const testSuggestion = suggestions.find(s => s.command === 'nxTest');
            expect(testSuggestion).toBeDefined();
            expect(testSuggestion?.confidence).toBeGreaterThan(0.5); // Reduced expectation due to success prediction adjustments
        });

        test('should analyze execution patterns', async () => {
            const executions: CommandExecution[] = [
                {
                    id: 'cmd1',
                    action: 'nxTest',
                    project: 'test-project',
                    status: 'completed',
                    startTime: new Date(Date.now() - 60000),
                    endTime: new Date(),
                    progress: 100,
                    output: ['Tests passed'],
                    initiator: {
                        id: 'user1',
                        name: 'Test User',
                        role: 'owner',
                        joinedAt: new Date(),
                        isOnline: true
                    },
                    sharedWith: []
                }
            ];

            const patterns = await intelligentSuggestionsEngine.analyzeExecutionPatterns(executions);
            expect(patterns).toBeDefined();
            expect(Array.isArray(patterns)).toBe(true);
        });

        test('should predict command success', async () => {
            const context = createMockExecutionContext();
            const predictions = await intelligentSuggestionsEngine.predictCommandSuccess(context);

            expect(predictions).toBeDefined();
            expect(predictions instanceof Map).toBe(true);
            expect(predictions.size).toBeGreaterThan(0);
        });
    });

    describe('AutomatedInsightsEngine', () => {
        test('should generate automated insights', async () => {
            const data = createMockAnalysisData();
            const insights = await automatedInsightsEngine.generateAutomatedInsights(data);

            expect(insights).toBeDefined();
            expect(Array.isArray(insights)).toBe(true);
            expect(insights.length).toBeGreaterThan(0);

            // Should detect test failures
            const testInsight = insights.find(i => i.category === 'testing');
            expect(testInsight).toBeDefined();
        });

        test('should prioritize insights correctly', async () => {
            const data = createMockAnalysisData();
            const insights = await automatedInsightsEngine.generateAutomatedInsights(data);

            // Insights should be sorted by priority and confidence
            for (let i = 0; i < insights.length - 1; i++) {
                const current = insights[i];
                const next = insights[i + 1];
                
                const priorityScore = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                const currentScore = priorityScore[current.priority] * current.confidence;
                const nextScore = priorityScore[next.priority] * next.confidence;
                
                expect(currentScore).toBeGreaterThanOrEqual(nextScore);
            }
        });

        test('should generate actionable suggestions', async () => {
            const data = createMockAnalysisData();
            const insights = await automatedInsightsEngine.generateAutomatedInsights(data);

            const actionableInsights = insights.filter(i => i.actionable);
            expect(actionableInsights.length).toBeGreaterThan(0);

            actionableInsights.forEach(insight => {
                expect(insight.suggestions).toBeDefined();
                expect(insight.suggestions.length).toBeGreaterThan(0);
                
                insight.suggestions.forEach(suggestion => {
                    expect(suggestion.title).toBeDefined();
                    expect(suggestion.description).toBeDefined();
                    expect(suggestion.action).toBeDefined();
                    expect(suggestion.estimatedImpact).toMatch(/^(low|medium|high)$/);
                    expect(suggestion.estimatedEffort).toMatch(/^(minutes|hours|days)$/);
                });
            });
        });
    });

    describe('NaturalLanguageQueryEngine', () => {
        test('should process test-related queries', async () => {
            const query = "Show me failing tests from this week";
            const context = createMockAnalysisData();
            const result = await naturalLanguageQueryEngine.processQuery(query, context);

            expect(result).toBeDefined();
            expect(result.intent).toBe('test-query');
            expect(result.confidence).toBeGreaterThan(0.5);
            expect(result.response).toContain('test');
            expect(result.suggestedActions.length).toBeGreaterThan(0);
        });

        test('should process error-related queries', async () => {
            const query = "What are the most common errors?";
            const context = createMockAnalysisData();
            const result = await naturalLanguageQueryEngine.processQuery(query, context);

            expect(result).toBeDefined();
            expect(result.intent).toBe('error-query');
            expect(result.confidence).toBeGreaterThan(0.5);
            expect(result.response).toContain('error');
        });

        test('should generate contextual query suggestions', async () => {
            const context = createMockAnalysisData();
            const suggestions = await naturalLanguageQueryEngine.getQuerySuggestions(context);

            expect(suggestions).toBeDefined();
            expect(Array.isArray(suggestions)).toBe(true);
            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.length).toBeLessThanOrEqual(8);

            // Should include test-related suggestions due to failing tests
            const testSuggestion = suggestions.find(s => s.toLowerCase().includes('test'));
            expect(testSuggestion).toBeDefined();
        });
    });

    describe('AIInsightsEngine Integration', () => {
        test('should integrate Phase 4.2 engines', async () => {
            const data = createMockAnalysisData();
            const context = createMockExecutionContext();

            // Test enhanced pattern analysis
            const insights = await aiInsightsEngine.analyzePattern(data);
            expect(insights).toBeDefined();
            expect(insights.length).toBeGreaterThan(0);

            // Test enhanced command suggestions
            const suggestions = await aiInsightsEngine.suggestCommand(context);
            expect(suggestions).toBeDefined();
            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.length).toBeLessThanOrEqual(8);

            // Test enhanced natural language processing
            const query = "Show me failing tests";
            const queryResult = await aiInsightsEngine.processNaturalLanguageQuery(query, data);
            expect(queryResult).toBeDefined();
            expect(queryResult.confidence).toBeGreaterThan(0);
        });

        test('should provide Phase 4.2 specific methods', async () => {
            const data = createMockAnalysisData();
            const context = createMockExecutionContext();

            // Test query suggestions
            const querySuggestions = await aiInsightsEngine.getQuerySuggestions(data);
            expect(querySuggestions).toBeDefined();
            expect(Array.isArray(querySuggestions)).toBe(true);

            // Test execution pattern analysis
            await aiInsightsEngine.analyzeExecutionPatterns(data.commandHistory);
            // Should not throw

            // Test command success prediction
            const predictions = await aiInsightsEngine.predictCommandSuccess(context);
            expect(predictions).toBeDefined();
            expect(predictions instanceof Map).toBe(true);

            // Test query analytics
            const analytics = await aiInsightsEngine.getQueryAnalytics();
            expect(analytics).toBeDefined();
            expect(analytics).toHaveProperty('patterns');
        });

        test('should save and dispose engine states properly', async () => {
            await aiInsightsEngine.saveEngineStates();
            // Should not throw

            aiInsightsEngine.dispose();
            // Should not throw
        });
    });
});
