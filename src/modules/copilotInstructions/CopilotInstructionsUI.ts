/**
 * Copilot Instructions UI
 * Handles user interactions for instruction generation
 */

import * as vscode from 'vscode';
import { InstructionBackupManager, Backup } from './InstructionBackupManager';

export type UserAction = 
    | 'update'
    | 'restore' 
    | 'remove'
    | 'cancel'
    | 'create';

export interface SetupOption {
    type: 'quick' | 'custom' | 'browse';
    frameworks?: string[];
}

export class CopilotInstructionsUI {
    constructor(
        private backupManager: InstructionBackupManager,
        private outputChannel: vscode.OutputChannel
    ) {}

    /**
     * Handle existing files - show options to user
     */
    async handleExistingFiles(hasBackup: boolean): Promise<UserAction> {
        const options: vscode.QuickPickItem[] = [
            { 
                label: '↻ Update existing files', 
                description: 'Create backup and update',
                detail: 'Your current files will be backed up before updating'
            }
        ];

        if (hasBackup) {
            options.push({
                label: '$(history) Restore previous version',
                description: 'Restore from backup',
                detail: 'Choose a previous version to restore'
            });
        }

        options.push(
            {
                label: '$(trash) Remove current files',
                description: 'Backup and remove',
                detail: 'Files will be backed up before removal'
            },
            {
                label: '$(close) Cancel',
                description: 'Do nothing',
                detail: 'Keep current files unchanged'
            }
        );

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: 'Copilot instructions already exist. What would you like to do?',
            ignoreFocusOut: true
        });

        if (!selection) {
            return 'cancel';
        }

        switch (selection.label) {
            case '↻ Update existing files':
                return 'update';
            case '$(history) Restore previous version':
                return 'restore';
            case '$(trash) Remove current files':
                return 'remove';
            default:
                return 'cancel';
        }
    }

    /**
     * Show setup options for new instructions
     */
    async showSetupOptions(): Promise<SetupOption | undefined> {
        const options: vscode.QuickPickItem[] = [
            {
                label: '$(rocket) Quick Setup',
                description: 'Use recommended settings',
                detail: 'Automatically detect frameworks and apply best practices'
            },
            {
                label: '$(settings-gear) Custom Setup',
                description: 'Configure each framework',
                detail: 'Choose which frameworks and options to include'
            },
            {
                label: '$(book) Browse Templates',
                description: 'See available templates',
                detail: 'Preview instruction templates before applying'
            }
        ];

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: 'How would you like to set up Copilot instructions?',
            ignoreFocusOut: true
        });

        if (!selection) {
            return undefined;
        }

        switch (selection.label) {
            case '$(rocket) Quick Setup':
                return { type: 'quick' };
            case '$(settings-gear) Custom Setup':
                return await this.showCustomSetup();
            case '$(book) Browse Templates':
                return { type: 'browse' };
            default:
                return undefined;
        }
    }

    /**
     * Show custom setup options
     */
    private async showCustomSetup(): Promise<SetupOption | undefined> {
        const frameworks = [
            { label: 'Angular', picked: false },
            { label: 'React', picked: false },
            { label: 'Vue', picked: false },
            { label: 'TypeScript', picked: true },
            { label: 'Jest', picked: false },
            { label: 'Vitest', picked: false },
            { label: 'Cypress', picked: false }
        ];

        const selected = await vscode.window.showQuickPick(frameworks, {
            placeHolder: 'Select frameworks to include instructions for',
            canPickMany: true,
            ignoreFocusOut: true
        });

        if (!selected || selected.length === 0) {
            return undefined;
        }

        return {
            type: 'custom',
            frameworks: selected.map(f => f.label)
        };
    }

    /**
     * Show restore UI with backup selection
     */
    async showRestoreUI(): Promise<string | undefined> {
        const backups = await this.backupManager.listBackups();
        
        if (backups.length === 0) {
            vscode.window.showInformationMessage('No backups available to restore');
            return undefined;
        }

        const items: vscode.QuickPickItem[] = backups.map(backup => ({
            label: this.formatBackupDate(backup.timestamp),
            description: `${backup.files.length} files`,
            detail: backup.files.join(', ')
        }));

        const selection = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a backup to restore',
            ignoreFocusOut: true
        });

        if (!selection) {
            return undefined;
        }

        // Find the backup ID from the selection
        const selectedBackup = backups.find(
            b => this.formatBackupDate(b.timestamp) === selection.label
        );

        return selectedBackup?.id;
    }

    /**
     * Show preview of generated instructions
     */
    async showPreview(content: string, title: string = 'Copilot Instructions Preview'): Promise<boolean> {
        const document = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });

        await vscode.window.showTextDocument(document, {
            preview: true,
            viewColumn: vscode.ViewColumn.Beside
        });

        const result = await vscode.window.showInformationMessage(
            'Review the generated instructions. Do you want to save them?',
            'Save',
            'Cancel'
        );

        return result === 'Save';
    }

    /**
     * Show progress notification
     */
    showProgress(message: string): void {
        vscode.window.setStatusBarMessage(message, 3000);
    }

    /**
     * Show success message
     */
    showSuccess(message: string): void {
        vscode.window.showInformationMessage(message);
        this.outputChannel.appendLine(`✅ ${message}`);
    }

    /**
     * Show error message
     */
    showError(message: string, error?: any): void {
        const errorMessage = error ? `${message}: ${error}` : message;
        vscode.window.showErrorMessage(errorMessage);
        this.outputChannel.appendLine(`❌ ${errorMessage}`);
    }

    /**
     * Format backup date for display
     */
    private formatBackupDate(date: Date): string {
        // Check for invalid date
        if (isNaN(date.getTime())) {
            return 'Invalid Date - Corrupted Backup';
        }
        
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    }
}