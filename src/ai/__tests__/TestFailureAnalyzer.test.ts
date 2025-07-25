/**
 * Unit tests for TestFailureAnalyzer
 * 
 * Tests parsing of Jest output, error pattern matching, AI context generation,
 * and failure analysis functionality.
 * 
 * @version 3.0.0
 */

import { TestFailureAnalyzer, TestFailure, TestResultSummary } from '../TestFailureAnalyzer';

describe('TestFailureAnalyzer', () => {
    let analyzer: TestFailureAnalyzer;

    beforeEach(() => {
        analyzer = new TestFailureAnalyzer();
    });

    describe('parseJestOutput', () => {
        it('should parse basic Jest JSON output', () => {
            const jestOutput = JSON.stringify({
                numTotalTests: 10,
                numPassedTests: 8,
                numFailedTests: 2,
                numPendingTests: 0,
                testResults: [
                    {
                        name: '/path/to/test.spec.ts',
                        status: 'failed',
                        assertionResults: [
                            {
                                title: 'should work correctly',
                                status: 'failed',
                                failureMessages: ['Expected true but received false']
                            }
                        ]
                    }
                ]
            });

            const result = analyzer.parseJestOutput(jestOutput);

            expect(result).toEqual({
                totalTests: 10,
                passedTests: 8,
                failedTests: 2,
                skippedTests: 0,
                failures: expect.any(Array),
                duration: 0,
                timestamp: expect.any(Date)
            });
            expect(result.failures).toHaveLength(1);
            expect(result.failures[0].testName).toBe('should work correctly');
        });

        it('should handle empty Jest output', () => {
            const jestOutput = JSON.stringify({
                numTotalTests: 0,
                numPassedTests: 0,
                numFailedTests: 0,
                numPendingTests: 0,
                testResults: []
            });

            const result = analyzer.parseJestOutput(jestOutput);

            expect(result.failures).toHaveLength(0);
            expect(result.totalTests).toBe(0);
        });

        it('should throw error for invalid JSON', () => {
            const invalidJson = 'not valid json';

            expect(() => analyzer.parseJestOutput(invalidJson)).toThrow('Failed to parse Jest output');
        });

        it('should handle Jest output with duration', () => {
            const jestOutput = JSON.stringify({
                numTotalTests: 5,
                numPassedTests: 5,
                numFailedTests: 0,
                startTime: 1000,
                endTime: 2500,
                testResults: []
            });

            const result = analyzer.parseJestOutput(jestOutput);

            expect(result.duration).toBe(1500);
        });
    });

    describe('parseTextOutput', () => {
        it('should parse text test output with failures', () => {
            const textOutput = `
                ✕ should handle user input
                Error: Expected 'hello' but received 'world'
                  at test.spec.ts:15:20
                  at TestRunner.run:42:10
                
                ✕ should validate email
                TypeError: Cannot read property 'length' of undefined
                  at validator.ts:8:5
            `;

            const failures = analyzer.parseTextOutput(textOutput, 'test.spec.ts');

            expect(failures).toHaveLength(2);
            expect(failures[0].testName).toBe('should handle user input');
            expect(failures[0].errorMessage).toBe("Expected 'hello' but received 'world'");
            expect(failures[1].testName).toBe('should validate email');
            expect(failures[1].errorMessage).toBe("Cannot read property 'length' of undefined");
        });

        it('should handle empty text output', () => {
            const failures = analyzer.parseTextOutput('', 'test.spec.ts');
            expect(failures).toHaveLength(0);
        });

        it('should parse stack traces correctly', () => {
            const textOutput = `
                ✕ test with stack trace
                Error: Something went wrong
                  at function1 (file1.ts:10:5)
                  at function2 (file2.ts:20:10)
                  at function3 (file3.ts:30:15)
            `;

            const failures = analyzer.parseTextOutput(textOutput, 'test.spec.ts');

            expect(failures[0].stackTrace).toHaveLength(3);
            expect(failures[0].stackTrace[0]).toBe('at function1 (file1.ts:10:5)');
        });
    });

    describe('analyzeFailure', () => {
        it('should identify assertion mismatch errors', () => {
            const failure: TestFailure = {
                testName: 'test assertion',
                testFile: 'test.spec.ts',
                errorMessage: 'expect(received).toEqual(expected)',
                errorType: 'unknown',
                stackTrace: []
            };

            const analyzed = analyzer.analyzeFailure(failure);

            expect(analyzed.errorType).toBe('assertion_mismatch');
            expect(analyzed.suggestion).toContain('Check the expected vs actual values');
        });

        it('should identify null reference errors', () => {
            const failure: TestFailure = {
                testName: 'null test',
                testFile: 'test.spec.ts',
                errorMessage: 'Cannot read property \'name\' of undefined',
                errorType: 'unknown',
                stackTrace: []
            };

            const analyzed = analyzer.analyzeFailure(failure);

            expect(analyzed.errorType).toBe('null_reference');
            expect(analyzed.suggestion).toContain('Add null checks');
        });

        it('should identify missing import errors', () => {
            const failure: TestFailure = {
                testName: 'import test',
                testFile: 'test.spec.ts',
                errorMessage: 'Module \'./missing-module\' not found',
                errorType: 'unknown',
                stackTrace: []
            };

            const analyzed = analyzer.analyzeFailure(failure);

            expect(analyzed.errorType).toBe('missing_import');
            expect(analyzed.suggestion).toContain('Check the import path');
        });

        it('should identify timeout errors', () => {
            const failure: TestFailure = {
                testName: 'timeout test',
                testFile: 'test.spec.ts',
                errorMessage: 'Timeout of 5000ms exceeded',
                errorType: 'unknown',
                stackTrace: []
            };

            const analyzed = analyzer.analyzeFailure(failure);

            expect(analyzed.errorType).toBe('test_timeout');
            expect(analyzed.suggestion).toContain('Increase test timeout');
        });

        it('should handle unknown error types', () => {
            const failure: TestFailure = {
                testName: 'unknown test',
                testFile: 'test.spec.ts',
                errorMessage: 'Some unknown error message',
                errorType: 'unknown',
                stackTrace: []
            };

            const analyzed = analyzer.analyzeFailure(failure);

            expect(analyzed.errorType).toBe('unknown');
            expect(analyzed.suggestion).toContain('Review the error message');
        });
    });

    describe('generateAIContext', () => {
        it('should generate comprehensive AI context', () => {
            const failure: TestFailure = {
                testName: 'test context generation',
                testFile: 'context.spec.ts',
                errorMessage: 'Test failed for context',
                errorType: 'assertion_mismatch',
                stackTrace: ['at line 1', 'at line 2'],
                suggestion: 'Fix the assertion'
            };

            const context = analyzer.generateAIContext(failure, 'const x = 1;');

            expect(context).toContain('# Test Failure Analysis');
            expect(context).toContain('test context generation');
            expect(context).toContain('context.spec.ts');
            expect(context).toContain('Test failed for context');
            expect(context).toContain('at line 1');
            expect(context).toContain('Fix the assertion');
            expect(context).toContain('const x = 1;');
            expect(context).toContain('Please analyze this test failure');
        });

        it('should generate context without source code', () => {
            const failure: TestFailure = {
                testName: 'test without source',
                testFile: 'test.spec.ts',
                errorMessage: 'Error message',
                errorType: 'unknown',
                stackTrace: []
            };

            const context = analyzer.generateAIContext(failure);

            expect(context).toContain('test without source');
            expect(context).not.toContain('Source Code Context');
        });
    });

    describe('extractSourceLocation', () => {
        it('should extract location from standard stack trace', () => {
            const stackTrace = [
                'at Object.<anonymous> (/path/to/file.ts:42:15)',
                'at Module._compile (module.js:652:30)'
            ];

            const location = analyzer.extractSourceLocation(stackTrace);

            expect(location.file).toMatch(/\/path\/to\/file\.ts$/);
            expect(location.line).toBe(42);
            expect(location.column).toBe(15);
        });

        it('should extract location from alternative stack trace format', () => {
            const stackTrace = [
                'at /path/to/source.ts:100:5',
                'at other location'
            ];

            const location = analyzer.extractSourceLocation(stackTrace);

            expect(location.file).toMatch(/\/path\/to\/source\.ts$/);
            expect(location.line).toBe(100);
            expect(location.column).toBe(5);
        });

        it('should ignore test files and node_modules', () => {
            const stackTrace = [
                'at /node_modules/jest/lib/jest.js:10:5',
                'at /path/to/test.spec.ts:20:10',
                'at /path/to/source.ts:30:15'
            ];

            const location = analyzer.extractSourceLocation(stackTrace);

            expect(location.file).toMatch(/\/path\/to\/source\.ts$/);
            expect(location.line).toBe(30);
        });

        it('should return empty object for no valid locations', () => {
            const stackTrace = [
                'at /node_modules/something.js:1:1',
                'at test.spec.ts:2:2'
            ];

            const location = analyzer.extractSourceLocation(stackTrace);

            expect(location).toEqual({});
        });
    });

    describe('groupFailuresByType', () => {
        it('should group failures by error type', () => {
            const failures: TestFailure[] = [
                {
                    testName: 'test1',
                    testFile: 'test.spec.ts',
                    errorMessage: 'expect(received).toEqual(expected)',
                    errorType: 'unknown',
                    stackTrace: []
                },
                {
                    testName: 'test2',
                    testFile: 'test.spec.ts',
                    errorMessage: 'Cannot read property of undefined',
                    errorType: 'unknown',
                    stackTrace: []
                },
                {
                    testName: 'test3',
                    testFile: 'test.spec.ts',
                    errorMessage: 'expect(value).toEqual(expected) but received different',
                    errorType: 'unknown',
                    stackTrace: []
                }
            ];

            // Analyze failures first to get proper error types
            const analyzedFailures = failures.map(f => analyzer.analyzeFailure(f));
            const groups = analyzer.groupFailuresByType(analyzedFailures);

            expect(groups.size).toBe(2);
            expect(groups.get('assertion_mismatch')).toHaveLength(2);
            expect(groups.get('null_reference')).toHaveLength(1);
        });

        it('should handle empty failures array', () => {
            const groups = analyzer.groupFailuresByType([]);
            expect(groups.size).toBe(0);
        });
    });

    describe('createFailureSummary', () => {
        it('should create summary for multiple failures', () => {
            const failures: TestFailure[] = [
                {
                    testName: 'assertion test',
                    testFile: 'test.spec.ts',
                    errorMessage: 'expect(received).toEqual(expected)',
                    errorType: 'assertion_mismatch',
                    stackTrace: [],
                    suggestion: 'Check values'
                },
                {
                    testName: 'null test',
                    testFile: 'test.spec.ts',
                    errorMessage: 'Cannot read property of undefined',
                    errorType: 'null_reference',
                    stackTrace: [],
                    suggestion: 'Add null check'
                }
            ];

            const summary = analyzer.createFailureSummary(failures);

            expect(summary).toContain('Found 2 test failure(s)');
            expect(summary).toContain('**assertion_mismatch** (1 failure):');
            expect(summary).toContain('**null_reference** (1 failure):');
            expect(summary).toContain('assertion test');
            expect(summary).toContain('Check the expected vs actual values');
        });

        it('should handle empty failures', () => {
            const summary = analyzer.createFailureSummary([]);
            expect(summary).toBe('No test failures to analyze.');
        });

        it('should limit displayed failures per type', () => {
            const failures: TestFailure[] = Array.from({ length: 5 }, (_, i) => ({
                testName: `test ${i + 1}`,
                testFile: 'test.spec.ts',
                errorMessage: 'expect(received).toEqual(expected)',
                errorType: 'assertion_mismatch',
                stackTrace: []
            }));

            const summary = analyzer.createFailureSummary(failures);

            expect(summary).toContain('**assertion_mismatch** (5 failures):');
            expect(summary).toContain('... and 2 more');
        });
    });

    describe('integration tests', () => {
        it('should handle complete Jest output workflow', () => {
            const jestOutput = JSON.stringify({
                numTotalTests: 3,
                numPassedTests: 1,
                numFailedTests: 2,
                numPendingTests: 0,
                testResults: [
                    {
                        name: '/path/to/math.test.ts',
                        status: 'failed',
                        assertionResults: [
                            {
                                title: 'should add numbers correctly',
                                status: 'failed',
                                failureMessages: [
                                    'expect(received).toEqual(expected)\n\nExpected: 5\nReceived: 4'
                                ]
                            },
                            {
                                title: 'should handle null input',
                                status: 'failed',
                                failureMessages: [
                                    'TypeError: Cannot read property \'length\' of undefined'
                                ]
                            }
                        ]
                    }
                ]
            });

            const results = analyzer.parseJestOutput(jestOutput);
            const analyzed = results.failures.map(f => analyzer.analyzeFailure(f));
            const summary = analyzer.createFailureSummary(analyzed);
            const context = analyzer.generateAIContext(analyzed[0]);

            expect(analyzed).toHaveLength(2);
            expect(analyzed[0].errorType).toBe('assertion_mismatch');
            expect(analyzed[1].errorType).toBe('null_reference');
            expect(summary).toContain('Found 2 test failure(s)');
            expect(context).toContain('should add numbers correctly');
        });
    });
});