import * as vscode from 'vscode';
import { CopilotInstructionsModule } from '../../../../modules/copilotInstructions/CopilotInstructionsModule';
import { ServiceContainer } from '../../../../core/ServiceContainer';

// Mock other modules
jest.mock('../../../../modules/copilotInstructions/CopilotInstructionsGenerator');
jest.mock('../../../../modules/copilotInstructions/InstructionBackupManager');

describe('Copilot Instructions Status Bar Integration', () => {
    let module: CopilotInstructionsModule;
    let mockServices: any;
    let mockOutputChannel: any;
    let mockProgress: any;
    let mockToken: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock output channel
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn()
        };

        // Create mock services with updateStatusBar
        mockServices = {
            workspaceRoot: '/test/workspace',
            updateStatusBar: jest.fn(),
            statusBarItem: {
                text: '',
                color: undefined,
                tooltip: ''
            }
        };

        // Mock progress and token
        mockProgress = {
            report: jest.fn()
        };

        mockToken = {
            isCancellationRequested: false,
            onCancellationRequested: jest.fn()
        };

        // Mock window.withProgress to execute callback immediately
        (vscode.window.withProgress as jest.Mock).mockImplementation(
            async (options, callback) => callback(mockProgress, mockToken)
        );

        module = new CopilotInstructionsModule(mockServices, mockOutputChannel);
    });

    describe('Status Bar Updates', () => {
        test('should update status bar when starting generation', async () => {
            await module.addCopilotInstructionContexts();

            expect(mockServices.updateStatusBar).toHaveBeenCalledWith(
                '🤖 Analyzing project...',
                'yellow'
            );
        });

        test('should show success status on completion', async () => {
            await module.addCopilotInstructionContexts();

            expect(mockServices.updateStatusBar).toHaveBeenCalledWith(
                '✅ Instructions ready',
                'green'
            );
        });

        test('should reset status bar on cancellation', async () => {
            // Mock generator to throw cancellation error
            const { CopilotInstructionsGenerator } = require('../../../../modules/copilotInstructions/CopilotInstructionsGenerator');
            CopilotInstructionsGenerator.prototype.run.mockRejectedValue(
                new Error('Operation cancelled')
            );

            await module.addCopilotInstructionContexts();

            expect(mockServices.updateStatusBar).toHaveBeenCalledWith('Ready');
        });

        test('should show error status on failure', async () => {
            // Mock generator to throw error
            const { CopilotInstructionsGenerator } = require('../../../../modules/copilotInstructions/CopilotInstructionsGenerator');
            CopilotInstructionsGenerator.prototype.run.mockRejectedValue(
                new Error('Test error')
            );

            await module.addCopilotInstructionContexts();

            expect(mockServices.updateStatusBar).toHaveBeenCalledWith(
                '❌ Setup failed',
                'red'
            );
        });
    });

    describe('Status Bar Text Format', () => {
        test('should follow established "AI Context Util: Ready" pattern', () => {
            // This test verifies that the status bar updates follow the pattern
            // The actual formatting is done by ServiceContainer.updateStatusBar
            expect(mockServices.updateStatusBar).toBeDefined();
            
            // Verify the module uses the service method correctly
            module.addCopilotInstructionContexts();
            
            // Should start with analyzing status
            expect(mockServices.updateStatusBar).toHaveBeenCalledWith(
                expect.stringContaining('Analyzing'),
                'yellow'
            );
        });
    });

    describe('Progress Integration', () => {
        test('should show progress notifications alongside status bar', async () => {
            await module.addCopilotInstructionContexts();

            // Verify progress location
            expect(vscode.window.withProgress).toHaveBeenCalledWith(
                expect.objectContaining({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Generating Copilot Instructions',
                    cancellable: true
                }),
                expect.any(Function)
            );
        });
    });

    describe('Error Handling', () => {
        test('should show error message and update status bar on failure', async () => {
            const testError = new Error('Test failure');
            const { CopilotInstructionsGenerator } = require('../../../../modules/copilotInstructions/CopilotInstructionsGenerator');
            CopilotInstructionsGenerator.prototype.run.mockRejectedValue(testError);

            await module.addCopilotInstructionContexts();

            // Should show error message
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                'Failed to generate Copilot instructions: Error: Test failure'
            );

            // Should update status bar to error state
            expect(mockServices.updateStatusBar).toHaveBeenCalledWith(
                '❌ Setup failed',
                'red'
            );

            // Should log error to output channel
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '❌ Failed to generate instructions: Error: Test failure'
            );
        });
    });
});