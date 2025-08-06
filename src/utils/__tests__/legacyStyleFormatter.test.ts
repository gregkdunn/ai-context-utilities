/**
 * Tests for LegacyStyleFormatter
 */

import { LegacyStyleFormatter } from '../legacyStyleFormatter';
import { TestSummary, TestFailure } from '../testResultParser';

describe('LegacyStyleFormatter', () => {
    describe('createStatusBanner', () => {
        test('should create status banner for passed tests', () => {
            const result: TestSummary = {
                success: true,
                project: 'test-project',
                duration: 2.5,
                passed: 5,
                failed: 0,
                skipped: 0,
                total: 5,
                failures: []
            };

            const banner = LegacyStyleFormatter.createStatusBanner(result);
            
            expect(banner).toContain('✅ PASSED');
            expect(banner).toContain('test-project');
            expect(banner).toContain('2.5s');
            expect(banner).toContain('5 passed');
        });

        test('should create status banner for failed tests', () => {
            const result: TestSummary = {
                success: false,
                project: 'test-project',
                duration: 1.2,
                passed: 3,
                failed: 2,
                skipped: 1,
                total: 6,
                failures: []
            };

            const banner = LegacyStyleFormatter.createStatusBanner(result);
            
            expect(banner).toContain('❌ FAILED');
            expect(banner).toContain('test-project');
            expect(banner).toContain('1.2s');
            expect(banner).toContain('3 passed');
            expect(banner).toContain('2 failed');
        });
    });

    describe('formatFailuresOnly', () => {
        test('should return empty string for no failures', () => {
            const result = LegacyStyleFormatter.formatFailuresOnly([]);
            expect(result).toBe('');
        });

        test('should format single failure', () => {
            const failures: TestFailure[] = [{
                test: 'should work',
                suite: 'MyComponent',
                error: 'Expected true but got false',
                file: 'test.spec.ts',
                line: 10
            }];

            const result = LegacyStyleFormatter.formatFailuresOnly(failures);
            
            expect(result).toContain('should work');
            expect(result).toContain('test.spec.ts');
            expect(result).toContain('Expected true but got false');
        });
    });
});