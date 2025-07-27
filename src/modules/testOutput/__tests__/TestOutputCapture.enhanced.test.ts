/**
 * Enhanced Unit Tests for TestOutputCapture module
 * Comprehensive testing for Phase 2.1 legacy format matching
 */

import { TestOutputCapture, TestOutputOptions } from '../TestOutputCapture';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        access: jest.fn(),
        unlink: jest.fn()
    }
}));

describe('TestOutputCapture - Enhanced Phase 2.1 Testing', () => {
    let testCapture: TestOutputCapture;
    let mockOutputChannel: any;
    let mockOptions: TestOutputOptions;

    beforeEach(() => {
        mockOutputChannel = {
            appendLine: jest.fn()
        };

        mockOptions = {
            workspaceRoot: '/test/workspace',
            outputChannel: mockOutputChannel
        };

        testCapture = new TestOutputCapture(mockOptions);
        
        // Setup default mocks
        (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);
        
        jest.clearAllMocks();
    });

    describe('Legacy nxTest.zsh Format Compliance - Comprehensive', () => {
        test('should match exact nxTest.zsh header structure and emojis', async () => {
            testCapture.startCapture('yarn nx test comprehensive-project', 'comprehensive-project');
            
            await testCapture.stopCapture(1);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Verify exact legacy header sequence
            const headerLines = content.split('\n').slice(0, 10);
            expect(headerLines[0]).toBe('=================================================================');
            expect(headerLines[1]).toBe('🤖 TEST ANALYSIS REPORT');
            expect(headerLines[2]).toBe('=================================================================');
            expect(headerLines[4]).toContain('COMMAND: yarn nx test comprehensive-project');
            expect(headerLines[5]).toContain('EXIT CODE: 1');
            expect(headerLines[6]).toContain('STATUS: ❌ FAILED');
            expect(headerLines[8]).toBe('=================================================================');
            expect(headerLines[9]).toBe('📊 EXECUTIVE SUMMARY');
        });

        test('should extract and format test statistics exactly like legacy script', async () => {
            testCapture.startCapture('yarn nx test stats-validation', 'stats-validation');
            
            // Add realistic Jest output
            testCapture.appendOutput('Test Suites: 3 failed, 12 passed, 15 total');
            testCapture.appendOutput('Tests: 8 failed, 247 passed, 255 total');
            testCapture.appendOutput('Time: 78.412s, estimated 85s');
            testCapture.appendOutput('Snapshots: 0 total');
            testCapture.appendOutput('Ran all test suites.');
            
            await testCapture.stopCapture(1);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Verify exact statistics preservation
            expect(content).toContain('Test Suites: 3 failed, 12 passed, 15 total');
            expect(content).toContain('Tests: 8 failed, 247 passed, 255 total');
            expect(content).toContain('Time: 78.412s, estimated 85s');
            expect(content).toContain('Test Suites: 12 passed, 3 failed');
        });

        test('should handle complex compilation error extraction like legacy script', async () => {
            testCapture.startCapture('yarn nx test error-handling', 'error-handling');
            
            // Add realistic TypeScript compilation errors
            testCapture.appendOutput('Test suite failed to run');
            testCapture.appendOutput('');
            testCapture.appendOutput('Configuration');
            testCapture.appendOutput('src/app/services/data.service.ts:45:12 - error TS2304: Cannot find name \'UndefinedType\'.');
            testCapture.appendOutput('');
            testCapture.appendOutput('45     private data: UndefinedType;');
            testCapture.appendOutput('              ~~~~~~~~~~~~~~');
            testCapture.appendOutput('');
            testCapture.appendOutput('src/app/components/widget.component.ts:23:8 - error TS2339: Property \'nonExistentMethod\' does not exist on type \'WidgetService\'.');
            testCapture.appendOutput('');
            testCapture.appendOutput('23     this.nonExistentMethod();');
            testCapture.appendOutput('           ~~~~~~~~~~~~~~~~~~');
            
            await testCapture.stopCapture(1);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Verify compilation error section matches legacy format
            expect(content).toContain('🔥 COMPILATION/RUNTIME ERRORS:');
            expect(content).toContain('--------------------------------');
            expect(content).toContain('• error TS2304: Cannot find name');
            expect(content).toContain('• Property \'nonExistentMethod\' does not exist');
        });

        test('should extract test failures with context like legacy script', async () => {
            testCapture.startCapture('yarn nx test failure-analysis', 'failure-analysis');
            
            // Add realistic Jest test failures
            testCapture.appendOutput('● UserService › Authentication › should validate user credentials');
            testCapture.appendOutput('');
            testCapture.appendOutput('  expect(received).toBe(expected) // Object.is equality');
            testCapture.appendOutput('');
            testCapture.appendOutput('  Expected: true');
            testCapture.appendOutput('  Received: false');
            testCapture.appendOutput('');
            testCapture.appendOutput('● DataProcessor › Processing › should handle empty arrays');
            testCapture.appendOutput('');
            testCapture.appendOutput('  TypeError: Cannot read property \'length\' of undefined');
            testCapture.appendOutput('');
            testCapture.appendOutput('    at DataProcessor.process (src/utils/processor.ts:42:18)');
            
            await testCapture.stopCapture(1);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Verify test failure extraction matches legacy format
            expect(content).toContain('🧪 TEST FAILURES:');
            expect(content).toContain('-----------------');
            expect(content).toContain('• UserService › Authentication › should validate user credentials');
            expect(content).toContain('• DataProcessor › Processing › should handle empty arrays');
        });

        test('should generate performance insights section for slow tests', async () => {
            testCapture.startCapture('yarn nx test performance-test', 'performance-test');
            
            testCapture.appendOutput('Time: 45.234s');
            testCapture.appendOutput('PASS src/app/fast.spec.ts (0.8 s)');
            testCapture.appendOutput('PASS src/app/medium.spec.ts (1.2 s)');
            testCapture.appendOutput('PASS src/app/slow.spec.ts (3.5 s)');
            testCapture.appendOutput('PASS src/app/very-slow.spec.ts (8.7 s)');
            
            await testCapture.stopCapture(0);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Verify performance insights match legacy format
            expect(content).toContain('⚡ PERFORMANCE INSIGHTS');
            expect(content).toContain('Time: 45.234s');
            // Should identify slow tests (>1s)
            expect(content).toContain('• PASS src/app/medium.spec.ts (1.2 s): 1.2s');
            expect(content).toContain('• PASS src/app/slow.spec.ts (3.5 s): 3.5s');
            expect(content).toContain('• PASS src/app/very-slow.spec.ts (8.7 s): 8.7s');
        });

        test('should handle mixed passing and failing test suites correctly', async () => {
            testCapture.startCapture('yarn nx test mixed-results', 'mixed-results');
            
            testCapture.appendOutput('PASS src/app/user.service.spec.ts (2.1 s)');
            testCapture.appendOutput('PASS src/app/auth.service.spec.ts (1.8 s)');
            testCapture.appendOutput('FAIL src/app/data.service.spec.ts (0.9 s)');
            testCapture.appendOutput('FAIL src/app/payment.service.spec.ts (1.4 s)');
            testCapture.appendOutput('PASS src/app/utils.spec.ts (0.5 s)');
            
            await testCapture.stopCapture(1);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Verify test suite results formatting
            expect(content).toContain('🧪 TEST RESULTS SUMMARY');
            expect(content).toContain('✅ PASS src/app/user.service.spec.ts');
            expect(content).toContain('✅ PASS src/app/auth.service.spec.ts');
            expect(content).toContain('❌ FAIL src/app/data.service.spec.ts');
            expect(content).toContain('❌ FAIL src/app/payment.service.spec.ts');
            expect(content).toContain('✅ PASS src/app/utils.spec.ts');
        });
    });

    describe('ANSI Code Cleaning - Enhanced', () => {
        test('should clean complex ANSI escape sequences', () => {
            testCapture.startCapture('yarn nx test ansi-complex', 'ansi-complex');
            
            // Test various ANSI codes
            testCapture.appendOutput('\x1b[32m\x1b[1mPASS\x1b[22m\x1b[39m src/test.spec.ts');
            testCapture.appendOutput('\x1b[31m\x1b[1mFAIL\x1b[22m\x1b[39m src/fail.spec.ts');
            testCapture.appendOutput('\x1b[90m\x1b[2m› 15 tests passed\x1b[22m\x1b[39m');
            testCapture.appendOutput('\x1b[33m\x1b[1mWARN\x1b[22m\x1b[39m: Deprecated API used');
            
            const cleanedOutput = testCapture.getCapturedOutput();
            
            // Verify all ANSI codes are stripped
            expect(cleanedOutput).not.toMatch(/\x1b\[[0-9;]*[mGKHJA-Z]/);
            expect(cleanedOutput).toContain('PASS src/test.spec.ts');
            expect(cleanedOutput).toContain('FAIL src/fail.spec.ts');
            expect(cleanedOutput).toContain('› 15 tests passed');
            expect(cleanedOutput).toContain('WARN: Deprecated API used');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle empty test output gracefully', async () => {
            testCapture.startCapture('yarn nx test empty-output', 'empty-output');
            
            await testCapture.stopCapture(0);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Should still generate valid structure
            expect(content).toContain('🤖 TEST ANALYSIS REPORT');
            expect(content).toContain('STATUS: ✅ PASSED');
            expect(content).toContain('Tests: Information not available');
        });

        test('should handle file system errors and report them', async () => {
            (fs.promises.writeFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));
            
            testCapture.startCapture('yarn nx test fs-error', 'fs-error');
            const result = await testCapture.stopCapture(0);
            
            expect(result).toBe(false);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('❌ Failed to save test output: Error: Permission denied')
            );
        });

        test('should handle directory creation errors gracefully', async () => {
            (fs.promises.mkdir as jest.Mock).mockRejectedValue(new Error('Directory creation failed'));
            
            testCapture.startCapture('yarn nx test dir-error', 'dir-error');
            const result = await testCapture.stopCapture(0);
            
            expect(result).toBe(false);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('❌ Failed to save test output')
            );
        });
    });

    describe('API Contract Validation', () => {
        test('should maintain backward compatibility', () => {
            // Verify all expected methods exist
            expect(typeof testCapture.startCapture).toBe('function');
            expect(typeof testCapture.appendOutput).toBe('function');
            expect(typeof testCapture.stopCapture).toBe('function');
            expect(typeof testCapture.outputExists).toBe('function');
            expect(typeof testCapture.getOutputFilePath).toBe('function');
            expect(typeof testCapture.clearOutput).toBe('function');
            expect(typeof testCapture.getCapturedOutput).toBe('function');
        });

        test('should return correct file paths', () => {
            const expectedPath = path.join(
                '/test/workspace',
                '.github',
                'instructions',
                'ai_debug_context',
                'test-output.txt'
            );
            
            expect(testCapture.getOutputFilePath()).toBe(expectedPath);
        });

        test('should handle output existence checking', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            
            const exists = await testCapture.outputExists();
            expect(exists).toBe(true);
            
            (fs.promises.access as jest.Mock).mockRejectedValue(new Error('File not found'));
            
            const notExists = await testCapture.outputExists();
            expect(notExists).toBe(false);
        });

        test('should clear output files properly', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);
            
            await testCapture.clearOutput();
            
            expect(fs.promises.unlink).toHaveBeenCalledWith(testCapture.getOutputFilePath());
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('🗑️  Test output cleared');
        });
    });

    describe('Real-world Scenario Testing', () => {
        test('should handle large test suite output like CI environments', async () => {
            testCapture.startCapture('yarn nx test large-suite', 'large-suite');
            
            // Simulate large test suite output
            for (let i = 1; i <= 50; i++) {
                testCapture.appendOutput(`PASS src/app/module${i}.spec.ts (${(Math.random() * 3).toFixed(1)} s)`);
            }
            
            for (let i = 1; i <= 5; i++) {
                testCapture.appendOutput(`FAIL src/app/broken${i}.spec.ts (${(Math.random() * 2).toFixed(1)} s)`);
                testCapture.appendOutput(`● Test Suite ${i} › should work correctly`);
                testCapture.appendOutput(`  Expected: expected value`);
                testCapture.appendOutput(`  Received: actual value`);
            }
            
            testCapture.appendOutput('Test Suites: 5 failed, 50 passed, 55 total');
            testCapture.appendOutput('Tests: 23 failed, 847 passed, 870 total');
            testCapture.appendOutput('Time: 145.678s, estimated 150s');
            
            await testCapture.stopCapture(1);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Verify it handles large output correctly
            expect(content).toContain('Test Suites: 5 failed, 50 passed, 55 total');
            expect(content).toContain('Tests: 23 failed, 847 passed, 870 total');
            expect(content).toContain('💥 FAILURE ANALYSIS');
            expect(content).toContain('🧪 TEST FAILURES:');
            
            // Should contain all failed test references
            for (let i = 1; i <= 5; i++) {
                expect(content).toContain(`● Test Suite ${i} › should work correctly`);
            }
        });
    });
});