/**
 * Unit tests for CopilotIntegration
 * 
 * Tests GitHub Copilot Chat integration, context generation, and fallback
 * handling for AI-powered test failure analysis.
 * 
 * @version 3.0.0
 */

import * as vscode from 'vscode';
import { CopilotIntegration, FixSuggestion, CopilotOptions } from '../CopilotIntegration';
import { TestFailure, TestResultSummary } from '../TestFailureAnalyzer';

// Mock VSCode API
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        })),
        showInformationMessage: jest.fn(() => Promise.resolve()),
        showErrorMessage: jest.fn()
    },
    commands: {
        executeCommand: jest.fn()
    },
    env: {
        clipboard: {
            writeText: jest.fn()
        }
    },
    extensions: {
        getExtension: jest.fn()
    },
    workspace: {
        openTextDocument: jest.fn()
    },
    Range: jest.fn(),
    Position: jest.fn()
}));

describe('CopilotIntegration', () => {
    let copilotIntegration: CopilotIntegration;
    let mockOutputChannel: any;
    let mockCommands: any;
    let mockClipboard: any;
    let mockExtensions: any;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        };
        
        mockCommands = vscode.commands as jest.Mocked<typeof vscode.commands>;
        mockClipboard = vscode.env.clipboard as jest.Mocked<typeof vscode.env.clipboard>;
        mockExtensions = vscode.extensions as jest.Mocked<typeof vscode.extensions>;
        
        (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
        
        copilotIntegration = new CopilotIntegration();
    });

    afterEach(() => {
        copilotIntegration.dispose();
    });

    describe('analyzeWithCopilot', () => {
        it('should handle empty failures array', async () => {
            const suggestions = await copilotIntegration.analyzeWithCopilot([]);

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].type).toBe('copilot_chat_opened');
            expect(suggestions[0].message).toBe('No test failures to analyze');
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
        });

        it('should process failures when Copilot is available', async () => {
            const mockExtension = {
                isActive: true,
                activate: jest.fn()
            };
            mockExtensions.getExtension.mockReturnValue(mockExtension);
            mockCommands.executeCommand.mockResolvedValue(undefined);
            mockClipboard.writeText.mockResolvedValue(undefined);

            const failures: TestFailure[] = [
                {
                    testName: 'test 1',
                    testFile: 'test1.spec.ts',
                    errorMessage: 'expect(received).toEqual(expected)',
                    errorType: 'assertion_mismatch',
                    stackTrace: []
                }
            ];

            const suggestions = await copilotIntegration.analyzeWithCopilot(failures);

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].type).toBe('copilot_chat_opened');
            expect(mockCommands.executeCommand).toHaveBeenCalledWith('github.copilot.openChatEditor');
        });

        it('should handle Copilot unavailability', async () => {
            mockExtensions.getExtension.mockReturnValue(null);

            const failures: TestFailure[] = [
                {
                    testName: 'test 1',
                    testFile: 'test1.spec.ts',
                    errorMessage: 'test error',
                    errorType: 'unknown',
                    stackTrace: []
                }
            ];

            const suggestions = await copilotIntegration.analyzeWithCopilot(failures);

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].message).toContain('GitHub Copilot Chat is not available');
        });

        it('should limit processing to 3 most important failures', async () => {
            const mockExtension = {
                isActive: true,
                activate: jest.fn()
            };
            mockExtensions.getExtension.mockReturnValue(mockExtension);
            mockCommands.executeCommand.mockResolvedValue(undefined);
            mockClipboard.writeText.mockResolvedValue(undefined);

            const failures: TestFailure[] = Array.from({ length: 5 }, (_, i) => ({
                testName: `test ${i + 1}`,
                testFile: `test${i + 1}.spec.ts`,
                errorMessage: 'test error',
                errorType: 'unknown',
                stackTrace: []
            }));

            const suggestions = await copilotIntegration.analyzeWithCopilot(failures);

            expect(suggestions).toHaveLength(3);
        });
    });

    describe('getCopilotSuggestion', () => {
        it('should generate suggestion for single test failure', async () => {
            mockCommands.executeCommand.mockResolvedValue(undefined);
            mockClipboard.writeText.mockResolvedValue(undefined);

            const testFailure: TestFailure = {
                testName: 'should test something',
                testFile: 'test.spec.ts',
                errorMessage: 'Expected true but received false',
                errorType: 'assertion_mismatch',
                stackTrace: ['at test.spec.ts:10:5'],
                suggestion: 'Check the assertion'
            };

            const suggestion = await copilotIntegration.getCopilotSuggestion(testFailure);

            expect(suggestion.type).toBe('copilot_chat_opened');
            expect(suggestion.message).toContain('should test something');
            expect(suggestion.confidence).toBe(0.8);
            expect(suggestion.context).toContain('Test Failure Analysis');
            expect(suggestion.context).toContain('should test something');
            expect(suggestion.context).toContain('Expected true but received false');
        });

        it('should include source code when provided', async () => {
            mockCommands.executeCommand.mockResolvedValue(undefined);
            mockClipboard.writeText.mockResolvedValue(undefined);

            const testFailure: TestFailure = {
                testName: 'test with source',
                testFile: 'test.spec.ts',
                errorMessage: 'test error',
                errorType: 'unknown',
                stackTrace: []
            };

            const sourceCode = 'const x = 1;\nexpect(x).toBe(2);';
            const options: CopilotOptions = { includeSourceCode: true };

            const suggestion = await copilotIntegration.getCopilotSuggestion(
                testFailure, 
                sourceCode, 
                options
            );

            expect(suggestion.context).toContain('Source Code Context');
            expect(suggestion.context).toContain('const x = 1;');
        });

        it('should handle errors gracefully', async () => {
            mockCommands.executeCommand.mockRejectedValue(new Error('Command failed'));

            const testFailure: TestFailure = {
                testName: 'failing test',
                testFile: 'test.spec.ts',
                errorMessage: 'test error',
                errorType: 'unknown',
                stackTrace: []
            };

            const suggestion = await copilotIntegration.getCopilotSuggestion(testFailure);

            expect(suggestion.type).toBe('copilot_chat_opened');
            expect(suggestion.message).toContain('Opened GitHub Copilot Chat for test failure');
        });
    });

    describe('analyzeBatchFailures', () => {
        it('should analyze multiple failures in batch', async () => {
            mockCommands.executeCommand.mockResolvedValue(undefined);
            mockClipboard.writeText.mockResolvedValue(undefined);

            const testResults: TestResultSummary = {
                totalTests: 10,
                passedTests: 8,
                failedTests: 2,
                skippedTests: 0,
                duration: 1500,
                timestamp: new Date(),
                failures: [
                    {
                        testName: 'test 1',
                        testFile: 'test1.spec.ts',
                        errorMessage: 'assertion error',
                        errorType: 'assertion_mismatch',
                        stackTrace: []
                    },
                    {
                        testName: 'test 2',
                        testFile: 'test2.spec.ts',
                        errorMessage: 'null error',
                        errorType: 'null_reference',
                        stackTrace: []
                    }
                ]
            };

            const suggestion = await copilotIntegration.analyzeBatchFailures(testResults);

            expect(suggestion.type).toBe('copilot_chat_opened');
            expect(suggestion.message).toContain('batch analysis of 2 test failures');
            expect(suggestion.context).toContain('Batch Test Failure Analysis');
            expect(suggestion.context).toContain('**Total Tests**: 10');
            expect(suggestion.context).toContain('**Failed**: 2');
        });
    });

    describe('context generation', () => {
        it('should build comprehensive context for single failure', async () => {
            const testFailure: TestFailure = {
                testName: 'comprehensive test',
                testFile: 'comprehensive.spec.ts',
                errorMessage: 'expect(received).toEqual(expected) - Expected: 42 but received: 24',
                errorType: 'unknown',
                stackTrace: [
                    'at Object.<anonymous> (comprehensive.spec.ts:15:20)',
                    'at Module._compile (module.js:652:30)'
                ],
                suggestion: 'Fix the assertion values'
            };

            const sourceCode = 'function test() { return false; }';
            const options: CopilotOptions = { 
                includeSourceCode: true,
                maxContextLines: 5
            };

            await copilotIntegration.getCopilotSuggestion(testFailure, sourceCode, options);

            const contextCall = mockClipboard.writeText.mock.calls[0][0];

            expect(contextCall).toContain('# 🐛 Test Failure Analysis & Fix Request');
            expect(contextCall).toContain('**Test Name**: comprehensive test');
            expect(contextCall).toContain('**Test File**: comprehensive.spec.ts');
            expect(contextCall).toContain('**Error Type**: assertion_mismatch');
            expect(contextCall).toContain('## ❌ Error Details');
            expect(contextCall).toContain('expect(received).toEqual(expected)');
            expect(contextCall).toContain('## 📍 Stack Trace');
            expect(contextCall).toContain('comprehensive.spec.ts:15:20');
            expect(contextCall).toContain('## 💻 Source Code Context');
            expect(contextCall).toContain('function test() { return false; }');
            expect(contextCall).toContain('## 💡 Pattern-Based Suggestion');
            expect(contextCall).toContain('Check the expected vs actual values');
            expect(contextCall).toContain('## 🎯 Request');
            expect(contextCall).toContain('Please analyze this test failure');
        });

        it('should build batch analysis context', async () => {
            const testResults: TestResultSummary = {
                totalTests: 15,
                passedTests: 10,
                failedTests: 5,
                skippedTests: 0,
                duration: 2500,
                timestamp: new Date(),
                failures: [
                    {
                        testName: 'assertion test 1',
                        testFile: 'test1.spec.ts',
                        errorMessage: 'expect(received).toEqual(expected) - Expected: 5 but received: 3',
                        errorType: 'unknown',
                        stackTrace: []
                    },
                    {
                        testName: 'assertion test 2',
                        testFile: 'test2.spec.ts',
                        errorMessage: 'Expected 10 but received 7',
                        errorType: 'unknown',
                        stackTrace: []
                    },
                    {
                        testName: 'null test',
                        testFile: 'test3.spec.ts',
                        errorMessage: 'Cannot read property \'name\' of undefined',
                        errorType: 'unknown',
                        stackTrace: []
                    }
                ]
            };

            await copilotIntegration.analyzeBatchFailures(testResults);

            const contextCall = mockClipboard.writeText.mock.calls[0][0];

            expect(contextCall).toContain('# 🔍 Batch Test Failure Analysis');
            expect(contextCall).toContain('**Total Tests**: 15');
            expect(contextCall).toContain('**Passed**: 10');
            expect(contextCall).toContain('**Failed**: 5');
            expect(contextCall).toContain('**Duration**: 2500ms');
            expect(contextCall).toContain('## 🎯 Failure Analysis by Type');
            expect(contextCall).toContain('### assertion_mismatch (2 failures)');
            expect(contextCall).toContain('### null_reference (1 failures)');
        });
    });

    describe('Copilot availability checking', () => {
        it('should detect when Copilot extension is not installed', async () => {
            mockExtensions.getExtension.mockReturnValue(null);

            const failures: TestFailure[] = [
                {
                    testName: 'test',
                    testFile: 'test.spec.ts',
                    errorMessage: 'error',
                    errorType: 'unknown',
                    stackTrace: []
                }
            ];

            const suggestions = await copilotIntegration.analyzeWithCopilot(failures);

            expect(suggestions[0].message).toContain('GitHub Copilot Chat is not available');
        });

        it('should activate inactive Copilot extension', async () => {
            const mockExtension = {
                isActive: false,
                activate: jest.fn().mockResolvedValue(undefined)
            };
            mockExtensions.getExtension.mockReturnValue(mockExtension);
            mockCommands.executeCommand.mockResolvedValue(undefined);

            const failures: TestFailure[] = [
                {
                    testName: 'test',
                    testFile: 'test.spec.ts',
                    errorMessage: 'error',
                    errorType: 'unknown',
                    stackTrace: []
                }
            ];

            await copilotIntegration.analyzeWithCopilot(failures);

            expect(mockExtension.activate).toHaveBeenCalled();
        });
    });

    describe('fallback handling', () => {
        it('should fallback to clipboard when chat command fails', async () => {
            mockCommands.executeCommand.mockRejectedValue(new Error('Command not found'));
            mockClipboard.writeText.mockResolvedValue(undefined);
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

            const testFailure: TestFailure = {
                testName: 'fallback test',
                testFile: 'test.spec.ts',
                errorMessage: 'test error',
                errorType: 'unknown',
                stackTrace: []
            };

            const suggestion = await copilotIntegration.getCopilotSuggestion(testFailure);

            expect(mockClipboard.writeText).toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('AI Debug Context copied to clipboard'),
                'Open Copilot Chat'
            );
            expect(suggestion.type).toBe('copilot_chat_opened');
        });
    });

    describe('priority and failure handling', () => {
        it('should prioritize assertion errors over unknown errors', async () => {
            const mockExtension = {
                isActive: true,
                activate: jest.fn()
            };
            mockExtensions.getExtension.mockReturnValue(mockExtension);
            mockCommands.executeCommand.mockResolvedValue(undefined);

            const failures: TestFailure[] = [
                {
                    testName: 'unknown error test',
                    testFile: 'test1.spec.ts',
                    errorMessage: 'some unknown error',
                    errorType: 'unknown',
                    stackTrace: []
                },
                {
                    testName: 'assertion error test',
                    testFile: 'test2.spec.ts',
                    errorMessage: 'expect(received).toEqual(expected)',
                    errorType: 'assertion_mismatch',
                    stackTrace: []
                }
            ];

            const suggestions = await copilotIntegration.analyzeWithCopilot(failures);

            // Should process assertion_mismatch first due to higher priority
            expect(suggestions).toHaveLength(2);
            // First suggestion should be for the assertion error (higher priority)
            expect(suggestions[0].message).toContain('assertion error test');
        });
    });
});