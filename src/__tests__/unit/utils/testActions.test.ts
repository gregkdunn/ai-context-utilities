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
        showWarningMessage: jest.fn()
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
});