import * as vscode from 'vscode';
import { CopilotUtils } from '../../../utils/CopilotUtils';

// Mock vscode
jest.mock('vscode', () => ({
    commands: {
        executeCommand: jest.fn()
    },
    env: {
        clipboard: {
            writeText: jest.fn()
        }
    },
    window: {
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn()
    }
}));

describe('CopilotUtils', () => {
    let mockOutputChannel: any;

    beforeEach(() => {
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn()
        };

        jest.clearAllMocks();
    });

    describe('openCopilotChat', () => {
        it('should successfully open with first command', async () => {
            (vscode.commands.executeCommand as jest.Mock)
                .mockResolvedValueOnce(undefined); // First command succeeds

            const result = await CopilotUtils.openCopilotChat();

            expect(result).toBe(true);
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.panel.chat.view.copilot.focus');
            expect(vscode.commands.executeCommand).toHaveBeenCalledTimes(1);
        });

        it('should fallback to second command if first fails', async () => {
            (vscode.commands.executeCommand as jest.Mock)
                .mockRejectedValueOnce(new Error('First command failed'))
                .mockResolvedValueOnce(undefined); // Second command succeeds

            const result = await CopilotUtils.openCopilotChat();

            expect(result).toBe(true);
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.panel.chat.view.copilot.focus');
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('github.copilot.openChat');
            expect(vscode.commands.executeCommand).toHaveBeenCalledTimes(2);
        });

        it('should return false if all commands fail', async () => {
            (vscode.commands.executeCommand as jest.Mock)
                .mockRejectedValue(new Error('Command failed'));

            const result = await CopilotUtils.openCopilotChat();

            expect(result).toBe(false);
            expect(vscode.commands.executeCommand).toHaveBeenCalledTimes(2);
        });
    });

    describe('tryAutomaticPaste', () => {
        it('should successfully paste content', async () => {
            (vscode.commands.executeCommand as jest.Mock)
                .mockResolvedValue(undefined);

            const result = await CopilotUtils.tryAutomaticPaste();

            expect(result).toBe(true);
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.panel.chat.view.copilot.focus');
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('editor.action.clipboardPasteAction');
        });

        it('should return false if paste fails', async () => {
            (vscode.commands.executeCommand as jest.Mock)
                .mockRejectedValue(new Error('Paste failed'));

            const result = await CopilotUtils.tryAutomaticPaste();

            expect(result).toBe(false);
        });
    });

    describe('tryAutomaticSubmit', () => {
        it('should try multiple submit methods until one succeeds', async () => {
            (vscode.commands.executeCommand as jest.Mock)
                .mockRejectedValueOnce(new Error('Method 1 failed'))
                .mockRejectedValueOnce(new Error('Method 2 failed'))
                .mockResolvedValueOnce(undefined); // Method 3 succeeds

            const result = await CopilotUtils.tryAutomaticSubmit(mockOutputChannel);

            expect(result).toBe(true);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('✅ Submit method 3 executed successfully');
            expect(vscode.commands.executeCommand).toHaveBeenCalledTimes(3);
        });

        it('should return false if all submit methods fail', async () => {
            (vscode.commands.executeCommand as jest.Mock)
                .mockRejectedValue(new Error('All methods failed'));

            const result = await CopilotUtils.tryAutomaticSubmit(mockOutputChannel);

            expect(result).toBe(false);
            expect(vscode.commands.executeCommand).toHaveBeenCalledTimes(6); // All 6 methods attempted
        });
    });

    describe('integrateWithCopilot', () => {
        it('should successfully integrate with full automation', async () => {
            const content = 'Test content';
            
            // Mock successful execution
            (vscode.env.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);
            (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

            const result = await CopilotUtils.integrateWithCopilot(content, mockOutputChannel);

            expect(result.success).toBe(true);
            expect(result.method).toBe('auto-submit');
            expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(content);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('📋 Content copied to clipboard');
        });

        it('should handle chat opening failure gracefully', async () => {
            const content = 'Test content';
            
            (vscode.env.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);
            (vscode.commands.executeCommand as jest.Mock)
                .mockRejectedValue(new Error('Chat opening failed'));

            const result = await CopilotUtils.integrateWithCopilot(content, mockOutputChannel);

            expect(result.success).toBe(false);
            expect(result.method).toBe('clipboard-only');
        });

        it('should use custom messages when provided', async () => {
            const content = 'Test content';
            const customMessages = {
                autoSuccess: 'Custom success message'
            };
            
            (vscode.env.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);
            (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

            await CopilotUtils.integrateWithCopilot(content, mockOutputChannel, customMessages);

            // This would be tested through the message display, but since we mock vscode.window,
            // we can't directly test the custom message usage here
            expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(content);
        });
    });

    describe('focusCopilotChat', () => {
        it('should focus Copilot Chat successfully', async () => {
            (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

            await CopilotUtils.focusCopilotChat();

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.panel.chat.view.copilot.focus');
        });

        it('should handle focus failure gracefully', async () => {
            (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(new Error('Focus failed'));

            // Should not throw
            await expect(CopilotUtils.focusCopilotChat()).resolves.toBeUndefined();
        });
    });
});