/**
 * Copilot Integration Utility
 * Centralizes Copilot Chat integration patterns to reduce code duplication
 */

import * as vscode from 'vscode';

export interface CopilotIntegrationResult {
    success: boolean;
    method: 'auto-submit' | 'manual-paste' | 'clipboard-only' | 'failed';
}

export interface CopilotMessages {
    autoSuccess: string;
    manualPaste: string;
    clipboardOnly: string;
    chatOpenFailed: string;
}

/**
 * Utility class for Copilot Chat integration
 */
export class CopilotUtils {
    private static DEFAULT_MESSAGES: CopilotMessages = {
        autoSuccess: '🚀 Test analysis sent to Copilot Chat!',
        manualPaste: '📋 Copilot Chat ready. Content in clipboard - paste (Ctrl+V/Cmd+V) and press Enter.',
        clipboardOnly: '📋 AI context copied to clipboard. Please open Copilot Chat and paste.',
        chatOpenFailed: '⚠️ Could not open Copilot Chat. Please open it manually and paste the content.'
    };

    /**
     * Attempt to open Copilot Chat using various command fallbacks
     */
    static async openCopilotChat(): Promise<boolean> {
        const commands = [
            'workbench.panel.chat.view.copilot.focus',
            'github.copilot.openChat',
            'github.copilot.chat.focus',
            'workbench.action.chat.open',
            'workbench.action.chat.openCopilot',
            'github.copilot.openCopilotSideBar'
        ];

        for (const command of commands) {
            try {
                await vscode.commands.executeCommand(command);
                console.log(`✅ DEBUG: Successfully opened Copilot Chat with command: ${command}`);
                return true;
            } catch (error) {
                console.log(`❌ DEBUG: Failed to open Copilot Chat with command: ${command}, error: ${error}`);
                continue;
            }
        }
        return false;
    }

    /**
     * Attempt automatic paste to Copilot Chat
     */
    static async tryAutomaticPaste(): Promise<boolean> {
        const pasteMethods = [
            async () => {
                console.log('DEBUG: Trying editor.action.clipboardPasteAction');
                await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
                return true;
            },
            async () => {
                console.log('DEBUG: Trying editor.action.pasteAndGoToPosition');
                await vscode.commands.executeCommand('editor.action.pasteAndGoToPosition');
                return true;
            },
            async () => {
                console.log('DEBUG: Trying workbench.action.terminal.paste');
                await vscode.commands.executeCommand('workbench.action.terminal.paste');
                return true;
            }
        ];

        for (let i = 0; i < pasteMethods.length; i++) {
            try {
                // Focus on Copilot Chat input before each attempt
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                await pasteMethods[i]();
                console.log(`✅ DEBUG: Paste method ${i + 1} succeeded`);
                await new Promise(resolve => setTimeout(resolve, 300));
                return true;
            } catch (error) {
                console.log(`❌ DEBUG: Paste method ${i + 1} failed: ${error}`);
                continue;
            }
        }
        
        return false;
    }

    /**
     * Attempt automatic submit using various methods
     */
    static async tryAutomaticSubmit(outputChannel: vscode.OutputChannel): Promise<boolean> {
        const submitMethods = [
            // Method 1: Standard Enter key
            async () => {
                await vscode.commands.executeCommand('workbench.action.acceptSelectedSuggestion');
                return true;
            },
            
            // Method 2: Chat-specific submit
            async () => {
                await vscode.commands.executeCommand('workbench.action.chat.submit');
                return true;
            },
            
            // Method 3: Terminal send sequence for Enter
            async () => {
                await vscode.commands.executeCommand('workbench.action.terminal.sendSequence', {
                    text: '\r'
                });
                return true;
            },
            
            // Method 4: Keyboard event simulation
            async () => {
                await vscode.commands.executeCommand('vscode.executeCommand', {
                    command: 'editor.action.triggerSuggest'
                });
                return true;
            },
            
            // Method 5: Generic submit
            async () => {
                await vscode.commands.executeCommand('editor.action.submitComment');
                return true;
            },
            
            // Method 6: Copilot specific submit
            async () => {
                await vscode.commands.executeCommand('github.copilot.chat.submit');
                return true;
            }
        ];

        for (let i = 0; i < submitMethods.length; i++) {
            try {
                await submitMethods[i]();
                outputChannel.appendLine(`✅ Submit method ${i + 1} executed successfully`);
                return true;
            } catch (error) {
                outputChannel.appendLine(`⚠️ Submit method ${i + 1} failed: ${error}`);
                continue;
            }
        }
        
        return false;
    }

    /**
     * Comprehensive Copilot integration with automatic fallbacks
     */
    static async integrateWithCopilot(
        content: string,
        outputChannel: vscode.OutputChannel,
        messages: Partial<CopilotMessages> = {}
    ): Promise<CopilotIntegrationResult> {
        const finalMessages = { ...this.DEFAULT_MESSAGES, ...messages };
        
        try {
            // Step 1: Copy to clipboard (always do this first)
            await vscode.env.clipboard.writeText(content);
            outputChannel.appendLine('📋 DEBUG: Content copied to clipboard successfully');
            
            // Step 2: Attempt to open Copilot Chat
            outputChannel.appendLine('🔍 DEBUG: Attempting to open Copilot Chat...');
            const chatOpened = await this.openCopilotChat();
            if (!chatOpened) {
                outputChannel.appendLine('❌ DEBUG: Failed to open Copilot Chat with any command');
                vscode.window.showWarningMessage(finalMessages.chatOpenFailed, { modal: false });
                return { success: false, method: 'clipboard-only' };
            }
            outputChannel.appendLine('✅ DEBUG: Copilot Chat opened successfully');

            // Step 3: Wait for chat to fully load
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Focus on Copilot Chat
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            
            // Step 4: Attempt automatic paste and submit
            outputChannel.appendLine('🚀 DEBUG: Attempting fully automated paste...');
            
            const pasteSuccess = await this.tryAutomaticPaste();
            if (!pasteSuccess) {
                outputChannel.appendLine('❌ DEBUG: Automatic paste failed');
                vscode.window.showInformationMessage(finalMessages.clipboardOnly, { modal: false });
                return { success: false, method: 'clipboard-only' };
            }
            outputChannel.appendLine('✅ DEBUG: Automatic paste succeeded');

            // Step 5: Try automatic submit
            outputChannel.appendLine('🚀 DEBUG: Attempting automatic submit...');
            const submitSuccess = await this.tryAutomaticSubmit(outputChannel);
            if (submitSuccess) {
                outputChannel.appendLine('✅ DEBUG: Automatic submit succeeded');
                vscode.window.showInformationMessage(finalMessages.autoSuccess, { modal: false });
                return { success: true, method: 'auto-submit' };
            } else {
                outputChannel.appendLine('⚠️ DEBUG: Automatic submit failed, but paste succeeded');
                vscode.window.showInformationMessage(finalMessages.manualPaste, { modal: false });
                return { success: true, method: 'manual-paste' };
            }
            
        } catch (error) {
            outputChannel.appendLine(`❌ Error in automated Copilot integration: ${error}`);
            await vscode.env.clipboard.writeText(content);
            vscode.window.showInformationMessage(finalMessages.clipboardOnly, { modal: false });
            return { success: false, method: 'failed' };
        }
    }

    /**
     * Focus on Copilot Chat (for view-analysis actions)
     */
    static async focusCopilotChat(): Promise<void> {
        try {
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
        } catch (error) {
            vscode.window.showInformationMessage('Please check Copilot Chat for AI analysis');
        }
    }
}