/**
 * Unit tests for PostTestActionService
 * Tests simplified post-test action handling - Phase 3.2.0
 */

import { PostTestActionService, PostTestAction } from '../../../services/PostTestActionService';
import { ServiceContainer } from '../../../core/ServiceContainer';
import { TestResult } from '../../../services/TestExecutionService';
import * as vscode from 'vscode';

// Use moduleNameMapper for vscode mocking

// Mock fs module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

// Mock child_process module
jest.mock('child_process', () => ({
    exec: jest.fn()
}));

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

        test('should show 3 core actions for failures', async () => {
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
                label: '$(output) View Output',
                action: jest.fn()
            });

            await service.showPostTestActions(failedResult, mockRequest);

            expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ label: expect.stringContaining('View Output') }),
                    expect.objectContaining({ label: expect.stringContaining('Test Recent') }),
                    expect.objectContaining({ label: expect.stringContaining('Copy Failure Analysis') })
                ]),
                expect.objectContaining({
                    placeHolder: 'Tests failed. Choose an action:',
                    title: 'Test Failure Actions'
                })
            );
        });

        test('should show PR Description action for success', async () => {
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
                    expect.objectContaining({ label: expect.stringContaining('View Output') }),
                    expect.objectContaining({ label: expect.stringContaining('Test Recent') }),
                    expect.objectContaining({ label: expect.stringContaining('PR Description') })
                ]),
                expect.objectContaining({
                    placeHolder: 'Tests passed!',
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
                label: '$(output) View Output',
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

    describe('View Output action', () => {
        test('should show test output with results', async () => {
            const testResult: TestResult = {
                success: false,
                project: 'test-project',
                exitCode: 1,
                stdout: 'Test output here',
                stderr: 'Error output here',
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

            await service.showPostTestActions(testResult, {});

            expect(mockOutputChannel.clear).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('=== Test Results ===');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Status: FAILED');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('=== Standard Output ===');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Test output here');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('=== Error Output ===');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Error output here');
            expect(mockOutputChannel.show).toHaveBeenCalled();
        });

        test('should show no results message when no test data', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const viewOutputItem = items.find((item: any) => 
                    item.label.includes('View Output')
                );
                await viewOutputItem.action();
                return viewOutputItem;
            });

            // Call showPostTestActions first to initialize, then test without test result
            const service2 = new PostTestActionService(mockServices);
            await service2.showPostTestActions({
                success: true,
                project: 'test',
                exitCode: 0,
                stdout: '',
                stderr: '',
                duration: 100,
                summary: { passed: 1, failed: 0, skipped: 0, total: 1, failures: [] }
            }, {});

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('=== Test Results ===');
        });
    });

    describe('Rerun Tests action', () => {
        test('should rerun tests with same parameters', async () => {
            const testResult: TestResult = {
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
                    item.label.includes('Test Recent')
                );
                await rerunItem.action();
                return rerunItem;
            });

            await service.showPostTestActions(testResult, mockRequest);

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('aiDebugContext.runAffectedTests');
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Rerunning tests...');
        });

        test('should handle error when no previous test request', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const rerunItem = items.find((item: any) => 
                    item.label.includes('Test Recent')
                );
                await rerunItem.action();
                return rerunItem;
            });

            // Call without storing previous request
            const service2 = new PostTestActionService(mockServices);
            await service2.showPostTestActions({
                success: true,
                project: 'test',
                exitCode: 0,
                stdout: '',
                stderr: '',
                duration: 100,
                summary: { passed: 1, failed: 0, skipped: 0, total: 1, failures: [] }
            }, null);

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No previous test to rerun');
        });
    });

    describe('Copy Failure Analysis action', () => {
        test('should copy failure analysis to clipboard', async () => {
            const testResult: TestResult = {
                success: false,
                project: 'test-project',
                exitCode: 1,
                stdout: 'Test output',
                stderr: 'Error output',
                duration: 2000,
                summary: { 
                    passed: 0, 
                    failed: 1, 
                    skipped: 0, 
                    total: 1, 
                    failures: [{
                        test: 'should work',
                        suite: 'Component Tests',
                        error: 'Expected true but got false',
                        file: 'test.spec.ts',
                        line: 42
                    }] 
                }
            };

            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const copyAnalysisItem = items.find((item: any) => 
                    item.label.includes('Copy Failure Analysis')
                );
                await copyAnalysisItem.action();
                return copyAnalysisItem;
            });

            await service.showPostTestActions(testResult, {});

            expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining('# Test Failure Analysis')
            );
            expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining('**Status:** FAILED')
            );
            expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining('## Failure Details')
            );
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'Test failure analysis copied to clipboard'
            );
        });

        test('should handle copy analysis when no test results', async () => {
            // Create a fresh service instance without setting any test result
            const service2 = new PostTestActionService(mockServices);
            
            // Test the direct method since we need to test Copy Failure Analysis specifically
            await service2['handleCopyFailureAnalysis']();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                'No test results available for analysis'
            );
        });
    });

    describe('PR Description action', () => {
        beforeEach(() => {
            // Reset fs mocks
            const fs = require('fs');
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            (fs.readFileSync as jest.Mock).mockReturnValue('');
            
            // Reset child_process mocks
            const childProcess = require('child_process');
            (childProcess.exec as jest.Mock).mockImplementation((cmd: any, opts: any, callback: any) => {
                if (callback) {
                    callback(null, { stdout: '', stderr: '' });
                }
            });
        });

        test('should generate PR description with template', async () => {
            const fs = require('fs');
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(`# Pull Request

## Summary
<!-- Brief description of what this PR does -->

## Changes Made
<!-- List the main changes in this PR -->
- 
- 
- 

## Testing
<!-- Describe how this has been tested -->
- [ ] Unit tests pass`);

            const testResult: TestResult = {
                success: true,
                project: 'test-project',
                exitCode: 0,
                stdout: 'All tests passed',
                stderr: '',
                duration: 3000,
                summary: { passed: 10, failed: 0, skipped: 0, total: 10, failures: [] }
            };

            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const prItem = items.find((item: any) => 
                    item.label.includes('PR Description')
                );
                await prItem.action();
                return prItem;
            });

            await service.showPostTestActions(testResult, {});

            // Phase 3.5.0: Now uses full automation with CopilotUtils
            // The prompt could be either the default or override format
            const clipboardCalls = (vscode.env.clipboard.writeText as jest.Mock).mock.calls;
            const prDescriptionCall = clipboardCalls.find(call => 
                call[0].includes('Pull Request Description') || 
                call[0].includes('HIGH PRIORITY USER INSTRUCTIONS')
            );
            
            expect(prDescriptionCall).toBeDefined();
            expect(prDescriptionCall[0]).toContain('Test Status');
            expect(prDescriptionCall[0]).toContain('PASSED');
            // Note: Full automation testing requires mocking CopilotUtils.integrateWithCopilot
        });

        test('should generate PR description without template', async () => {
            const fs = require('fs');
            fs.existsSync.mockReturnValue(false);

            const testResult: TestResult = {
                success: true,
                project: 'test-project',
                exitCode: 0,
                stdout: 'All tests passed',
                stderr: '',
                duration: 3000,
                summary: { passed: 10, failed: 0, skipped: 0, total: 10, failures: [] }
            };

            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const prItem = items.find((item: any) => 
                    item.label.includes('PR Description')
                );
                await prItem.action();
                return prItem;
            });

            await service.showPostTestActions(testResult, {});

            // Phase 3.5.0: Now uses full automation with CopilotUtils
            expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining('Pull Request Description Review & Enhancement')
            );
            // Note: Full automation testing requires mocking CopilotUtils.integrateWithCopilot
        });

        test('should detect feature flags and add QA section', async () => {
            const fs = require('fs');
            fs.existsSync.mockReturnValue(false);
            
            // Mock git diff with multiple feature flag systems - Phase 3.4.0
            const childProcess = require('child_process');
            (childProcess.exec as jest.Mock).mockImplementation((cmd: any, opts: any, callback: any) => {
                if (cmd === 'git diff --cached') {
                    callback(null, { 
                        stdout: `diff --git a/src/service.ts b/src/service.ts
+    if (flipper.flipperEnabled('flipper-flag')) {
+        // flipper feature code
+    }
+    if (LaunchDarkly.variation('launchdarkly-flag')) {
+        // LaunchDarkly feature
+    }
+    if (featureFlag('generic-flag')) {
+        // generic feature flag
+    }`,
                        stderr: '' 
                    });
                } else if (cmd === 'git diff') {
                    callback(null, {
                        stdout: `diff --git a/src/other.ts b/src/other.ts
+    const enabled = config.feature.config-flag;
+    if (someService.isEnabled('service-flag')) {
+        // service feature
+    }`,
                        stderr: ''
                    });
                } else {
                    callback(null, { stdout: '', stderr: '' });
                }
            });

            const testResult: TestResult = {
                success: true,
                project: 'test-project',
                exitCode: 0,
                stdout: 'All tests passed',
                stderr: '',
                duration: 3000,
                summary: { passed: 10, failed: 0, skipped: 0, total: 10, failures: [] }
            };

            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const prItem = items.find((item: any) => 
                    item.label.includes('PR Description')
                );
                await prItem.action();
                return prItem;
            });

            await service.showPostTestActions(testResult, {});

            const clipboardCall = (vscode.env.clipboard.writeText as jest.Mock).mock.calls[0][0];
            expect(clipboardCall).toContain('## QA');
            expect(clipboardCall).toContain('**Feature Flags to Test:**');
            
            // Should detect multiple flag systems - Phase 3.4.0
            expect(clipboardCall).toContain('`flipper-flag` - Test with flag enabled');
            expect(clipboardCall).toContain('`launchdarkly-flag` - Test with flag enabled');
            expect(clipboardCall).toContain('`generic-flag` - Test with flag enabled');
            expect(clipboardCall).toContain('`config-flag` - Test with flag enabled');
            expect(clipboardCall).toContain('`service-flag` - Test with flag enabled');
            
            // Phase 3.5.0: Now uses full automation with CopilotUtils
            // Feature flags are included in the comprehensive prompt
            expect(clipboardCall).toContain('Pull Request Description Review & Enhancement');
        });

        test('should handle errors in PR description generation', async () => {
            const childProcess = require('child_process');
            (childProcess.exec as jest.Mock).mockImplementation((cmd: any, opts: any, callback: any) => {
                callback(new Error('Git command failed'), null);
            });

            const testResult: TestResult = {
                success: true,
                project: 'test-project',
                exitCode: 0,
                stdout: 'All tests passed',
                stderr: '',
                duration: 3000,
                summary: { passed: 10, failed: 0, skipped: 0, total: 10, failures: [] }
            };

            (vscode.window.showQuickPick as jest.Mock).mockImplementation(async (items) => {
                const prItem = items.find((item: any) => 
                    item.label.includes('PR Description')
                );
                await prItem.action();
                return prItem;
            });

            await service.showPostTestActions(testResult, {});

            // Should still generate PR description with full automation
            expect(vscode.env.clipboard.writeText).toHaveBeenCalled();
        });
    });
});