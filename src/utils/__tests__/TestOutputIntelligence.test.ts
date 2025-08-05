/**
 * Unit tests for TestOutputIntelligence
 */

import { TestOutputIntelligence } from '../TestOutputIntelligence';
import { TestSummary } from '../testResultParser';

describe('TestOutputIntelligence', () => {
    let mockTestSummary: TestSummary;

    beforeEach(() => {
        mockTestSummary = {
            project: 'test-project',
            passed: 5,
            failed: 2,
            skipped: 1,
            total: 8,
            duration: 2000,
            success: false,
            failures: [
                {
                    test: 'should handle user input',
                    suite: 'UserInputTests',
                    error: 'TypeError: Cannot read property of undefined',
                    file: 'src/test.spec.ts',
                    line: 25
                },
                {
                    test: 'should validate data',
                    suite: 'ValidationTests', 
                    error: 'ReferenceError: variable is not defined',
                    file: 'src/validation.spec.ts',
                    line: 10
                }
            ]
        };
    });

    describe('analyzeTestOutput', () => {
        it('should analyze test output and return insights', () => {
            const result = TestOutputIntelligence.analyzeTestOutput('test output', mockTestSummary);

            expect(result).toBeDefined();
            expect(result.failures).toBeInstanceOf(Array);
            expect(result.performance).toBeDefined();
            expect(result.trends).toBeDefined();
            expect(result.overallHealth).toBeDefined();
            expect(result.overallHealth.score).toBeGreaterThanOrEqual(0);
            expect(result.overallHealth.score).toBeLessThanOrEqual(100);
        });

        it('should handle empty test output', () => {
            const result = TestOutputIntelligence.analyzeTestOutput('', {
                ...mockTestSummary,
                failures: []
            });

            expect(result.failures).toHaveLength(0);
            expect(result.overallHealth.score).toBeGreaterThan(50);
        });
    });

    describe('formatAnalysisForDisplay', () => {
        it('should format analysis for display', () => {
            const analysis = TestOutputIntelligence.analyzeTestOutput('test output', mockTestSummary);
            const formatted = TestOutputIntelligence.formatAnalysisForDisplay(analysis);

            expect(formatted).toContain('INTELLIGENT TEST ANALYSIS');
            expect(formatted).toContain('Overall Health');
        });
    });
});

describe('Static methods', () => {
    const simpleMockSummary = {
        project: 'test-project',
        passed: 5,
        failed: 2,
        skipped: 1,
        total: 8,
        duration: 2000,
        success: false,
        failures: [
            {
                test: 'should handle user input',
                suite: 'UserInputTests',
                error: 'TypeError: Cannot read property of undefined',
                file: 'src/test.spec.ts',
                line: 25
            }
        ]
    };

    describe('analyzeTestOutput', () => {
        it('should analyze test output', () => {
            const analysis = TestOutputIntelligence.analyzeTestOutput('test output', simpleMockSummary);

            expect(analysis).toBeDefined();
            expect(analysis.failures).toBeInstanceOf(Array);
        });
    });

    describe('formatAnalysisForDisplay', () => {
        it('should format analysis for display', () => {
            const analysis = TestOutputIntelligence.analyzeTestOutput('test output', simpleMockSummary);
            const formatted = TestOutputIntelligence.formatAnalysisForDisplay(analysis);

            expect(formatted).toContain('INTELLIGENT TEST ANALYSIS');
            expect(formatted).toContain('Overall Health');
        });
    });
});


