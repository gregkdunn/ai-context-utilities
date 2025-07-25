/**
 * UI Service
 * Handles all UI interactions with consistent styling and behavior
 * Part of Phase 1.9.1 CommandRegistry refactor
 */

import * as vscode from 'vscode';
import { ServiceContainer } from '../core/ServiceContainer';

export interface QuickPickOptions {
    title?: string;
    placeholder?: string;
    ignoreFocusOut?: boolean;
    matchOnDetail?: boolean;
    matchOnDescription?: boolean;
}

export interface ProgressOptions {
    title: string;
    location?: vscode.ProgressLocation;
    cancellable?: boolean;
}

export enum LogLevel {
    Info = 'info',
    Warning = 'warning',
    Error = 'error',
    Success = 'success'
}

/**
 * Service for consistent UI operations
 */
export class UIService {
    constructor(private services: ServiceContainer) {}

    /**
     * Show quick pick with consistent styling
     */
    async showQuickPick<T extends vscode.QuickPickItem>(
        items: T[], 
        options: QuickPickOptions = {}
    ): Promise<T | undefined> {
        return vscode.window.showQuickPick(items, {
            placeHolder: options.placeholder || 'Select an option',
            title: options.title,
            ignoreFocusOut: options.ignoreFocusOut ?? true,
            matchOnDetail: options.matchOnDetail ?? true,
            matchOnDescription: options.matchOnDescription ?? true
        });
    }

    /**
     * Show progress with consistent styling
     */
    async showProgress<T>(
        options: ProgressOptions,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress({
            location: options.location || vscode.ProgressLocation.Notification,
            title: options.title,
            cancellable: options.cancellable ?? false
        }, task);
    }

    /**
     * Show information message with consistent styling
     */
    async showInfo(message: string, ...items: string[]): Promise<string | undefined> {
        return vscode.window.showInformationMessage(message, ...items);
    }

    /**
     * Show warning message with consistent styling
     */
    async showWarning(message: string, ...items: string[]): Promise<string | undefined> {
        return vscode.window.showWarningMessage(message, ...items);
    }

    /**
     * Show error message with consistent styling
     */
    async showError(message: string, ...items: string[]): Promise<string | undefined> {
        return vscode.window.showErrorMessage(message, ...items);
    }

    /**
     * Display output with consistent formatting
     */
    displayOutput(message: string, level: LogLevel = LogLevel.Info): void {
        const prefix = this.getLogPrefix(level);
        this.services.outputChannel.appendLine(`${prefix} ${message}`);
    }

    /**
     * Display section header in output
     */
    displaySectionHeader(title: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.services.outputChannel.appendLine(`\n${'='.repeat(80)}`);
        this.services.outputChannel.appendLine(`🧪 [${timestamp}] ${title.toUpperCase()}`);
        this.services.outputChannel.appendLine(`${'='.repeat(80)}`);
    }

    /**
     * Display section footer in output
     */
    displaySectionFooter(title: string, duration?: number, success?: boolean): void {
        const durationText = duration ? ` (${duration.toFixed(1)}s)` : '';
        const statusIcon = success === undefined ? '' : success ? '✅' : '❌';
        const statusText = success === undefined ? 'COMPLETED' : success ? 'SUCCESSFUL' : 'FAILED';
        
        this.services.outputChannel.appendLine('\n' + '='.repeat(80));
        this.services.outputChannel.appendLine(`${statusIcon} ${title.toUpperCase()} ${statusText}${durationText}`);
        this.services.outputChannel.appendLine('='.repeat(80) + '\n');
    }

    /**
     * Create input box with consistent styling
     */
    async showInputBox(options: vscode.InputBoxOptions = {}): Promise<string | undefined> {
        return vscode.window.showInputBox({
            ignoreFocusOut: true,
            ...options
        });
    }

