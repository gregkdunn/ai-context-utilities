/**
 * Unit tests for TestOutputCapture module
 * Tests Phase 2.1 legacy format matching with nxTest.zsh
 */

import { TestOutputCapture, TestOutputOptions } from '../TestOutputCapture';
import * as fs from 'fs';
import * as path from 'path';

// Mock vscode and fs
jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        access: jest.fn(),
        unlink: jest.fn()
    }
}));

describe('TestOutputCapture - Phase 2.1 Legacy Format Matching', () => {
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
        jest.clearAllMocks();
    });

    describe('Legacy nxTest.zsh Format Matching', () => {
        test('should generate exact header format as legacy script', async () => {
            testCapture.startCapture('yarn nx test my-project', 'my-project');
            
            const result = await testCapture.stopCapture(1);
            
            expect(fs.promises.writeFile).toHaveBeenCalled();
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Verify exact legacy format headers
            expect(content).toContain('=================================================================');
            expect(content).toContain('🤖 TEST ANALYSIS REPORT');
            expect(content).toContain('=================================================================');
            expect(content).toContain('COMMAND: yarn nx test my-project');
            expect(content).toContain('EXIT CODE: 1');
            expect(content).toContain('STATUS: ❌ FAILED');
            expect(content).toContain('📊 EXECUTIVE SUMMARY');
        });

        test('should generate failure analysis section for failed tests', async () => {
            testCapture.startCapture('yarn nx test failed-project', 'failed-project');
            testCapture.appendOutput('Test suite failed to run');
            testCapture.appendOutput('error TS2304: Cannot find name');
            testCapture.appendOutput('● Component › should work');
            testCapture.appendOutput('  Expected true but got false');
            
            await testCapture.stopCapture(1);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Verify exact legacy failure analysis format
            expect(content).toContain('💥 FAILURE ANALYSIS');
            expect(content).toContain('🔥 COMPILATION/RUNTIME ERRORS:');
            expect(content).toContain('--------------------------------');
            expect(content).toContain('🧪 TEST FAILURES:');
            expect(content).toContain('-----------------');
        });

        test('should match legacy test statistics extraction', async () => {
            testCapture.startCapture('yarn nx test stats-test', 'stats-test');
            testCapture.appendOutput('Test Suites: 2 failed, 4 passed, 6 total');
            testCapture.appendOutput('Tests: 3 failed, 141 passed, 144 total');
            testCapture.appendOutput('Time: 45.234s');
            testCapture.appendOutput('PASS src/app/service.spec.ts');
            testCapture.appendOutput('FAIL src/app/component.spec.ts');
            
            await testCapture.stopCapture(0);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Verify legacy statistics format
            expect(content).toContain('Test Suites: 2 failed, 4 passed, 6 total');
            expect(content).toContain('Tests: 3 failed, 141 passed, 144 total');
            expect(content).toContain('Time: 45.234s');
            expect(content).toContain('✅ PASS src/app/service.spec.ts');
            expect(content).toContain('❌ FAIL src/app/component.spec.ts');
        });

        test('should include performance insights section', async () => {
            testCapture.startCapture('yarn nx test perf-test', 'perf-test');
            testCapture.appendOutput('Time: 25.567s');
            testCapture.appendOutput('PASS src/slow.spec.ts (2.5 s)');
            
            await testCapture.stopCapture(0);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Verify performance section matches legacy format
            expect(content).toContain('⚡ PERFORMANCE INSIGHTS');
            expect(content).toContain('Time: 25.567s');
        });

        test('should handle passed tests without failure analysis', async () => {
            testCapture.startCapture('yarn nx test passing-project', 'passing-project');
            testCapture.appendOutput('Test Suites: 0 failed, 6 passed, 6 total');
            testCapture.appendOutput('Tests: 0 failed, 144 passed, 144 total');
            
            await testCapture.stopCapture(0);
            
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            
            // Should not contain failure analysis for passing tests
            expect(content).not.toContain('💥 FAILURE ANALYSIS');
            expect(content).toContain('STATUS: ✅ PASSED');
            expect(content).toContain('🧪 TEST RESULTS SUMMARY');
        });
    });

    describe('ANSI Code Cleaning', () => {
        test('should strip ANSI escape codes like legacy script', () => {
            testCapture.startCapture('yarn nx test ansi-test', 'ansi-test');
            testCapture.appendOutput('\x1b[32mPASS\x1b[0m src/test.spec.ts');
            testCapture.appendOutput('\x1b[31mFAIL\x1b[0m src/fail.spec.ts');
            
            // The appendOutput method should clean ANSI codes internally
            const cleanedOutput = testCapture.getCapturedOutput();
            expect(cleanedOutput).not.toContain('\x1b[');
            expect(cleanedOutput).toContain('PASS src/test.spec.ts');
            expect(cleanedOutput).toContain('FAIL src/fail.spec.ts');
        });
    });

    describe('File Operations', () => {
        test('should create directory structure', async () => {
            (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            testCapture.startCapture('yarn nx test', 'test-project');
            await testCapture.stopCapture(0);
            
            expect(fs.promises.mkdir).toHaveBeenCalledWith(
                path.join('/test/workspace', '.github', 'instructions', 'ai-utilities-context'),
                { recursive: true }
            );
        });

        test('should save to correct file path', async () => {
            (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            testCapture.startCapture('yarn nx test', 'test-project');
            await testCapture.stopCapture(0);
            
            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                path.join('/test/workspace', '.github', 'instructions', 'ai-utilities-context', 'test-output.txt'),
                expect.any(String)
            );
        });

        test('should handle file operations errors gracefully', async () => {
            (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));
            
            testCapture.startCapture('yarn nx test', 'test-project');
            const result = await testCapture.stopCapture(0);
            
            expect(result).toBe(false);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('❌ Failed to save test output')
            );
        });
    });

    describe('API Compatibility', () => {
        test('should maintain expected public interface', () => {
            expect(testCapture.startCapture).toBeDefined();
            expect(testCapture.appendOutput).toBeDefined();
            expect(testCapture.stopCapture).toBeDefined();
            expect(testCapture.outputExists).toBeDefined();
            expect(testCapture.getOutputFilePath).toBeDefined();
            expect(testCapture.clearOutput).toBeDefined();
            expect(testCapture.getCapturedOutput).toBeDefined();
        });

        test('should return correct file path', () => {
            const filePath = testCapture.getOutputFilePath();
            expect(filePath).toBe(
                path.join('/test/workspace', '.github', 'instructions', 'ai-utilities-context', 'test-output.txt')
            );
        });
    });
});