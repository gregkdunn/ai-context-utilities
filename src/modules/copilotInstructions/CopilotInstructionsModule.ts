/**
 * Copilot Instructions Module
 * Phase 3.5.0 - Automated Copilot instruction generation
 * 
 * This module generates and maintains GitHub Copilot instruction files
 * based on workspace analysis without modifying existing extension code.
 */

import * as vscode from 'vscode';
import { ServiceContainer } from '../../core/ServiceContainer';
import { CopilotInstructionsGenerator } from './CopilotInstructionsGenerator';
import { InstructionBackupManager } from './InstructionBackupManager';

export class CopilotInstructionsModule {
    private generator: CopilotInstructionsGenerator;
    private backupManager: InstructionBackupManager;

    constructor(
        private services: ServiceContainer,
        private outputChannel: vscode.OutputChannel
    ) {
        this.backupManager = new InstructionBackupManager(
            services.workspaceRoot,
            outputChannel
        );
        
        this.generator = new CopilotInstructionsGenerator(
            services,
            outputChannel,
            this.backupManager
        );
    }

    /**
     * Main command handler - single integration point with extension
     */
    async addCopilotInstructionContexts(): Promise<void> {
        try {
            this.outputChannel.appendLine('🤖 Starting Copilot Instructions generation...');
            this.outputChannel.show();
            this.services.updateStatusBar('🤖 Analyzing project...', 'yellow');

            // Create a mock progress and cancellation token for internal use
            const mockProgress = {
                report: (value: { message?: string; increment?: number }) => {
                    // Progress updates are handled via status bar instead
                }
            };
            
            const mockToken = {
                isCancellationRequested: false,
                onCancellationRequested: () => ({ dispose: () => {} })
            };

            await this.generator.run(mockProgress, mockToken);

            this.outputChannel.appendLine('✅ Copilot Instructions generation completed');
            this.services.updateStatusBar('✅ Instructions ready', 'green');
        } catch (error) {
            if (error instanceof Error && error.message === 'Operation cancelled') {
                this.outputChannel.appendLine('⚠️ Operation cancelled by user');
                this.services.updateStatusBar('Ready');
            } else {
                this.outputChannel.appendLine(`❌ Failed to generate instructions: ${error}`);
                this.services.updateStatusBar('❌ Setup failed', 'red');
                vscode.window.showErrorMessage(
                    `Failed to generate Copilot instructions: ${error}`
                );
            }
        }
    }

    /**
     * Register the command with VSCode
     */
    static registerCommand(context: vscode.ExtensionContext, module: CopilotInstructionsModule): void {
        const disposable = vscode.commands.registerCommand(
            'aiDebugContext.addCopilotInstructionContexts',
            () => module.addCopilotInstructionContexts()
        );
        context.subscriptions.push(disposable);
    }
}