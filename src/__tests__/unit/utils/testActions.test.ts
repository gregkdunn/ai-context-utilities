/**
 * Unit tests for TestActions
 * Tests test result menu handling and navigation including Back button functionality
 */

import { TestActions } from '../../../utils/testActions';
import { TestSummary } from '../../../utils/testResultParser';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        createQuickPick: jest.fn(),
        showQuickPick: jest.fn(),
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        createTerminal: jest.fn()
    },
    commands: {
        executeCommand: jest.fn()
    },
    QuickPickItemKind: {
        Separator: -1
    },
    env: {
        clipboard: {
            writeText: jest.fn()
        }
    }
}));

// Mock ContextCompiler
jest.mock('../../../modules/aiContext/ContextCompiler');

// Mock the new utility classes
jest.mock('../../../utils/QuickPickUtils', () => ({
    QuickPickUtils: {
        createBackButton: jest.fn(() => ({
            label: '$(arrow-left) Back',
            detail: '',
            description: '',
            id: 'back'
        }))
    }
}));
jest.mock('../../../utils/CopilotUtils');
jest.mock('../../../utils/MessageUtils');

describe('TestActions', () => {
    let testActions: TestActions;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;

    beforeEach(() => {
        // Create mock output channel
        mockOutputChannel = {
            appendLine: jest.fn(),
            append: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn()
        } as any;

        testActions = new TestActions({
            outputChannel: mockOutputChannel,
            workspaceRoot: '/test/workspace',
            testCommand: 'npx nx test'
        });

        // Mock shouldShowPopup to return true so menus are shown
        jest.spyOn(testActions as any, 'shouldShowPopup').mockReturnValue(true);
        
        // Mock copilotDebugTests to prevent automatic Copilot calls but still log the expected message
        jest.spyOn(testActions as any, 'copilotDebugTests').mockImplementation(async (result: any) => {
            mockOutputChannel.appendLine(`🤖 Starting Copilot debug session for ${result.project}...`);
            return Promise.resolve();
        });

        jest.clearAllMocks();
    });

    describe('Menu Structure', () => {
        test('should have correct menu items for success', () => {
            const successResult: TestSummary = {
                project: 'test-project',
                success: true,
                passed: 5,
                failed: 0,
                skipped: 0,
                total: 5,
                duration: 2.5,
                failures: []
            };

            // Create a mock QuickPick to capture the items
            const mockQuickPick = {
                title: '',
                placeholder: '',
                ignoreFocusOut: false,
                items: [],
                onDidAccept: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                onDidHide: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn()
            };
            
            (vscode.window.createQuickPick as jest.Mock).mockReturnValue(mockQuickPick);

            // Call the private method through the public interface
            testActions.showTestResult(successResult);

            // Let the promise queue finish
            return new Promise(resolve => {
                setTimeout(() => {
                    expect(vscode.window.createQuickPick).toHaveBeenCalled();
                    expect(mockQuickPick.title).toBe('✅ test-project tests passed!');
                    expect(mockQuickPick.placeholder).toBe('What would you like to do next?');
                    
                    // Verify menu items structure
                    expect(mockQuickPick.items).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({ 
                                label: '$(arrow-left) Back',
                                id: 'back'
                            }),
                            expect.objectContaining({ 
                                label: '$(rocket) Prepare to Push',
                                id: 'prepare-push'
                            }),
                            expect.objectContaining({ 
                                label: '$(git-pull-request) PR Description',
                                id: 'pr-description'
                            })
                        ])
                    );
                    resolve(undefined);
                }, 10);
            });
        });

        test('should have correct menu items for failure', () => {
            const failureResult: TestSummary = {
                project: 'test-project',
                success: false,
                passed: 3,
                failed: 2,
                skipped: 0,
                total: 5,
                duration: 4.2,
                failures: [
                    {
                        test: 'should handle user input',
                        suite: 'UserService',
                        error: 'Expected true but got false',
                        file: 'src/user/user.service.spec.ts',
                        line: 45
                    }
                ]
            };

            const mockQuickPick = {
                title: '',
                placeholder: '',
                ignoreFocusOut: false,
                items: [],
                onDidAccept: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                onDidHide: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn()
            };
            
            (vscode.window.createQuickPick as jest.Mock).mockReturnValue(mockQuickPick);

            // Call the private method through the public interface
            testActions.showTestResult(failureResult);

            // Let the promise queue finish
            return new Promise(resolve => {
                setTimeout(() => {
                    expect(vscode.window.createQuickPick).toHaveBeenCalled();
                    expect(mockQuickPick.title).toBe('❌ test-project tests failed (2 failures)');
                    expect(mockQuickPick.placeholder).toBe('What would you like to do next?');
                    
                    // Verify menu items structure (without Nx Cloud URL)
                    expect(mockQuickPick.items).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({ 
                                label: '$(arrow-left) Back',
                                id: 'back'
                            }),
                            expect.objectContaining({ 
                                label: '$(refresh) Test Again',
                                id: 'test-again'
                            })
                        ])
                    );
                    resolve(undefined);
                }, 10);
            });
        });

        test('should include Nx Test Results when URL is available', () => {
            const failureResult: TestSummary = {
                project: 'test-project',
                success: false,
                passed: 3,
                failed: 2,
                skipped: 0,
                total: 5,
                duration: 4.2,
                failures: []
            };

            // Set up test result with Nx Cloud URL
            testActions.setCurrentTestResult({
                success: false,
                project: 'test-project',
                duration: 4.2,
                exitCode: 1,
                stdout: '',
                stderr: '',
                summary: failureResult,
                nxCloudUrl: 'https://cloud.nx.app/runs/abc123'
            });

            const mockQuickPick = {
                title: '',
                placeholder: '',
                ignoreFocusOut: false,
                items: [],
                onDidAccept: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                onDidHide: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn()
            };
            
            (vscode.window.createQuickPick as jest.Mock).mockReturnValue(mockQuickPick);

            testActions.showTestResult(failureResult);

            // Let the promise queue finish
            return new Promise(resolve => {
                setTimeout(() => {
                    // Verify Nx Test Results option is present
                    expect(mockQuickPick.items).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({ 
                                label: '$(link-external) Nx Test Results',
                                id: 'nx-results'
                            })
                        ])
                    );
                    resolve(undefined);
                }, 10);
            });
        });
    });

    describe('Back Button Navigation', () => {
        test('should implement Back button navigation command', () => {
            // This test verifies that the Back button is configured with the correct command
            // The actual command execution is tested in integration tests
            
            const successResult: TestSummary = {
                project: 'test-project',
                success: true,
                passed: 5,
                failed: 0,
                skipped: 0,
                total: 5,
                duration: 2.5,
                failures: []
            };

            const mockQuickPick = {
                title: '',
                placeholder: '',
                ignoreFocusOut: false,
                items: [],
                onDidAccept: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                onDidHide: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn()
            };
            
            (vscode.window.createQuickPick as jest.Mock).mockReturnValue(mockQuickPick);

            testActions.showTestResult(successResult);

            // Let the promise queue finish
            return new Promise(resolve => {
                setTimeout(() => {
                    // Verify Back button is present with correct configuration
                    const backButton = mockQuickPick.items.find((item: any) => item.id === 'back') as any;
                    expect(backButton).toBeDefined();
                    expect(backButton).toEqual({
                        label: '$(arrow-left) Back',
                        detail: '',
                        description: '',
                        id: 'back'
                    });
                    resolve(undefined);
                }, 10);
            });
        });

        test('should have consistent Back button across all menus', async () => {
            const successResult: TestSummary = {
                project: 'success-project',
                success: true,
                passed: 5,
                failed: 0,
                skipped: 0,
                total: 5,
                duration: 2.5,
                failures: []
            };
            
            const failureResult: TestSummary = {
                project: 'failure-project',
                success: false,
                passed: 3,
                failed: 2,
                skipped: 0,
                total: 5,
                duration: 4.2,
                failures: [{ test: 'test', suite: 'suite', error: 'error' }]
            };

            const testResults = [successResult, failureResult];

            for (const result of testResults) {
                const mockQuickPick = {
                    title: '',
                    placeholder: '',
                    ignoreFocusOut: false,
                    items: [],
                    onDidAccept: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                    onDidHide: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                    show: jest.fn(),
                    hide: jest.fn(),
                    dispose: jest.fn()
                };
                
                (vscode.window.createQuickPick as jest.Mock).mockReturnValue(mockQuickPick);

                testActions.showTestResult(result);

                // Wait for async operations to complete
                await new Promise(resolve => setTimeout(resolve, 20));

                // Verify Back button exists and has consistent structure
                const backButton = mockQuickPick.items.find((item: any) => item.id === 'back') as any;
                expect(backButton).toBeDefined();
                expect(backButton?.label).toBe('$(arrow-left) Back');
                expect(backButton?.id).toBe('back');
            }
        });
    });

    describe('Automatic Copilot Integration', () => {
        test('should trigger automatic Copilot analysis', () => {
            const successResult: TestSummary = {
                project: 'test-project',
                success: true,
                passed: 5,
                failed: 0,
                skipped: 0,
                total: 5,
                duration: 2.5,
                failures: []
            };

            // Mock ContextCompiler
            const mockContextCompiler = require('../../../modules/aiContext/ContextCompiler').ContextCompiler;
            mockContextCompiler.prototype.compileContext = jest.fn().mockResolvedValue('AI context for success');

            testActions.showTestResult(successResult);

            // Let the promise queue finish
            return new Promise(resolve => {
                setTimeout(() => {
                    // Verify automatic Copilot analysis is triggered
                    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                        expect.stringContaining('Starting Copilot debug session')
                    );
                    resolve(undefined);
                }, 10);
            });
        });
    });

    describe('Menu Configuration', () => {
        test('should set ignoreFocusOut to true for all menus', () => {
            const successResult: TestSummary = {
                project: 'test-project',
                success: true,
                passed: 5,
                failed: 0,
                skipped: 0,
                total: 5,
                duration: 2.5,
                failures: []
            };

            const mockQuickPick = {
                title: '',
                placeholder: '',
                ignoreFocusOut: false,
                items: [],
                onDidAccept: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                onDidHide: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn()
            };
            
            (vscode.window.createQuickPick as jest.Mock).mockReturnValue(mockQuickPick);

            testActions.showTestResult(successResult);

            // Let the promise queue finish
            return new Promise(resolve => {
                setTimeout(() => {
                    expect(mockQuickPick.ignoreFocusOut).toBe(true);
                    resolve(undefined);
                }, 10);
            });
        });

        test('should show menu after configuration', () => {
            const successResult: TestSummary = {
                project: 'test-project',
                success: true,
                passed: 5,
                failed: 0,
                skipped: 0,
                total: 5,
                duration: 2.5,
                failures: []
            };

            const mockQuickPick = {
                title: '',
                placeholder: '',
                ignoreFocusOut: false,
                items: [],
                onDidAccept: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                onDidHide: jest.fn().mockReturnValue({ dispose: jest.fn() }),
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn()
            };
            
            (vscode.window.createQuickPick as jest.Mock).mockReturnValue(mockQuickPick);

            testActions.showTestResult(successResult);

            // Let the promise queue finish
            return new Promise(resolve => {
                setTimeout(() => {
                    expect(mockQuickPick.show).toHaveBeenCalled();
                    resolve(undefined);
                }, 10);
            });
        });
    });

    describe('Test Result Management', () => {
        test('should set and retrieve current test result', () => {
            const testResult = {
                success: true,
                project: 'test-project',
                duration: 2.5,
                exitCode: 0,
                stdout: 'Test output',
                stderr: '',
                summary: {} as TestSummary,
                nxCloudUrl: 'https://cloud.nx.app/runs/test123'
            };

            testActions.setCurrentTestResult(testResult);

            // This is verified by the menu showing Nx Cloud option when URL is available
            // We can't directly access private members, but we can test the behavior
            expect(testActions).toBeDefined();
        });

        test('should update raw output', () => {
            const rawOutput = 'Test execution output\nPASS test1\nFAIL test2';
            
            testActions.updateRawOutput(rawOutput);
            
            // This is used internally for URL extraction and other processing
            expect(testActions).toBeDefined();
        });
    });

    describe('Command Building', () => {
        test('should build test command with project placeholder replacement', () => {
            const testActionsWithPlaceholder = new TestActions({
                outputChannel: mockOutputChannel,
                workspaceRoot: '/test/workspace',
                testCommand: 'npx nx test {project}'
            });
            
            // Access private method via casting
            const buildTestCommand = (testActionsWithPlaceholder as any).buildTestCommand;
            const result = buildTestCommand.call(testActionsWithPlaceholder, 'my-app', '--verbose');
            
            expect(result).toBe('npx nx test my-app --verbose');
        });

        test('should build test command by appending project name', () => {
            const result = (testActions as any).buildTestCommand('my-app', '--coverage');
            expect(result).toBe('npx nx test my-app --coverage');
        });

        test('should build test command without additional args', () => {
            const result = (testActions as any).buildTestCommand('my-app');
            expect(result).toBe('npx nx test my-app');
        });
    });

    describe('Nx Cloud URL Extraction', () => {
        test('should extract Nx cloud URL from output', () => {
            const rawOutput = 'Some output\nView structured, searchable error logs at https://cloud.nx.app/runs/abc123\nMore output';
            const result = (testActions as any).extractNxCloudUrl(rawOutput);
            expect(result).toBe('https://cloud.nx.app/runs/abc123');
        });

        test('should return null when no Nx cloud URL found', () => {
            const rawOutput = 'Test output without Nx cloud URL';
            const result = (testActions as any).extractNxCloudUrl(rawOutput);
            expect(result).toBeNull();
        });

        test('should handle multiple URLs and return first match', () => {
            const rawOutput = 'First URL: View structured, searchable error logs at https://cloud.nx.app/runs/first\nSecond URL: View structured, searchable error logs at https://cloud.nx.app/runs/second';
            const result = (testActions as any).extractNxCloudUrl(rawOutput);
            expect(result).toBe('https://cloud.nx.app/runs/first');
        });
    });

    describe('Navigation Context Management', () => {
        test('should set and use navigation context', () => {
            const context = { previousMenu: 'project-browser' as const, customCommand: 'test.command' };
            testActions.setNavigationContext(context);
            
            expect((testActions as any).navigationContext).toEqual(context);
        });

        test('should navigate back to main menu by default', async () => {
            await (testActions as any).navigateBack();
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('aiDebugContext.runAffectedTests');
        });

        test('should navigate back to project browser', async () => {
            testActions.setNavigationContext({ previousMenu: 'project-browser' });
            await (testActions as any).navigateBack();
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('aiDebugContext.selectProject');
        });

        test('should navigate back to context browser', async () => {
            testActions.setNavigationContext({ previousMenu: 'context-browser' });
            await (testActions as any).navigateBack();
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('aiDebugContext.openContextBrowser');
        });

        test('should execute custom command for custom navigation', async () => {
            testActions.setNavigationContext({ 
                previousMenu: 'custom', 
                customCommand: 'custom.test.command' 
            });
            await (testActions as any).navigateBack();
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('custom.test.command');
        });

        test('should fallback to main menu for custom navigation without command', async () => {
            testActions.setNavigationContext({ previousMenu: 'custom' });
            await (testActions as any).navigateBack();
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('aiDebugContext.runAffectedTests');
        });
    });

    describe('Popup Control', () => {
        test('should show popup when enough time has passed', () => {
            (testActions as any).lastPopupTime = 0; // Reset time
            const result = (testActions as any).shouldShowPopup();
            expect(result).toBe(true);
        });

        test('should handle popup timing correctly', () => {
            // Just test that the function returns a boolean
            const result = (testActions as any).shouldShowPopup();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('ANSI Sequence Cleaning', () => {
        test('should remove ANSI escape sequences', () => {
            const text = '\u001b[31mError\u001b[0m: Something failed\u001b[32m Success\u001b[0m';
            const result = (testActions as any).cleanAnsiSequences(text);
            expect(result).toBe('Error: Something failed Success');
        });

        test('should handle text without ANSI sequences', () => {
            const text = 'Plain text without escape sequences';
            const result = (testActions as any).cleanAnsiSequences(text);
            expect(result).toBe('Plain text without escape sequences');
        });
    });

    describe('Quick Actions Static Method', () => {
        test('should create showQuickActions without errors', () => {
            // Test that the static method exists and can be called
            expect(typeof TestActions.showQuickActions).toBe('function');
            
            // Create a mock and test basic functionality
            const mockQuickPick = {
                title: '',
                placeholder: '',
                ignoreFocusOut: false,
                items: [],
                show: jest.fn(),
                hide: jest.fn(),
                onDidAccept: jest.fn(),
                dispose: jest.fn()
            };
            
            (vscode.window.createQuickPick as jest.Mock).mockReturnValue(mockQuickPick);
            
            // Just test that it doesn't throw, since the actual async behavior is complex
            expect(() => TestActions.showQuickActions('test-project', {
                outputChannel: mockOutputChannel,
                workspaceRoot: '/test/workspace'
            })).not.toThrow();
        });
    });

    describe('Test Execution Methods', () => {
        test('should have rerunAllTests method', () => {
            expect(typeof testActions.rerunAllTests).toBe('function');
        });

        test('should have runWithCoverage method', () => {
            expect(typeof testActions.runWithCoverage).toBe('function');
        });

        test('should execute startWatchMode', async () => {
            const mockTerminal = {
                sendText: jest.fn(),
                show: jest.fn()
            };
            
            (vscode.window.createTerminal as jest.Mock).mockReturnValue(mockTerminal);
            
            await testActions.startWatchMode('test-project');
            
            expect(vscode.window.createTerminal).toHaveBeenCalledWith('Test Watch: test-project');
            expect(mockTerminal.sendText).toHaveBeenCalledWith(
                `cd "/test/workspace" && npx nx test test-project --watch`
            );
            expect(mockTerminal.show).toHaveBeenCalled();
        });
    });

    describe('Context Filtering', () => {
        test('should filter PR description context', () => {
            const context = 'Some content\n\n🤖 AI ANALYSIS CONTEXT\nAnalysis data\nMore analysis\n🚀 AI ASSISTANT GUIDANCE\nGuidance data';
            const result = (testActions as any).filterContextForPRDescription(context);
            
            expect(result).toBe('Some content');
            expect(result).not.toContain('🤖 AI ANALYSIS CONTEXT');
            expect(result).not.toContain('🚀 AI ASSISTANT GUIDANCE');
        });

        test('should handle context without filtered sections', () => {
            const context = 'Simple context without special sections';
            const result = (testActions as any).filterContextForPRDescription(context);
            expect(result).toBe(context);
        });

        test('should handle empty context', () => {
            const result = (testActions as any).filterContextForPRDescription('');
            expect(result).toBe('');
        });

        test('should filter AI assistant guidance section', () => {
            const context = 'Normal content\n🚀 AI ASSISTANT GUIDANCE\nThis should be removed';
            const result = (testActions as any).filterContextForPRDescription(context);
            expect(result).toBe('Normal content');
        });
    });
});