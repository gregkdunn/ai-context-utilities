/**
 * Unit tests for ContextCompiler module
 * Tests Phase 2.1 legacy format matching with aiDebug.zsh
 */

import { ContextCompiler, ContextCompilerOptions, ContextType } from '../ContextCompiler';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
        readFile: jest.fn(),
        unlink: jest.fn()
    }
}));

jest.mock('vscode', () => ({
    env: {
        clipboard: {
            writeText: jest.fn()
        }
    }
}));

describe('ContextCompiler - Phase 2.1 Legacy Format Matching', () => {
    let compiler: ContextCompiler;
    let mockOutputChannel: any;
    let mockOptions: ContextCompilerOptions;

    beforeEach(() => {
        mockOutputChannel = {
            appendLine: jest.fn()
        };

        mockOptions = {
            workspaceRoot: '/test/workspace',
            outputChannel: mockOutputChannel
        };

        compiler = new ContextCompiler(mockOptions);
        jest.clearAllMocks();
    });

    describe('Legacy aiDebug.zsh Format Matching', () => {
        test('should generate exact header format as legacy script', async () => {
            const mockDiff = 'diff --git a/src/test.ts b/src/test.ts';
            const mockTestOutput = 'Test output content';

            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce(mockDiff)
                .mockResolvedValueOnce(mockTestOutput);

            await compiler.compileContext('debug', false);

            expect(fs.promises.writeFile).toHaveBeenCalled();
            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify exact legacy format headers
            expect(content).toContain('=================================================================');
            expect(content).toContain('🤖 AI DEBUG CONTEXT - OPTIMIZED FOR ANALYSIS');
            expect(content).toContain('=================================================================');
            expect(content).toContain('PROJECT: Angular NX Monorepo');
            expect(content).toContain('TARGET: workspace');
            expect(content).toContain('STATUS: ❌ TESTS FAILING');
            expect(content).toContain('FOCUS: General debugging');
            expect(content).toContain('TIMESTAMP:');
        });

        test('should generate analysis request section for failing tests', async () => {
            const mockDiff = 'diff content';
            const mockTestOutput = 'test output';

            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce(mockDiff)
                .mockResolvedValueOnce(mockTestOutput);

            await compiler.compileContext('debug', false);

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify exact legacy analysis request format for failing tests
            expect(content).toContain('🎯 ANALYSIS REQUEST');
            expect(content).toContain('Please analyze this context and provide:');
            expect(content).toContain('1. 🔍 ROOT CAUSE ANALYSIS');
            expect(content).toContain('2. 🛠️ CONCRETE FIXES (PRIORITY 1)');
            expect(content).toContain('3. 🧪 EXISTING TEST FIXES (PRIORITY 1)');
            expect(content).toContain('4. 🚀 IMPLEMENTATION GUIDANCE (PRIORITY 1)');
            expect(content).toContain('5. ✨ NEW TEST SUGGESTIONS (PRIORITY 2 - AFTER FIXES)');
            expect(content).toContain('NOTE: Focus on items 1-4 first to get tests passing, then implement item 5');
        });

        test('should generate different analysis request for passing tests', async () => {
            const mockDiff = 'diff content';
            const mockTestOutput = 'test output';

            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce(mockDiff)
                .mockResolvedValueOnce(mockTestOutput);

            await compiler.compileContext('debug', true);

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify analysis request format for passing tests
            expect(content).toContain('STATUS: ✅ TESTS PASSING');
            expect(content).toContain('1. 🔍 CODE QUALITY ANALYSIS');
            expect(content).toContain('2. 🎭 MOCK DATA VALIDATION (CRITICAL)');
            expect(content).toContain('3. 🧪 TEST COVERAGE ANALYSIS');
            expect(content).toContain('4. 🚀 ENHANCEMENT RECOMMENDATIONS');
            expect(content).toContain('5. 🛡️ ROBUSTNESS IMPROVEMENTS');
        });

        test('should include test results analysis section', async () => {
            const mockTestOutput = `=================================================================
🤖 TEST ANALYSIS REPORT
=================================================================

COMMAND: yarn nx test my-project
EXIT CODE: 1
STATUS: ❌ FAILED`;

            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce(null) // no diff
                .mockResolvedValueOnce(mockTestOutput);

            await compiler.compileContext('debug', false);

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify test results section matches legacy format
            expect(content).toContain('🧪 TEST RESULTS ANALYSIS');
            expect(content).toContain(mockTestOutput);
        });

        test('should include code quality results section', async () => {
            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce('mock diff')
                .mockResolvedValueOnce('mock test output');

            await compiler.compileContext('debug', true);

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify code quality section matches legacy format
            expect(content).toContain('🔧 CODE QUALITY RESULTS');
            expect(content).toContain('📋 LINTING RESULTS:');
            expect(content).toContain('✨ FORMATTING RESULTS:');
            expect(content).toContain('🚀 PUSH READINESS:');
            expect(content).toContain('✅ READY TO PUSH');
            expect(content).toContain('• Tests: Passing ✅');
            expect(content).toContain('• Lint: Clean ✅');
            expect(content).toContain('• Format: Applied ✅');
        });

        test('should show not ready status for failing tests', async () => {
            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce('mock diff')
                .mockResolvedValueOnce('mock test output');

            await compiler.compileContext('debug', false);

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify not ready status for failing tests
            expect(content).toContain('⚠️  NOT READY - Issues need resolution:');
            expect(content).toContain('• Tests: Failing ❌');
            expect(content).toContain('• Lint: Pending ⚠️');
            expect(content).toContain('• Format: Pending ⚠️');
        });

        test('should include code changes analysis section', async () => {
            const mockDiff = `=================================================================
🔍 AI-OPTIMIZED GIT DIFF ANALYSIS
=================================================================

COMMAND: git diff (smart detection)
TIMESTAMP: 7/26/2025, 12:00:00 PM
BRANCH: main`;

            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce(mockDiff)
                .mockResolvedValueOnce(null);

            await compiler.compileContext('debug', false);

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify code changes section includes diff
            expect(content).toContain('📋 CODE CHANGES ANALYSIS');
            expect(content).toContain(mockDiff);
        });

        test('should handle missing diff gracefully', async () => {
            (fs.promises.readFile as jest.Mock)
                .mockRejectedValueOnce({ code: 'ENOENT' }) // no diff file
                .mockResolvedValueOnce('mock test output');

            await compiler.compileContext('debug', false);

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify handling of missing diff
            expect(content).toContain('ℹ️  No recent code changes detected');
            expect(content).toContain('This suggests the test failures may be due to:');
            expect(content).toContain('• Environment or configuration issues');
            expect(content).toContain('• Dependencies or version conflicts');
        });

        test('should include AI assistant guidance section', async () => {
            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce('mock diff')
                .mockResolvedValueOnce('mock test output');

            await compiler.compileContext('debug', false);

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify AI guidance section matches legacy format
            expect(content).toContain('🚀 AI ASSISTANT GUIDANCE');
            expect(content).toContain('This context file is optimized for AI analysis with:');
            expect(content).toContain('• Structured failure information for easy parsing');
            expect(content).toContain('• Code changes correlated with test failures');
            expect(content).toContain('• Clear focus areas for targeted analysis');
            expect(content).toContain('• Actionable fix categories for systematic resolution');
            expect(content).toContain('Context file size:');
            expect(content).toContain('lines (optimized for AI processing)');
        });
    });

    describe('Context Types', () => {
        test('should handle new-tests context type', async () => {
            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce('diff')
                .mockResolvedValueOnce('test output');

            await compiler.compileContext('new-tests', true);

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            expect(content).toContain('FOCUS: Test coverage analysis');
        });

        test('should handle pr-description context type', async () => {
            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce('diff')
                .mockResolvedValueOnce('test output');

            await compiler.compileContext('pr-description', true);

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            expect(content).toContain('FOCUS: PR description generation');
        });
    });

    describe('Mock Data Validation Focus', () => {
        test('should include critical mock data validation section for passing tests', async () => {
            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce('diff')
                .mockResolvedValueOnce('test output');

            await compiler.compileContext('debug', true);

            const [, content] = (fs.promises.writeFile as jest.Mock).mock.calls[0];

            // Verify mock data validation section
            expect(content).toContain('2. 🎭 MOCK DATA VALIDATION (CRITICAL)');
            expect(content).toContain('• Review all mock data to ensure it matches real-world data structures');
            expect(content).toContain('• Verify mock objects have correct property names and types');
            expect(content).toContain('• Check that mock data represents realistic scenarios');
            expect(content).toContain('• Ensure mocked API responses match actual API contract');
            expect(content).toContain('• Identify mock data that might be giving false positives');
        });
    });

    describe('File Operations', () => {
        test('should save to correct file path', async () => {
            (fs.promises.readFile as jest.Mock)
                .mockResolvedValueOnce('diff')
                .mockResolvedValueOnce('test output');

            await compiler.compileContext('debug', false);

            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                path.join('/test/workspace', '.github', 'instructions', 'ai_debug_context', 'ai_debug_context.txt'),
                expect.any(String)
            );
        });

        test('should handle file read errors gracefully', async () => {
            (fs.promises.readFile as jest.Mock)
                .mockRejectedValueOnce(new Error('Read failed'))
                .mockRejectedValueOnce(new Error('Read failed'));

            const result = await compiler.compileContext('debug', false);

            expect(result).toBeNull();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('⚠️  No diff or test output found')
            );
        });

        test('should return null when no input files exist', async () => {
            (fs.promises.readFile as jest.Mock)
                .mockRejectedValueOnce({ code: 'ENOENT' })
                .mockRejectedValueOnce({ code: 'ENOENT' });

            const result = await compiler.compileContext('debug', false);

            expect(result).toBeNull(); // Should return null when no input files exist
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('⚠️  No diff or test output found')
            );
        });
    });

    describe('API Compatibility', () => {
        test('should maintain expected public interface', () => {
            expect(compiler.compileContext).toBeDefined();
            expect(compiler.copyToClipboard).toBeDefined();
            expect(compiler.clearContext).toBeDefined();
        });
    });
});