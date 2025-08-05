/**
 * Unit tests for extension.ts
 */

import * as vscode from 'vscode';
import { activate, deactivate } from '../../extension';
import { ServiceContainer } from '../../core/ServiceContainer';
import { CommandRegistry } from '../../core/CommandRegistry';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn()
    },
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' }
        }]
    }
}));

jest.mock('../../core/ServiceContainer');
jest.mock('../../core/CommandRegistry');

describe('Extension', () => {
    let mockContext: vscode.ExtensionContext;
    let mockServiceContainer: any;
    let mockCommandRegistry: any;
    let mockSetupWizard: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockContext = {
            extensionPath: '/test/extension',
            subscriptions: []
        } as any;

        mockSetupWizard = {
            isSetupNeeded: jest.fn().mockResolvedValue(false),
            runSetupWizard: jest.fn().mockResolvedValue(undefined)
        };

        mockServiceContainer = {
            outputChannel: {
                appendLine: jest.fn()
            },
            setupWizard: mockSetupWizard,
            dispose: jest.fn()
        };

        mockCommandRegistry = {
            registerAll: jest.fn().mockReturnValue([]),
            dispose: jest.fn()
        };

        (ServiceContainer.create as jest.Mock).mockResolvedValue(mockServiceContainer);
        (CommandRegistry as jest.MockedClass<typeof CommandRegistry>).mockImplementation(() => mockCommandRegistry);
    });

    describe('activate', () => {
        it('should activate successfully with workspace', async () => {
            await activate(mockContext);

            expect(ServiceContainer.create).toHaveBeenCalledWith(
                '/test/workspace',
                '/test/extension',
                mockContext
            );
            expect(mockCommandRegistry.registerAll).toHaveBeenCalled();
            expect(mockServiceContainer.outputChannel.appendLine).toHaveBeenCalledWith(
                '🚀 AI Context Utilities V3.1.0 activated successfully'
            );
        });

        it('should show error when no workspace is open', async () => {
            // Temporarily change workspace folders
            const originalWorkspaceFolders = (vscode.workspace as any).workspaceFolders;
            (vscode.workspace as any).workspaceFolders = null;

            await activate(mockContext);

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                'AI Context Utilities requires an open workspace folder'
            );
            expect(ServiceContainer.create).not.toHaveBeenCalled();
            
            // Restore workspace folders
            (vscode.workspace as any).workspaceFolders = originalWorkspaceFolders;
        });

        it('should run setup wizard when setup is needed', async () => {
            mockSetupWizard.isSetupNeeded.mockResolvedValue(true);

            await activate(mockContext);

            expect(mockSetupWizard.isSetupNeeded).toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'AI Context Utilities: Running first-time setup to configure your environment.',
                'OK'
            );
            expect(mockServiceContainer.outputChannel.appendLine).toHaveBeenCalledWith(
                '🍎 First time setup detected. Running setup wizard...'
            );
        });

        it('should handle activation errors gracefully', async () => {
            const error = new Error('Test error');
            (ServiceContainer.create as jest.Mock).mockRejectedValue(error);

            await activate(mockContext);

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                'Failed to activate AI Context Utilities: Error: Test error'
            );
        });
    });

    describe('deactivate', () => {
        it('should deactivate cleanly after activation', async () => {
            // First activate to set up the module variables
            await activate(mockContext);
            
            // Now test deactivation
            deactivate();

            expect(mockCommandRegistry.dispose).toHaveBeenCalled();
            expect(mockServiceContainer.dispose).toHaveBeenCalled();
        });

        it('should handle deactivation errors gracefully', async () => {
            // First activate
            await activate(mockContext);
            
            // Make dispose throw an error
            mockServiceContainer.dispose.mockImplementation(() => {
                throw new Error('Dispose error');
            });

            // Should not throw
            expect(() => deactivate()).not.toThrow();
        });

        it('should handle missing services gracefully', () => {
            // Call deactivate without activation
            expect(() => deactivate()).not.toThrow();
        });
    });
});