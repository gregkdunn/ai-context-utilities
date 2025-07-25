/**
 * Tests for test result parser
 */

import { TestResultParser } from '../testResultParser';

describe('TestResultParser', () => {
    const mockJestOutput = `
FAIL src/app/components/test.component.spec.ts
● TestComponent › should create
  TypeError: Cannot read property 'test' of undefined
    at TestComponent.spec.ts:25:10

● TestComponent › should handle input
  Expected true to be false
    at TestComponent.spec.ts:35:15

Test Suites: 1 failed, 0 passed, 1 total
Tests:       2 failed, 3 passed, 5 total
Snapshots:   0 total
Time:        2.345 s
Ran all test suites.
`;

    describe('parseJestOutput', () => {
        it('should parse Jest test summary correctly', () => {
            const result = TestResultParser.parseJestOutput(mockJestOutput, 'test-project');
            
            expect(result.project).toBe('test-project');
            expect(result.passed).toBe(3);
            expect(result.failed).toBe(2);
            expect(result.total).toBe(5);
            expect(result.duration).toBe(2.345);
            expect(result.success).toBe(false);
        });

        it('should extract failed test details', () => {
            const result = TestResultParser.parseJestOutput(mockJestOutput, 'test-project');
            
            expect(result.failures).toHaveLength(2);
            expect(result.failures[0].test).toContain('should create');
            expect(result.failures[0].suite).toContain('TestComponent');
            expect(result.failures[1].test).toContain('should handle input');
        });

        it('should handle empty output gracefully', () => {
            const result = TestResultParser.parseJestOutput('', 'empty-project');
            
            expect(result.project).toBe('empty-project');
            expect(result.passed).toBe(0);
            expect(result.failed).toBe(0);
            expect(result.total).toBe(0);
            expect(result.success).toBe(true); // No failures = success
        });
    });

    describe('formatSummary', () => {
        it('should format successful results', () => {
            const result = {
                project: 'my-project',
                passed: 5,
                failed: 0,
                skipped: 0,
                total: 5,
                duration: 1.23,
                success: true,
                failures: []
            };
            
            const formatted = TestResultParser.formatSummary(result);
            expect(formatted).toContain('✅');
            expect(formatted).toContain('my-project');
            expect(formatted).toContain('5 tests passed');
            expect(formatted).toContain('1.2s');
        });

        it('should format failed results', () => {
            const result = {
                project: 'my-project',
                passed: 3,
                failed: 2,
                skipped: 1,
                total: 6,
                duration: 2.56,
                success: false,
                failures: []
            };
            
            const formatted = TestResultParser.formatSummary(result);
            expect(formatted).toContain('❌');
            expect(formatted).toContain('my-project');
            expect(formatted).toContain('2 failed');
            expect(formatted).toContain('3 passed');
            expect(formatted).toContain('1 skipped');
            expect(formatted).toContain('2.6s');
        });
    });

    describe('getFailedTestPatterns', () => {
        it('should create Jest-compatible test patterns', () => {
            const failures = [
                { test: 'should create', suite: 'TestComponent', error: 'error1' },
                { test: 'should handle input', suite: 'TestComponent', error: 'error2' }
            ];
            
            const patterns = TestResultParser.getFailedTestPatterns(failures);
            expect(patterns).toHaveLength(2);
            expect(patterns[0]).toContain('TestComponent.*should create');
            expect(patterns[1]).toContain('TestComponent.*should handle input');
        });

        it('should escape special regex characters', () => {
            const failures = [
                { test: 'should handle (special) chars', suite: 'Test', error: 'error' }
            ];
            
            const patterns = TestResultParser.getFailedTestPatterns(failures);
            expect(patterns[0]).toContain('\\(special\\)');
        });
    });

    describe('detectErrorType', () => {
        it('should detect timeout errors', () => {
            const type = TestResultParser.detectErrorType('Test timed out after 5000ms');
            expect(type).toBe('timeout');
        });

        it('should detect dependency errors', () => {
            const type = TestResultParser.detectErrorType('Cannot find module @angular/core');
            expect(type).toBe('dependency');
        });

        it('should detect syntax errors', () => {
            const type = TestResultParser.detectErrorType('SyntaxError: Unexpected token');
            expect(type).toBe('syntax');
        });

        it('should detect config errors', () => {
            const type = TestResultParser.detectErrorType('Jest configuration error');
            expect(type).toBe('config');
        });

        it('should default to unknown for unrecognized errors', () => {
            const type = TestResultParser.detectErrorType('Some random error message');
            expect(type).toBe('unknown');
        });
    });

    describe('extractDuration', () => {
        it('should extract Jest time format', () => {
            const duration = TestResultParser.extractDuration('Time: 2.345 s');
            expect(duration).toBe(2.345);
        });

        it('should extract alternative formats', () => {
            expect(TestResultParser.extractDuration('Ran for 1.5s')).toBe(1.5);
            expect(TestResultParser.extractDuration('Done in 3.7s')).toBe(3.7);
            expect(TestResultParser.extractDuration('Finished in 0.8s')).toBe(0.8);
        });

        it('should return 0 for unmatched patterns', () => {
            const duration = TestResultParser.extractDuration('No time information here');
            expect(duration).toBe(0);
        });
    });
});