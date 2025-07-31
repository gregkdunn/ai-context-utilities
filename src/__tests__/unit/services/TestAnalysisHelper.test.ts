/**
 * Unit tests for TestAnalysisHelper service
 * Tests pattern-based test failure analysis and suggestion generation
 */

import { TestAnalysisHelper, PatternAnalysis, TestSuggestion } from '../../../services/TestAnalysisHelper';
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

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        showInformationMessage: jest.fn()
    },
    env: {
        clipboard: {
            writeText: jest.fn()
        }
    }
}));

describe('TestAnalysisHelper', () => {
    let assistant: TestAnalysisHelper;
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

        assistant = new TestAnalysisHelper(
            mockTestIntelligence,
            workspaceRoot,
            mockOutputChannel
        );

        jest.clearAllMocks();
    });

    describe('analyze', () => {

        test('should analyze test failure and return pattern analysis', async () => {
            const analysis = await assistant.analyze(mockFailure, 'test output');

            expect(analysis).toBeDefined();
            expect(analysis.summary).toBeTruthy();
            expect(analysis.rootCause).toBeTruthy();
            expect(analysis.suggestedFix).toBeTruthy();
            expect(analysis.codeChanges).toBeDefined();
        });

        test('should cache analysis results', async () => {
            const analysis1 = await assistant.analyze(mockFailure, 'test output');
            const analysis2 = await assistant.analyze(mockFailure, 'test output');

            // Should return cached result
            expect(analysis1).toBe(analysis2);
        });

        test('should handle null/undefined errors gracefully', async () => {
            const failureWithNullError: TestFailure = {
                ...mockFailure,
                error: null as any
            };

            const analysis = await assistant.analyze(failureWithNullError, 'test output');

            expect(analysis).toBeDefined();
            expect(analysis.summary).toContain('Test failure:');
        });

        test('should provide code change suggestions for common patterns', async () => {
            const typeErrorFailure: TestFailure = {
                ...mockFailure,
                error: 'TypeError: Cannot read property \'length\' of undefined'
            };

            const analysis = await assistant.analyze(typeErrorFailure, 'test output');

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

        test('should handle analysis gracefully', async () => {
            const analysis = await assistant.analyze(mockFailure, 'test output');

            expect(analysis).toBeDefined();
            expect(analysis.summary).toBeTruthy();
            expect(typeof analysis.summary).toBe('string');
        });
    });

    describe('generateSuggestions', () => {
        const testFiles = [
            'src/component.spec.ts',
            'src/service.spec.ts'
        ];

        test('should generate test suggestions for coverage gaps', async () => {
            const suggestions = await assistant.generateSuggestions(
                'test-file.spec.ts',
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
            const suggestions = await assistant.generateSuggestions(
                'test-file.spec.ts',
                testFiles
            );

            // Should include improvement suggestions from analyzeTestQuality
            const improveTestSuggestion = suggestions.find(
                s => s.type === 'improve_test'
            );
            expect(improveTestSuggestion).toBeDefined();
            expect(improveTestSuggestion!.priority).toBe('low');
        });

        test('should suggest removing obsolete tests', async () => {
            const suggestions = await assistant.generateSuggestions(
                'test-file.spec.ts',
                testFiles
            );

            const removeTestSuggestion = suggestions.find(s => s.type === 'remove_test');
            if (removeTestSuggestion) {
                expect(removeTestSuggestion.reason).toBeTruthy();
                expect(removeTestSuggestion.priority).toBeTruthy();
            }
        });

        test('should handle empty test files array', async () => {
            const suggestions = await assistant.generateSuggestions(
                'test-file.spec.ts',
                []
            );

            expect(suggestions).toBeDefined();
            expect(Array.isArray(suggestions)).toBe(true);
            // Should still provide some suggestions based on templates
        });
    });

    describe('parseErrorMessage', () => {
        test('should parse TypeError correctly', () => {
            const result = assistant.parseErrorMessage('TypeError: Cannot read property');
            expect(result.type).toBe('Type Error');
            expect(result.details).toBe('Property access on null/undefined');
        });

        test('should parse ReferenceError correctly', () => {
            const result = assistant.parseErrorMessage('ReferenceError: variable is not defined');
            expect(result.type).toBe('Reference Error');
            expect(result.details).toBe('variable is not defined');
        });

        test('should parse AssertionError correctly', () => {
            const result = assistant.parseErrorMessage('AssertionError: Expected true but got false');
            expect(result.type).toBe('Assertion Error');
            expect(result.details).toBe('Expected true but got false');
        });

        test('should handle unknown errors', () => {
            const result = assistant.parseErrorMessage('Some unknown error');
            expect(result.type).toBe('General Error');
            expect(result.details).toBe('Some unknown error');
        });
    });

    describe('copyToClipboard', () => {
        test('should copy analysis to clipboard', async () => {
            const analysis: PatternAnalysis = {
                summary: 'Test summary',
                rootCause: 'Root cause',
                suggestedFix: 'Suggested fix',
                codeChanges: [{
                    file: 'test.spec.ts',
                    line: 10,
                    original: 'old code',
                    suggested: 'new code',
                    explanation: 'explanation'
                }]
            };

            await assistant.copyToClipboard(analysis);

            expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining('## Test Analysis Results')
            );
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'Analysis copied to clipboard'
            );
        });
    });
});