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
    
    const mockFailure: TestFailure = {
        test: 'Component should render',
        suite: 'Component Tests',
        error: 'Cannot read property \'name\' of undefined',
        file: 'src/component.spec.ts',
        line: 42
    };

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

        test('should analyze test failure and return AI analysis', async () => {
            mockTestIntelligence.getTestInsights.mockImplementation(() => ({
                testId: 'test-1',
                patterns: [],
                averageDuration: 100,
                failureRate: 0.3,
                lastFailures: [],
                correlatedTests: [],
                recommendedAction: 'fix'
            }));

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

            // Should return cached result
            expect(analysis1).toBe(analysis2);
        });

        test('should handle null/undefined errors gracefully', async () => {
            const failureWithNullError: TestFailure = {
                ...mockFailure,
                error: null as any
            };

            const analysis = await assistant.analyzeFailure(failureWithNullError);

            expect(analysis).toBeDefined();
            expect(analysis.summary).toContain('Test failure detected');
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
            // Mock the performAnalysis method to throw an error
            const originalMethod = assistant['performAnalysis'];
            assistant['performAnalysis'] = jest.fn().mockRejectedValue(new Error('AI service unavailable'));

            const analysis = await assistant.analyzeFailure(mockFailure);

            expect(analysis).toBeDefined();
            expect(analysis.summary).toBeTruthy();
            expect(analysis.confidence).toBe(0.3);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('❌ AI analysis failed')
            );

            // Restore original method
            assistant['performAnalysis'] = originalMethod;
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
            const suggestions = await assistant.getTestSuggestions(
                projectName,
                testFiles
            );

            // Should include improvement suggestions from analyzeTestQuality
            const improveTestSuggestion = suggestions.find(
                s => s.type === 'improve_test'
            );
            expect(improveTestSuggestion).toBeDefined();
            expect(improveTestSuggestion!.priority).toBe('medium');
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

    describe('generateFix', () => {
        test('should generate fix for test failure with code changes', async () => {
            const analysis = {
                summary: 'Test summary',
                rootCause: 'Root cause', 
                suggestedFix: 'Suggested fix',
                confidence: 0.8,
                codeChanges: [{
                    file: 'test.spec.ts',
                    line: 10,
                    original: 'old code',
                    suggested: 'new code',
                    explanation: 'explanation'
                }]
            };

            const fix = await assistant.generateFix(mockFailure, analysis);

            expect(fix).toBeDefined();
            expect(typeof fix).toBe('string');
        });

        test('should return null when no code changes available', async () => {
            const analysis = {
                summary: 'Test summary',
                rootCause: 'Root cause',
                suggestedFix: 'Suggested fix', 
                confidence: 0.8
            };

            const fix = await assistant.generateFix(mockFailure, analysis);

            expect(fix).toBeNull();
        });
    });

});