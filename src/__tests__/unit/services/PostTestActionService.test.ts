/**
 * Unit tests for PostTestActionService
 * Tests post-test action handling and UI interactions
 */

import { PostTestActionService, PostTestAction } from '../../../services/PostTestActionService';
import { ServiceContainer } from '../../../core/ServiceContainer';
import { TestResult } from '../../../services/TestExecutionService';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        showQuickPick: jest.fn(),
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn()
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

// Mock modules
jest.mock('../../../modules/aiContext/ContextCompiler');
jest.mock('../../../modules/testOutput/TestOutputCapture');
jest.mock('../../../modules/gitDiff/GitDiffCapture');

describe('PostTestActionService', () => {
    let service: PostTestActionService;
    let mockServices: jest.Mocked<ServiceContainer>;
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

        // Create mock service container
        mockServices = {
            workspaceRoot: '/test/workspace',
            outputChannel: mockOutputChannel,
            updateStatusBar: jest.fn(),
            errorHandler: {
                handleError: jest.fn()
            }
        } as any;

        service = new PostTestActionService(mockServices);
        jest.clearAllMocks();
    });

    describe('showPostTestActions', () => {
        const mockRequest = {
            type: 'project',
            target: 'test-project',
            testPath: 'src/test.spec.ts'
        };

        test('should show failure actions when tests fail', async () => {
            const failedResult: TestResult = {
                success: false,
                project: 'test-project',
                exitCode: 1,
                stdout: 'Test failed',
                stderr: 'Error output',
                duration: 5000,
                summary: { passed: 0, failed: 1, skipped: 0, total: 1, failures: [] }
            };

            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                label: '$(hubot) AI Debug',
                action: jest.fn()
            });

            await service.showPostTestActions(failedResult, mockRequest);

            expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ label: expect.stringContaining('AI Debug') }),
                    expect.objectContaining({ label: expect.stringContaining('View Output') }),
                    expect.objectContaining({ label: expect.stringContaining('Rerun Tests') })
                ]),
                expect.objectContaining({
                    placeHolder: 'Tests failed. How can I help?',
                    title: 'Test Failure Actions'
                })
            );
        });

        test('should show success actions when tests pass', async () => {
            const successResult: TestResult = {
                success: true,
                project: 'test-project',
                exitCode: 0,
                stdout: 'All tests passed',
                stderr: '',
                duration: 3000,
                summary: { passed: 1, failed: 0, skipped: 0, total: 1, failures: [] }
            };

            await service.showPostTestActions(successResult, mockRequest);

            expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ label: expect.stringContaining('New Tests') }),
                    expect.objectContaining({ label: expect.stringContaining('PR Description') }),
                    expect.objectContaining({ label: expect.stringContaining('Commit Changes') })
                ]),
                expect.objectContaining({
                    placeHolder: 'Tests passed! What next?',
                    title: 'Test Success Actions'
                })
            );
        });

        test('should execute selected action', async () => {
            const mockAction = jest.fn();
            const failedResult: TestResult = {
                success: false,
                project: 'test-project',
                exitCode: 1,
                stdout: '',
                stderr: '',
                duration: 1000,
                summary: { passed: 0, failed: 1, skipped: 0, total: 1, failures: [] }
            };

            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                label: '$(hubot) AI Debug',
                action: mockAction
            });

            await service.showPostTestActions(failedResult, mockRequest);

            expect(mockAction).toHaveBeenCalled();
        });

        test('should handle dismiss action', async () => {
            const failedResult: TestResult = {
                success: false,
                project: 'test-project',
                exitCode: 1,
                stdout: '',
                stderr: '',
                duration: 1000,
                summary: { passed: 0, failed: 1, skipped: 0, total: 1, failures: [] }
            };

            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                label: '$(close) Dismiss',
                action: async () => {}
            });

            await service.showPostTestActions(failedResult, mockRequest);

            // Should not throw error
            expect(vscode.window.showQuickPick).toHaveBeenCalled();
        });

        test('should handle no selection', async () => {
            const failedResult: TestResult = {
                success: false,
                project: 'test-project',
                exitCode: 1,
                stdout: '',
                stderr: '',
                duration: 1000,
                summary: { passed: 0, failed: 1, skipped: 0, total: 1, failures: [] }
            };

            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            await service.showPostTestActions(failedResult, mockRequest);

            // Should not throw error
            expect(vscode.window.showQuickPick).toHaveBeenCalled();
        });
    });

    describe('AI Debug action', () => {
        test('should generate AI context for debugging', async () => {
            const failedResult: TestResult = {
                success: false,
                project: 'test-project',
                exitCode: 1,
                stdout: 'Test output',
                stderr: 'Error',
                duration: 2000,
                summary: { passed: 0, failed: 1, skipped: 0, total: 1, failures: [] }
            };

            // Mock the context compiler
            const mockCompileContext = jest.fn().mockResolvedValue('AI context');
            const mockCopyToClipboard = jest.fn().mockResolvedValue(true);
            
            const contextCompiler = require('../../../modules/aiContext/ContextCompiler').ContextCompiler;
            contextCompiler.prototype.compileContext = mockCompileContext;
            contextCompiler.prototype.copyToClipboard = mockCopyToClipboard;

            // Select AI Debug action
            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const aiDebugItem = items.find((item: any) => 
                    item.label.includes('AI Debug')
                );
                await aiDebugItem.action();
                return aiDebugItem;
            });

            await service.showPostTestActions(failedResult, {});

            expect(mockCompileContext).toHaveBeenCalledWith('debug', false);
            expect(mockCopyToClipboard).toHaveBeenCalled();
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.action.chat.open');
        });

        test('should handle AI context generation failure', async () => {
            const failedResult: TestResult = {
                success: false,
                project: 'test-project',
                exitCode: 1,
                stdout: '',
                stderr: '',
                duration: 1000,
                summary: { passed: 0, failed: 1, skipped: 0, total: 1, failures: [] }
            };

            const contextCompiler = require('../../../modules/aiContext/ContextCompiler').ContextCompiler;
            contextCompiler.prototype.compileContext = jest.fn().mockResolvedValue(null);

            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const aiDebugItem = items.find((item: any) => 
                    item.label.includes('AI Debug')
                );
                await aiDebugItem.action();
                return aiDebugItem;
            });

            await service.showPostTestActions(failedResult, {});

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                'Failed to generate AI context. Please ensure test output and git diff are available.'
            );
        });
    });

    describe('View Output action', () => {
        test('should show test output', async () => {
            const failedResult: TestResult = {
                success: false,
                project: 'test-project',
                exitCode: 1,
                stdout: 'Test output here',
                stderr: 'Error output',
                duration: 1000,
                summary: { passed: 0, failed: 1, skipped: 0, total: 1, failures: [] }
            };

            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const viewOutputItem = items.find((item: any) => 
                    item.label.includes('View Output')
                );
                await viewOutputItem.action();
                return viewOutputItem;
            });

            await service.showPostTestActions(failedResult, {});

            expect(mockOutputChannel.clear).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Test output here');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Error output');
            expect(mockOutputChannel.show).toHaveBeenCalled();
        });
    });

    describe('Rerun Tests action', () => {
        test('should rerun tests with same parameters', async () => {
            const failedResult: TestResult = {
                success: false,
                project: 'test-project',
                exitCode: 1,
                stdout: '',
                stderr: '',
                duration: 1000,
                summary: { passed: 0, failed: 1, skipped: 0, total: 1, failures: [] }
            };

            const mockRequest = {
                type: 'project',
                target: 'test-project'
            };

            // Mock VS Code command execution for rerun tests
            (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const rerunItem = items.find((item: any) => 
                    item.label.includes('Rerun Tests')
                );
                await rerunItem.action();
                return rerunItem;
            });

            await service.showPostTestActions(failedResult, mockRequest);

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('aiDebugContext.runAffectedTests');
        });
    });

    describe('Success actions', () => {
        test('should generate new tests suggestion', async () => {
            const successResult: TestResult = {
                success: true,
                project: 'test-project',
                exitCode: 0,
                stdout: 'All passed',
                stderr: '',
                duration: 1000,
                summary: { passed: 1, failed: 0, skipped: 0, total: 1, failures: [] }
            };

            const contextCompiler = require('../../../modules/aiContext/ContextCompiler').ContextCompiler;
            contextCompiler.prototype.compileContext = jest.fn().mockResolvedValue('AI context');
            contextCompiler.prototype.copyToClipboard = jest.fn().mockResolvedValue(true);

            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const newTestsItem = items.find((item: any) => 
                    item.label.includes('New Tests')
                );
                await newTestsItem.action();
                return newTestsItem;
            });

            await service.showPostTestActions(successResult, {});

            expect(contextCompiler.prototype.compileContext).toHaveBeenCalledWith('new-tests', true);
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.action.chat.open');
        });

        test('should generate PR description', async () => {
            const successResult: TestResult = {
                success: true,
                project: 'test-project',
                exitCode: 0,
                stdout: '',
                stderr: '',
                duration: 1000,
                summary: { passed: 1, failed: 0, skipped: 0, total: 1, failures: [] }
            };

            const contextCompiler = require('../../../modules/aiContext/ContextCompiler').ContextCompiler;
            contextCompiler.prototype.compileContext = jest.fn().mockResolvedValue('PR context');
            contextCompiler.prototype.copyToClipboard = jest.fn().mockResolvedValue(true);

            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const prItem = items.find((item: any) => 
                    item.label.includes('PR Description')
                );
                await prItem.action();
                return prItem;
            });

            await service.showPostTestActions(successResult, {});

            expect(contextCompiler.prototype.compileContext).toHaveBeenCalledWith('pr-description', true);
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'PR description context copied to clipboard. Ready to paste in GitHub!'
            );
        });

        test('should handle commit changes action', async () => {
            const successResult: TestResult = {
                success: true,
                project: 'test-project',
                exitCode: 0,
                stdout: '',
                stderr: '',
                duration: 1000,
                summary: { passed: 1, failed: 0, skipped: 0, total: 1, failures: [] }
            };

            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const commitItem = items.find((item: any) => 
                    item.label.includes('Commit Changes')
                );
                await commitItem.action();
                return commitItem;
            });

            await service.showPostTestActions(successResult, {});

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('git.commit');
        });
    });
});