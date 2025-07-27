/**
 * Unit tests for AITestAssistant service
 * Tests AI-powered test failure analysis and suggestion generation
 */

import { AITestAssistant, AIAnalysis, TestSuggestion } from '../../../services/AITestAssistant';
import { TestIntelligenceEngine } from '../../../core/TestIntelligenceEngine';
import { TestFailure } from '../../../utils/testResultParser';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('../../../core/TestIntelligenceEngine');
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        stat: jest.fn()
    }
}));

describe('AITestAssistant', () => {
    let assistant: AITestAssistant;
    let mockTestIntelligence: jest.Mocked<TestIntelligenceEngine>;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;
    const workspaceRoot = '/test/workspace';

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
            generateReport: jest.fn()
        } as any;

        mockOutputChannel = {
            appendLine: jest.fn(),
            append: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn()
        } as any;

        assistant = new AITestAssistant(
            mockTestIntelligence,
            workspaceRoot,
            mockOutputChannel
        );

        jest.clearAllMocks();
    });

    describe('analyzeFailure', () => {
        const mockFailure: TestFailure = {
            test: 'Component should render',
            suite: 'Component Tests',
            error: 'Cannot read property \'name\' of undefined',
            file: 'src/component.spec.ts',
            line: 42
        };

        test('should analyze test failure and return AI analysis', async () => {
            mockTestIntelligence.getTestInsights.mockResolvedValue({
                failureCount: 3,
                lastFailure: new Date(),
                commonErrors: ['Cannot read property'],
                fixPatterns: ['Check null/undefined'],
                averageFixTime: 300000
            });

            const analysis = await assistant.analyzeFailure(mockFailure);

            expect(analysis).toBeDefined();
            expect(analysis.summary).toBeTruthy();
            expect(analysis.rootCause).toBeTruthy();
            expect(analysis.suggestedFix).toBeTruthy();
            expect(analysis.confidence).toBeGreaterThan(0);
            expect(analysis.confidence).toBeLessThanOrEqual(1);
        });

        test('should cache analysis results', async () => {
            const analysis1 = await assistant.analyzeFailure(mockFailure);
            const analysis2 = await assistant.analyzeFailure(mockFailure);

            // Should return cached result without calling getTestInsights again
            expect(mockTestIntelligence.getTestInsights).toHaveBeenCalledTimes(1);
            expect(analysis1).toBe(analysis2);
        });

        test('should handle null/undefined errors gracefully', async () => {
            const failureWithNullError: TestFailure = {
                ...mockFailure,
                error: null as any
            };

            const analysis = await assistant.analyzeFailure(failureWithNullError);

            expect(analysis).toBeDefined();
            expect(analysis.summary).toContain('unknown error');
            expect(mockOutputChannel.appendLine).not.toHaveBeenCalledWith(
                expect.stringContaining('❌')
            );
        });

        test('should provide code change suggestions for common patterns', async () => {
            const typeErrorFailure: TestFailure = {
                ...mockFailure,
                error: 'TypeError: Cannot read property \'length\' of undefined'
            };

            const analysis = await assistant.analyzeFailure(typeErrorFailure);

            expect(analysis.codeChanges).toBeDefined();
            expect(analysis.codeChanges!.length).toBeGreaterThan(0);
            expect(analysis.codeChanges![0]).toMatchObject({
                file: expect.any(String),
                line: expect.any(Number),
                original: expect.any(String),
                suggested: expect.any(String),
                explanation: expect.any(String)
            });
        });

        test('should return fallback analysis on error', async () => {
            mockTestIntelligence.getTestInsights.mockRejectedValue(
                new Error('AI service unavailable')
            );

            const analysis = await assistant.analyzeFailure(mockFailure);

            expect(analysis).toBeDefined();
            expect(analysis.summary).toBeTruthy();
            expect(analysis.confidence).toBeLessThan(0.5);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('❌ AI analysis failed')
            );
        });
    });

    describe('getTestSuggestions', () => {
        const projectName = 'test-project';
        const testFiles = [
            'src/component.spec.ts',
            'src/service.spec.ts'
        ];

        test('should generate test suggestions for coverage gaps', async () => {
            const suggestions = await assistant.getTestSuggestions(
                projectName,
                testFiles
            );

            expect(suggestions).toBeDefined();
            expect(Array.isArray(suggestions)).toBe(true);
            expect(suggestions.length).toBeGreaterThan(0);

            const newTestSuggestion = suggestions.find(s => s.type === 'new_test');
            expect(newTestSuggestion).toBeDefined();
            expect(newTestSuggestion!).toMatchObject({
                type: 'new_test',
                testName: expect.any(String),
                reason: expect.any(String),
                priority: expect.stringMatching(/high|medium|low/)
            });
        });

        test('should suggest test improvements for flaky tests', async () => {
            mockTestIntelligence.getTestInsights.mockResolvedValue({
                failureCount: 10,
                lastFailure: new Date(),
                commonErrors: ['Timeout'],
                fixPatterns: ['Increase timeout'],
                averageFixTime: 600000,
                flaky: true
            });

            const suggestions = await assistant.getTestSuggestions(
                projectName,
                testFiles
            );

            const improveTestSuggestion = suggestions.find(
                s => s.type === 'improve_test' && s.reason.includes('flaky')
            );
            expect(improveTestSuggestion).toBeDefined();
            expect(improveTestSuggestion!.priority).toBe('high');
        });

        test('should suggest removing obsolete tests', async () => {
            const suggestions = await assistant.getTestSuggestions(
                projectName,
                testFiles
            );

            const removeTestSuggestion = suggestions.find(s => s.type === 'remove_test');
            if (removeTestSuggestion) {
                expect(removeTestSuggestion.reason).toBeTruthy();
                expect(removeTestSuggestion.priority).toBeTruthy();
            }
        });

        test('should handle empty test files array', async () => {
            const suggestions = await assistant.getTestSuggestions(
                projectName,
                []
            );

            expect(suggestions).toBeDefined();
            expect(Array.isArray(suggestions)).toBe(true);
            // Should still provide some suggestions based on project analysis
        });
    });

    describe('suggestFix', () => {
        test('should suggest fixes for common error patterns', async () => {
            const error = 'Cannot find module \'@/components/Button\'';
            const file = 'src/test.spec.ts';

            const fix = await assistant.suggestFix(error, file);

            expect(fix).toBeDefined();
            expect(fix.description).toBeTruthy();
            expect(fix.steps).toBeDefined();
            expect(fix.steps.length).toBeGreaterThan(0);
            expect(fix.confidence).toBeGreaterThan(0);
        });

        test('should provide high confidence fixes for well-known patterns', async () => {
            const error = 'ReferenceError: jest is not defined';
            const file = 'src/test.spec.ts';

            const fix = await assistant.suggestFix(error, file);

            expect(fix.confidence).toBeGreaterThan(0.8);
            expect(fix.codeSnippet).toBeTruthy();
            expect(fix.steps).toContain(expect.stringContaining('jest'));
        });

        test('should handle syntax errors', async () => {
            const error = 'SyntaxError: Unexpected token \'}\'';
            const file = 'src/component.spec.ts';

            const fix = await assistant.suggestFix(error, file);

            expect(fix.description).toContain('syntax');
            expect(fix.steps).toContain(expect.stringContaining('Check'));
        });
    });

    describe('generateTestCode', () => {
        test('should generate test code for untested functions', async () => {
            const functionName = 'calculateTotal';
            const filePath = 'src/utils/calculator.ts';

            const testCode = await assistant.generateTestCode(
                functionName,
                filePath,
                'jest'
            );

            expect(testCode).toBeDefined();
            expect(testCode).toContain('describe');
            expect(testCode).toContain(functionName);
            expect(testCode).toContain('expect');
            expect(testCode).toContain('test');
        });

        test('should support different test frameworks', async () => {
            const functionName = 'validateEmail';
            const filePath = 'src/validators.ts';

            const mochaCode = await assistant.generateTestCode(
                functionName,
                filePath,
                'mocha'
            );

            expect(mochaCode).toContain('describe');
            expect(mochaCode).toContain('it(');
            expect(mochaCode).not.toContain('test(');
        });
    });

    describe('analyzeCopilotResponse', () => {
        test('should parse and enhance Copilot suggestions', async () => {
            const copilotResponse = `
                The test is failing because the component expects a 'user' prop.
                You should provide this prop in your test setup.
            `;

            const enhanced = await assistant.analyzeCopilotResponse(
                copilotResponse,
                { test: 'Component test', error: 'Missing required prop' } as TestFailure
            );

            expect(enhanced).toBeDefined();
            expect(enhanced.actionable).toBe(true);
            expect(enhanced.codeExample).toBeTruthy();
            expect(enhanced.confidence).toBeGreaterThan(0);
        });

        test('should handle empty or invalid Copilot responses', async () => {
            const enhanced = await assistant.analyzeCopilotResponse(
                '',
                { test: 'Test', error: 'Error' } as TestFailure
            );

            expect(enhanced.actionable).toBe(false);
            expect(enhanced.confidence).toBe(0);
        });
    });

    describe('learnFromFix', () => {
        test('should record successful fixes for future reference', async () => {
            const failure: TestFailure = {
                test: 'API test',
                suite: 'API Suite',
                error: 'Network error',
                file: 'api.spec.ts',
                line: 10
            };

            const fix = {
                description: 'Mock the API call',
                code: 'jest.mock(\'./api\')',
                timeToFix: 300000
            };

            await assistant.learnFromFix(failure, fix);

            expect(mockTestIntelligence.recordFailure).toHaveBeenCalledWith(
                expect.objectContaining({
                    pattern: expect.any(String),
                    solution: expect.any(String)
                })
            );
        });
    });

    describe('getFailureContext', () => {
        test('should gather comprehensive context for failure analysis', async () => {
            const failure: TestFailure = {
                test: 'Integration test',
                suite: 'Integration Suite',
                error: 'Connection refused',
                file: 'integration.spec.ts',
                line: 25
            };

            const context = await assistant['buildFailureContext'](failure);

            expect(context).toBeDefined();
            expect(context.relatedFiles).toBeDefined();
            expect(context.recentChanges).toBeDefined();
            expect(context.testHistory).toBeDefined();
            expect(context.dependencies).toBeDefined();
        });
    });
});