    /**
     * Show confirmation dialog
     */
    async showConfirmation(
        message: string,
        yesText: string = 'Yes',
        noText: string = 'No'
    ): Promise<boolean> {
        const choice = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            yesText,
            noText
        );
        return choice === yesText;
    }

    /**
     * Open file in editor
     */
    async openFile(filePath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.window.showTextDocument(uri);
        } catch (error) {
            this.showError(`Failed to open file: ${filePath}`);
        }
    }

    /**
     * Open URL in external browser
     */
    async openUrl(url: string): Promise<void> {
        try {
            await vscode.env.openExternal(vscode.Uri.parse(url));
        } catch (error) {
            this.showError(`Failed to open URL: ${url}`);
        }
    }

    /**
     * Show clickable URL notification
     */
    async showClickableUrl(message: string, url: string, buttonText: string = 'Open'): Promise<void> {
        const choice = await this.showInfo(message, buttonText);
        if (choice === buttonText) {
            await this.openUrl(url);
        }
    }

    /**
     * Show test result notification with actions
     */
    async showTestResultNotification(
        success: boolean,
        projectName: string,
        duration: number,
        testCount: number
    ): Promise<string | undefined> {
        const message = success
            ? `✅ ${projectName}: ${testCount} tests passed (${duration.toFixed(1)}s)`
            : `❌ ${projectName}: Tests failed (${duration.toFixed(1)}s)`;

        const actions = success
            ? ['View Output', 'Run Again']
            : ['View Output', 'Re-run Failed', 'Re-run All', 'Debug'];

        if (success) {
            return this.showInfo(message, ...actions);
        } else {
            return this.showError(message, ...actions);
        }
    }

    /**
     * Update status bar with consistent formatting
     */
    updateStatusBar(text: string, color?: 'green' | 'yellow' | 'red'): void {
        this.services.updateStatusBar(text, color);
    }

    /**
     * Show framework detection summary
     */
    async showFrameworkDetectionSummary(): Promise<void> {
        try {
            const summary = await this.services.configManager.getFrameworkDetectionSummary();
            const frameworks = this.services.configManager.getDetectedFrameworks();
            
            const title = frameworks.length > 0 
                ? `Framework Detection (${frameworks.length} detected)`
                : 'Framework Detection (None detected)';
            
            this.displaySectionHeader(title);
            this.services.outputChannel.appendLine(summary);
            
            if (frameworks.length > 0) {
                this.services.outputChannel.appendLine('\n📋 Detection Details:');
                frameworks.forEach((fw, index) => {
                    this.services.outputChannel.appendLine(
                        `   ${index + 1}. ${fw.name} (${Math.round(fw.confidence * 100)}%) - ${fw.type}`
                    );
                    this.services.outputChannel.appendLine(`      Command: ${fw.testCommand}`);
                    this.services.outputChannel.appendLine(`      Indicators: ${fw.indicators.join(', ')}`);
                });
            }
            
            this.displaySectionFooter('Framework Detection');
        } catch (error) {
            this.displayOutput(`Failed to show framework detection: ${error}`, LogLevel.Error);
        }
    }

    /**
     * Get log prefix for consistent formatting
     */
    private getLogPrefix(level: LogLevel): string {
        const prefixes = {
            [LogLevel.Info]: 'ℹ️',
            [LogLevel.Warning]: '⚠️',
            [LogLevel.Error]: '❌',
            [LogLevel.Success]: '✅'
        };
        return prefixes[level];
    }

    /**
     * Create themed quick pick item
     */
    createQuickPickItem(
        label: string,
        detail?: string,
        description?: string,
        icon?: string
    ): vscode.QuickPickItem {
        return {
            label: icon ? `${icon} ${label}` : label,
            detail: detail || '',
            description: description || ''
        };
    }

    /**
     * Create separator item for quick pick
     */
    createSeparator(): vscode.QuickPickItem {
        return {
            label: '',
            kind: vscode.QuickPickItemKind.Separator
        } as any;
    }
}